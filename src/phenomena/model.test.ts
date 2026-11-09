import { describe, expect, it } from 'vitest';
import {
  advanceTimeline,
  blackHoleMatterAt,
  circleOverlap,
  classifyLunar,
  classifySolar,
  defaultParameters,
  eclipseAt,
  legendre2,
  shadowRadii,
  SOLAR_TIDE_RATIO,
  supernovaAt,
  tidalForce,
  tidalHeight,
  tidesAt,
  type Vec3,
} from './model';
import { componentColors, eclipseDisplay, sceneModel, shadowSurface } from './geometry';
import { initialSimulation, simulationReducer } from './state';

describe('eclipse geometry, independent of display scaling', () => {
  it('classifies contact, containment and partial overlap using apparent radii', () => {
    expect(classifySolar(0.1, 0.12, 0)).toBe('total');
    expect(classifySolar(0.12, 0.1, 0)).toBe('annular');
    expect(classifySolar(0.1, 0.1, 0.05)).toBe('partial');
    expect(classifySolar(0.1, 0.1, 0.2)).toBe('none');
    expect(classifyLunar(3, 5, 1, 0)).toBe('total');
    expect(classifyLunar(3, 5, 1, 3)).toBe('partial');
    expect(classifyLunar(3, 5, 1, 4)).toBe('penumbral');
    expect(classifyLunar(3, 5, 1, 6)).toBe('none');
  });
  it('disk overlap is symmetric, bounded, and continuous at contact', () => {
    expect(circleOverlap(1, 1, 0)).toBeCloseTo(Math.PI);
    expect(circleOverlap(1, 2, 0)).toBeCloseTo(Math.PI);
    expect(circleOverlap(1, 1, 2)).toBe(0);
    expect(circleOverlap(1, 1, 2 - 1e-7)).toBeCloseTo(0, 6);
    expect(circleOverlap(1, 2, 2)).toBeCloseTo(circleOverlap(2, 1, 2));
    expect(circleOverlap(0, 1, 0)).toBe(0);
    for (let d = 0; d < 3; d += 0.05)
      expect(circleOverlap(1, 1.2, d)).toBeLessThanOrEqual(Math.PI + 1e-10);
  });
  it.each(['partial', 'total', 'annular'] as const)(
    'solar preset %s is observed at mid-transit; both ends have no eclipse',
    (preset) => {
      const mid = eclipseAt('solarEclipse', 0.5, preset);
      expect(mid.phase).toBe(preset);
      expect(mid.moon[0]).toBeGreaterThan(mid.sun[0]);
      expect(mid.moon[0]).toBeLessThan(mid.earth[0]);
      expect(mid.coverage).toBeGreaterThan(0);
      expect(eclipseAt('solarEclipse', 0, preset).phase).toBe('none');
      expect(eclipseAt('solarEclipse', 1, preset).phase).toBe('none');
      if (preset === 'total') expect(mid.coverage).toBeCloseTo(1);
      if (preset === 'annular') {
        expect(mid.moonAngle).toBeLessThan(mid.sunAngle);
        expect(mid.umbra).toBeLessThan(0);
        expect(shadowSurface(mid, 'antumbra')).not.toBeNull();
      }
      if (preset === 'total') expect(shadowSurface(mid, 'antumbra')).toBeNull();
    },
  );
  it.each(['penumbral', 'partial', 'total'] as const)(
    'lunar preset %s agrees with the actual shadow cross-section',
    (preset) => {
      const mid = eclipseAt('lunarEclipse', 0.5, preset);
      expect(mid.phase).toBe(preset);
      expect(mid.sun[0]).toBeLessThan(mid.earth[0]);
      expect(mid.earth[0]).toBeLessThan(mid.moon[0]);
      if (preset === 'penumbral') expect(mid.coverage).toBe(0);
      if (preset === 'total') expect(mid.coverage).toBeCloseTo(1);
      expect(eclipseAt('lunarEclipse', 0, preset).phase).toBe('none');
      expect(eclipseAt('lunarEclipse', 1, preset).phase).toBe('none');
    },
  );
  it('umbra ends at the apex and the display transform leaves physical geometry untouched', () => {
    const shadow = shadowRadii(1, 10, 100, 100 / 9);
    expect(shadow.umbra).toBeCloseTo(0);
    expect(shadow.penumbra).toBeGreaterThan(1);
    const frame = eclipseAt('solarEclipse', 0.5, 'annular'),
      original = structuredClone(frame);
    expect(eclipseDisplay(frame, frame.sun)[0]).toBeCloseTo(-8);
    expect(eclipseDisplay(frame, frame.earth)[0]).toBeCloseTo(5);
    expect(shadowSurface(frame, 'umbra')!.every(Number.isFinite)).toBe(true);
    expect(shadowSurface(frame, 'antumbra')!.every(Number.isFinite)).toBe(true);
    expect(frame).toEqual(original);
  });
});

describe('equilibrium tides', () => {
  it('has opposite bulges and compresses transverse directions instead of translating the whole ocean', () => {
    expect(legendre2(1)).toBe(1);
    expect(legendre2(-1)).toBe(1);
    expect(legendre2(0)).toBe(-0.5);
    expect(tidalHeight([1, 0, 0], 'spring', false)).toBe(tidalHeight([-1, 0, 0], 'spring', false));
    expect(tidalForce([1, 0, 0], 'spring', false)).toEqual([2, 0, 0]);
    tidalForce([-1, 0, 0], 'spring', false).forEach((value, i) =>
      expect(value).toBeCloseTo([-2, 0, 0][i]),
    );
    expect(tidalForce([0, 1, 0], 'spring', false)).toEqual([0, -1, 0]);
    expect(SOLAR_TIDE_RATIO).toBeGreaterThan(0.44);
    expect(SOLAR_TIDE_RATIO).toBeLessThan(0.48);
  });
  it('spring range exceeds neap range; disabling the Sun removes that difference', () => {
    const range = (preset: 'spring' | 'neap', solarTide: boolean) => {
      const { samples } = tidesAt(0, { ...defaultParameters, tidePreset: preset, solarTide });
      return Math.max(...samples) - Math.min(...samples);
    };
    expect(range('spring', true)).toBeGreaterThan(range('neap', true));
    expect(range('spring', false)).toBeCloseTo(range('neap', false));
    expect(
      sceneModel({
        ...initialSimulation,
        kind: 'tides',
        parameters: { ...defaultParameters, solarTide: false },
      }).phase,
    ).toBe('lunarOnly');
  });
  it('graph, observer height and ocean surface sample the identical function', () => {
    for (const tidePreset of ['spring', 'neap'] as const)
      for (const solarTide of [false, true]) {
        const parameters = { ...defaultParameters, tidePreset, solarTide };
        for (const progress of [0, 0.125, 0.25, 0.5, 0.875, 1]) {
          const tide = tidesAt(progress, parameters),
            model = sceneModel({ ...initialSimulation, kind: 'tides', progress, parameters });
          const normal: Vec3 = [
            Math.cos(progress * Math.PI * 2),
            0,
            Math.sin(progress * Math.PI * 2),
          ];
          expect(tide.height).toBeCloseTo(tidalHeight(normal, tidePreset, solarTide));
          expect(tide.samples[progress * 128]).toBeCloseTo(tide.height);
          const observer = model.points.find((point) => point.id === 'observer')!;
          expect(Math.hypot(...observer.position)).toBeCloseTo(1.43 + 0.22 * tide.height);
          expect(Math.hypot(...observer.position)).toBeGreaterThan(1.14);
        }
      }
  });
});

describe('deterministic playback and seeking', () => {
  it('does not wrap unequal black-hole orbits; the genuinely periodic tide keeps looping', () => {
    const bh = { ...initialSimulation, kind: 'blackhole' as const, progress: 0.99, playing: true };
    const end = simulationReducer(bh, { type: 'tick', seconds: 1 });
    expect(end.progress).toBe(1);
    expect(end.playing).toBe(false);
    expect(blackHoleMatterAt(end.progress, 28)).not.toEqual(blackHoleMatterAt(0, 28));
    expect(blackHoleMatterAt(0.42, 28)).toEqual(blackHoleMatterAt(0.42, 28));
    blackHoleMatterAt(0.42, 96).forEach((p) =>
      expect(Math.hypot(p[0], p[2])).toBeGreaterThanOrEqual(3.2 - 1e-12),
    );
    const tide = simulationReducer({ ...bh, kind: 'tides' }, { type: 'tick', seconds: 1 });
    expect(tide.progress).toBeLessThan(0.1);
    expect(tide.playing).toBe(true);
  });
  it('advances identically at different frame rates and respects speed', () => {
    const integrate = (fps: number) => {
      let p = 0;
      for (let i = 0; i < fps * 12; i++) p = advanceTimeline(p, 1 / fps, 1);
      return p;
    };
    expect(integrate(30)).toBeCloseTo(integrate(144), 10);
    expect(advanceTimeline(0, 12, 2)).toBe(1);
    expect(advanceTimeline(0.9, 24, 1, true)).toBeCloseTo(0.9);
    expect(() => advanceTimeline(0, -1, 1)).toThrow();
  });
  it('pauses, rewinds, restarts and replays without depending on history', () => {
    let state = simulationReducer(initialSimulation, { type: 'open', kind: 'supernova' });
    const first = sceneModel(state);
    state = simulationReducer(state, { type: 'play', playing: true });
    state = simulationReducer(state, { type: 'tick', seconds: 18 });
    expect(supernovaAt(state.progress).phase).toBe('remnant');
    state = simulationReducer(state, { type: 'play', playing: false });
    expect(simulationReducer(state, { type: 'tick', seconds: 100 })).toBe(state);
    state = simulationReducer(state, { type: 'seek', progress: 0.32 });
    expect(supernovaAt(state.progress).phase).toBe('collapse');
    state = simulationReducer(state, { type: 'reset' });
    expect(sceneModel(state)).toEqual(first);
    expect(
      simulationReducer({ ...state, kind: null }, { type: 'tick', seconds: 100 }).progress,
    ).toBe(0);
  });
  it('phase snapshots restore all supernova geometry when scrubbing backwards', () => {
    for (const progress of [0, 0.12, 0.32, 0.5, 0.9, 1]) {
      const frame = supernovaAt(progress);
      supernovaAt(1);
      supernovaAt(0.02);
      expect(supernovaAt(progress)).toEqual(frame);
    }
  });
  it('display components always have a legend color and do not invent remnant types', () => {
    for (const kind of [
      'supernova',
      'blackhole',
      'solarEclipse',
      'lunarEclipse',
      'tides',
    ] as const) {
      const state = simulationReducer(initialSimulation, { type: 'open', kind });
      for (const progress of [0, 0.5, 1])
        for (const point of sceneModel({ ...state, progress }).points)
          expect(componentColors[point.id]).toBeTruthy();
    }
    expect(
      sceneModel({ ...initialSimulation, kind: 'supernova', progress: 0.9 }).points.map(
        (p) => p.id,
      ),
    ).toContain('neutron');
    expect(
      sceneModel({ ...initialSimulation, kind: 'supernova', progress: 0.9 }).points.map(
        (p) => p.id,
      ),
    ).not.toContain('horizon');
  });
});
