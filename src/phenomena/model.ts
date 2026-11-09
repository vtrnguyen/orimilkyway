import { getSolarBody } from '../data/solarSystem';
import { KM_PER_AU } from '../lib/solarSystem';

export const phenomenonIds = [
  'supernova',
  'blackhole',
  'solarEclipse',
  'lunarEclipse',
  'tides',
] as const;
export type Phenomenon = (typeof phenomenonIds)[number];
export type Vec3 = [number, number, number];
export type SolarPreset = 'partial' | 'total' | 'annular';
export type LunarPreset = 'penumbral' | 'partial' | 'total';
export interface Parameters {
  solarPreset: SolarPreset;
  lunarPreset: LunarPreset;
  tidePreset: 'spring' | 'neap';
  cutaway: boolean;
  disk: boolean;
  lightPaths: boolean;
  solarTide: boolean;
  forces: boolean;
  softEffects: boolean;
}
export const defaultParameters: Parameters = {
  solarPreset: 'total',
  lunarPreset: 'total',
  tidePreset: 'spring',
  cutaway: true,
  disk: true,
  lightPaths: false,
  solarTide: true,
  forces: true,
  softEffects: true,
};
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const smooth = (value: number) => {
  const x = clamp(value);
  return x * x * (3 - 2 * x);
};
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3) => Math.hypot(...a);
export const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const unit = (a: Vec3): Vec3 => {
  const r = length(a);
  return r ? [a[0] / r, a[1] / r, a[2] / r] : [0, 0, 0];
};

/** Wall-clock integration, independent from frame count. Hidden-tab time is excluded by the controller. */
export function advanceTimeline(progress: number, seconds: number, speed: number, loop = false) {
  if (![progress, seconds, speed].every(Number.isFinite) || seconds < 0 || speed < 0)
    throw new RangeError('Invalid timeline');
  const next = progress + (seconds * speed) / 24;
  return loop ? ((next % 1) + 1) % 1 : clamp(next);
}

export function supernovaAt(progress: number) {
  const p = clamp(progress),
    collapse = smooth((p - 0.25) / 0.15),
    expansion = smooth((p - 0.4) / 0.6);
  return {
    phase: p < 0.25 ? 'structure' : p < 0.4 ? 'collapse' : p < 0.67 ? 'shock' : 'remnant',
    coreRadius: 0.72 * (1 - collapse) + 0.18 * collapse,
    envelopeRadius: 2.15,
    ejectaRadius: 2.15 + 4.8 * expansion,
    shockRadius: 2.15 + 6 * smooth((p - 0.4) / 0.35),
    expansion,
    luminosity: Math.exp(-Math.pow((p - 0.5) / 0.13, 2)),
    progress: p,
    exploded: p >= 0.4,
  };
}

/** Demonstration orbits outside the disk's inner edge, not relativistic geodesics. */
export function blackHoleMatterAt(progress: number, count: number): Vec3[] {
  const p = clamp(progress);
  return Array.from({ length: count }, (_, i) => {
    const radius = 3.2 + ((i % 13) / 12) * 3.3;
    const angle = i * 2.39996 + p * Math.PI * 2 * Math.pow(5.8 / radius, 1.5);
    return [Math.cos(angle) * radius, Math.sin(i * 1.7) * 0.18, Math.sin(angle) * radius];
  });
}

/** Area of intersection of two disks. Radii and separation must share units. */
export function circleOverlap(a: number, b: number, d: number) {
  if (a <= 0 || b <= 0 || d >= a + b) return 0;
  if (d <= Math.abs(a - b)) return Math.PI * Math.min(a, b) ** 2;
  return (
    a * a * Math.acos(clamp((d * d + a * a - b * b) / (2 * d * a), -1, 1)) +
    b * b * Math.acos(clamp((d * d + b * b - a * a) / (2 * d * b), -1, 1)) -
    0.5 * Math.sqrt(Math.max(0, (-d + a + b) * (d + a - b) * (d - a + b) * (d + a + b)))
  );
}
export const SUN_RADIUS = getSolarBody('sun')!.radiusKm;
export const EARTH_RADIUS = getSolarBody('earth')!.radiusKm;
export const MOON_RADIUS = getSolarBody('moon')!.radiusKm;
export function shadowRadii(
  bodyRadius: number,
  sourceRadius: number,
  sourceDistance: number,
  behind: number,
) {
  return {
    umbra: bodyRadius - (behind * (sourceRadius - bodyRadius)) / sourceDistance,
    penumbra: bodyRadius + (behind * (sourceRadius + bodyRadius)) / sourceDistance,
    apex: (bodyRadius * sourceDistance) / (sourceRadius - bodyRadius),
  };
}
export function classifySolar(sunRadius: number, moonRadius: number, separation: number) {
  const eps = 1e-12;
  if (separation >= sunRadius + moonRadius - eps) return 'none';
  if (separation + sunRadius <= moonRadius + eps) return 'total';
  if (separation + moonRadius <= sunRadius + eps) return 'annular';
  return 'partial';
}
export function classifyLunar(
  umbra: number,
  penumbra: number,
  moonRadius: number,
  separation: number,
) {
  if (separation >= penumbra + moonRadius) return 'none';
  if (separation >= umbra + moonRadius) return 'penumbral';
  if (separation + moonRadius <= umbra) return 'total';
  return 'partial';
}
export interface EclipseFrame {
  kind: 'solarEclipse' | 'lunarEclipse';
  phase: 'none' | 'partial' | 'total' | 'annular' | 'penumbral';
  sun: Vec3;
  earth: Vec3;
  moon: Vec3;
  observer: Vec3;
  occluder: Vec3;
  occluderRadius: number;
  sourceDistance: number;
  shadowEnd: number;
  umbra: number;
  penumbra: number;
  apex: number;
  coverage: number;
  sunAngle: number;
  moonAngle: number;
  separation: number;
  skyX: number;
  skyY: number;
}
/** All coordinates/radii in this layer are km. No display compression enters classification. */
export function eclipseAt(
  kind: EclipseFrame['kind'],
  progress: number,
  preset: SolarPreset | LunarPreset,
): EclipseFrame {
  const solar = kind === 'solarEclipse',
    p = clamp(progress);
  const distance = solar ? (preset === 'annular' ? 405000 : 360000) : 384400;
  const impact = solar
    ? preset === 'partial'
      ? 2500
      : 0
    : preset === 'partial'
      ? 4300
      : preset === 'penumbral'
        ? 7600
        : 0;
  const sun: Vec3 = [-KM_PER_AU, 0, 0],
    earth: Vec3 = [0, 0, 0],
    moon: Vec3 = [solar ? -distance : distance, impact, (p - 0.5) * (solar ? 16000 : 24000)];
  const observer: Vec3 = solar ? [-EARTH_RADIUS, 0, 0] : [EARTH_RADIUS, 0, 0];
  const occluder = solar ? moon : earth,
    occluderRadius = solar ? MOON_RADIUS : EARTH_RADIUS;
  const sourceDistance = length(subtract(occluder, sun));
  const behind = solar ? dot(subtract(observer, moon), unit(subtract(occluder, sun))) : distance;
  const shadows = shadowRadii(occluderRadius, SUN_RADIUS, sourceDistance, behind);
  const toSun = subtract(sun, observer),
    toMoon = subtract(moon, observer);
  const sunAngle = Math.asin(SUN_RADIUS / length(toSun)),
    moonAngle = Math.asin(MOON_RADIUS / length(toMoon));
  const separation = Math.acos(clamp(dot(unit(toSun), unit(toMoon)), -1, 1));
  const radial = Math.hypot(moon[1], moon[2]);
  const coverage = solar
    ? circleOverlap(sunAngle, moonAngle, separation) / (Math.PI * sunAngle ** 2)
    : circleOverlap(Math.max(0, shadows.umbra), MOON_RADIUS, radial) / (Math.PI * MOON_RADIUS ** 2);
  return {
    kind,
    sun,
    earth,
    moon,
    observer,
    occluder,
    occluderRadius,
    sourceDistance,
    shadowEnd: solar ? behind : 600000,
    ...shadows,
    coverage: clamp(coverage),
    sunAngle,
    moonAngle,
    separation,
    skyX: radial ? ((separation / sunAngle) * moon[2]) / radial : 0,
    skyY: radial ? ((separation / sunAngle) * moon[1]) / radial : 0,
    phase: solar
      ? classifySolar(sunAngle, moonAngle, separation)
      : classifyLunar(shadows.umbra, shadows.penumbra, MOON_RADIUS, radial),
  };
}

/** Leading-order equilibrium tidal potential: h ∝ GM/d³ P₂(n·direction). Not ocean dynamics. */
export const SOLAR_TIDE_RATIO =
  (getSolarBody('sun')!.massKg / getSolarBody('moon')!.massKg) * (384400 / KM_PER_AU) ** 3;
export const legendre2 = (x: number) => (3 * x * x - 1) / 2;
export function tidalHeight(normal: Vec3, preset: Parameters['tidePreset'], includeSun: boolean) {
  const moon: Vec3 = preset === 'spring' ? [1, 0, 0] : [0, 0, 1];
  return legendre2(dot(normal, moon)) + (includeSun ? SOLAR_TIDE_RATIO * legendre2(normal[0]) : 0);
}
export function tidalForce(
  normal: Vec3,
  preset: Parameters['tidePreset'],
  includeSun: boolean,
): Vec3 {
  const moon: Vec3 = preset === 'spring' ? [1, 0, 0] : [0, 0, 1];
  const scale = includeSun ? SOLAR_TIDE_RATIO : 0,
    projection = 3 * dot(normal, moon);
  return [
    projection * moon[0] - normal[0] + scale * 2 * normal[0],
    projection * moon[1] - normal[1] - scale * normal[1],
    projection * moon[2] - normal[2] - scale * normal[2],
  ];
}
export function tidesAt(progress: number, parameters: Parameters) {
  const angle = clamp(progress) * Math.PI * 2,
    observer: Vec3 = [Math.cos(angle), 0, Math.sin(angle)];
  return {
    phase: parameters.tidePreset,
    angle,
    observer,
    height: tidalHeight(observer, parameters.tidePreset, parameters.solarTide),
    samples: Array.from({ length: 129 }, (_, i) => {
      const angle = (i / 128) * Math.PI * 2;
      return tidalHeight(
        [Math.cos(angle), 0, Math.sin(angle)],
        parameters.tidePreset,
        parameters.solarTide,
      );
    }),
  };
}
