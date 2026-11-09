import {
  EARTH_RADIUS,
  MOON_RADIUS,
  SUN_RADIUS,
  eclipseAt,
  supernovaAt,
  tidesAt,
  shadowRadii,
  unit,
  subtract,
  type EclipseFrame,
  type Vec3,
} from './model';
import type { SimulationState } from './state';

export const SHADOW_SCALE = 1.2 / EARTH_RADIUS;
export interface ComponentPoint {
  id: string;
  position: Vec3;
  radius: number;
  color: string;
}
export const componentColors: Record<string, string> = {
  core: '#ffe3a0',
  envelope: '#ee905a',
  shock: '#f2c483',
  neutron: '#a7d9ff',
  horizon: '#83bfe1',
  disk: '#ffc17c',
  matter: '#ead8ac',
  light: '#a9dcff',
  sun: '#ffcb73',
  earth: '#7db6dc',
  moon: '#c9c7ca',
  umbra: '#8076bd',
  penumbra: '#a5a9d4',
  antumbra: '#d495db',
  observer: '#70e6c6',
  water: '#70badb',
  forces: '#eaa581',
};
const component = (id: string, position: Vec3, radius: number): ComponentPoint => ({
  id,
  position,
  radius,
  color: componentColors[id],
});

/** Deliberately compressed axial distances; transverse shadow dimensions retain their own common scale. */
export function eclipseDisplay(frame: EclipseFrame, position: Vec3): Vec3 {
  const x = position[0];
  let dx: number;
  if (frame.kind === 'solarEclipse') {
    const moonX = frame.moon[0],
      moonDisplay = 5 + moonX / 60000;
    if (x <= moonX) dx = -8 + ((x - frame.sun[0]) / (moonX - frame.sun[0])) * (moonDisplay + 8);
    else if (x <= -EARTH_RADIUS)
      dx = moonDisplay + ((x - moonX) / (-EARTH_RADIUS - moonX)) * (3.8 - moonDisplay);
    else dx = 5 + (x / EARTH_RADIUS) * 1.2;
  } else dx = x < 0 ? -2 + (x / -frame.sun[0]) * 6 : -2 + (x / 384400) * 7;
  return [dx, position[1] * SHADOW_SCALE, position[2] * SHADOW_SCALE];
}
export function shadowPoint(
  frame: EclipseFrame,
  behind: number,
  radius: number,
  angle: number,
): Vec3 {
  const axis = unit(subtract(frame.occluder, frame.sun));
  const u = unit([-axis[2], 0, axis[0]]),
    v: Vec3 = [
      axis[1] * u[2] - axis[2] * u[1],
      axis[2] * u[0] - axis[0] * u[2],
      axis[0] * u[1] - axis[1] * u[0],
    ];
  return eclipseDisplay(
    frame,
    frame.occluder.map(
      (value, i) =>
        value + axis[i] * behind + radius * (Math.cos(angle) * u[i] + Math.sin(angle) * v[i]),
    ) as Vec3,
  );
}
export type ShadowZone = 'umbra' | 'penumbra' | 'antumbra';
export function shadowSurface(frame: EclipseFrame, zone: ShadowZone, segments = 48) {
  const start = zone === 'antumbra' ? frame.apex : 0,
    end = zone === 'umbra' ? Math.min(frame.apex, frame.shadowEnd) : frame.shadowEnd;
  if (end <= start) return null;
  const points = new Float32Array((segments + 1) * 2 * 3);
  for (let row = 0; row < 2; row++) {
    const behind = row ? end : start;
    const radii = shadowRadii(frame.occluderRadius, SUN_RADIUS, frame.sourceDistance, behind);
    const radius = zone === 'penumbra' ? radii.penumbra : Math.abs(radii.umbra);
    for (let i = 0; i <= segments; i++)
      points.set(
        shadowPoint(frame, behind, radius, (i / segments) * Math.PI * 2),
        (row * (segments + 1) + i) * 3,
      );
  }
  return points;
}
export function sceneModel(state: SimulationState) {
  const kind = state.kind!,
    p = state.progress,
    par = state.parameters;
  let phase: string, points: ComponentPoint[];
  const sn = kind === 'supernova' ? supernovaAt(p) : undefined;
  const eclipse =
    kind === 'solarEclipse' || kind === 'lunarEclipse'
      ? eclipseAt(kind, p, kind === 'solarEclipse' ? par.solarPreset : par.lunarPreset)
      : undefined;
  const tide = kind === 'tides' ? tidesAt(p, par) : undefined;
  if (sn) {
    phase = sn.phase;
    points = [component(sn.exploded ? 'neutron' : 'core', [0, 0, 0], sn.coreRadius)];
    if (!sn.exploded) points.push(component('envelope', [1.7, 1.1, 0.4], 0.4));
    else {
      points.push(component('envelope', [sn.ejectaRadius, 0, 0], 0.4));
      if (p < 0.78) points.push(component('shock', [0, sn.shockRadius, 0], 0.4));
    }
  } else if (eclipse) {
    phase = eclipse.phase;
    points = [
      component('sun', eclipseDisplay(eclipse, eclipse.sun), 2),
      component('earth', eclipseDisplay(eclipse, eclipse.earth), 1.2),
      component('moon', eclipseDisplay(eclipse, eclipse.moon), MOON_RADIUS * SHADOW_SCALE),
      component('observer', [eclipse.kind === 'solarEclipse' ? 3.76 : -0.76, 0, 0], 0.1),
    ];
    for (const zone of ['umbra', 'penumbra', 'antumbra'] as const) {
      const behind =
        zone === 'antumbra'
          ? (eclipse.apex + eclipse.shadowEnd) / 2
          : Math.min(eclipse.apex * 0.7, eclipse.shadowEnd * 0.65);
      if (zone === 'antumbra' && eclipse.shadowEnd <= eclipse.apex) continue;
      const radii = shadowRadii(eclipse.occluderRadius, SUN_RADIUS, eclipse.sourceDistance, behind);
      points.push(
        component(
          zone,
          shadowPoint(
            eclipse,
            behind,
            zone === 'penumbra' ? radii.penumbra : Math.abs(radii.umbra),
            Math.PI / 2,
          ),
          0.13,
        ),
      );
    }
  } else if (tide) {
    phase = par.solarTide ? par.tidePreset : 'lunarOnly';
    const radius = 1.43 + 0.22 * tide.height;
    points = [
      component('earth', [0, 0, 0], 1.15),
      component('moon', par.tidePreset === 'spring' ? [5.8, 0, 0] : [0, 0, 5.8], 0.48),
      component('sun', [-6.5, 0, 0], 0.9),
      component('water', [0, 1.5, 0], 0.2),
      component('observer', tide.observer.map((value) => value * radius) as Vec3, 0.12),
    ];
    if (par.forces) points.push(component('forces', [2.1, 0, 0], 0.1));
  } else {
    phase = p < 0.25 ? 'horizon' : p < 0.5 ? 'disk' : p < 0.75 ? 'matter' : 'light';
    points = [
      component('horizon', [0, 0, 0], 1),
      component(
        'matter',
        [Math.cos(p * Math.PI * 2) * 5.8, 0.25, Math.sin(p * Math.PI * 2) * 5.8],
        0.15,
      ),
    ];
    if (par.disk) points.push(component('disk', [3.8, 0, 0], 0.4));
    if (par.lightPaths) points.push(component('light', [3, 0, 2.4], 0.2));
  }
  return { kind, phase, points, sn, eclipse, tide };
}
export type SceneModel = ReturnType<typeof sceneModel>;
