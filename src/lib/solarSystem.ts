import { t } from '../i18n';
import { getSolarBody, planets, solarBodies, type SolarBody } from '../data/solarSystem';

export const KM_PER_AU = 149597870.7;
export type SolarScale = 'explore' | 'size' | 'distance';
export const SIZE_KM_PER_UNIT = 10000;
export const DISTANCE_UNITS_PER_AU = 10;
export const DEFAULT_DAYS_PER_SECOND = 2;
const TAU = Math.PI * 2;

export const kmToAU = (km: number) => km / KM_PER_AU;
export const auToKm = (au: number) => au * KM_PER_AU;

/** Display-only transforms. Physical data never receives compressed radii/distances. */
export function displayRadius(body: SolarBody, scale: SolarScale): number {
  if (scale === 'size') return body.radiusKm / SIZE_KM_PER_UNIT;
  if (body.id === 'sun') return 2.6;
  return 0.38 * Math.pow(body.radiusKm / 6371, 0.55);
}

export function orbitalDisplayRadius(body: SolarBody, scale: SolarScale): number {
  if (!body.semiMajorAxisKm) return 0;
  if (scale === 'distance') return kmToAU(body.semiMajorAxisKm) * DISTANCE_UNITS_PER_AU;
  if (body.parentId === 'earth') return 1.6;
  return 5 + planets.findIndex((planet) => planet.id === body.id) * 3.5;
}

export function hitRadius(body: SolarBody, scale: SolarScale): number {
  // Picking envelope is independent of both physical and rendered radii.
  return Math.max(displayRadius(body, scale) * 1.1, scale === 'distance' ? 0.8 : 0.34);
}

/** Ring geometry and camera collision envelope are UI design, not measured ring radii. */
export const bodyExtent = (body: SolarBody, scale: SolarScale) =>
  displayRadius(body, scale) * (body.id === 'saturn' ? 2.35 : 1.04);

export function comparisonLayout(
  includeSun: boolean,
  includeMoon: boolean,
): Record<string, [number, number, number]> {
  const bodies = solarBodies.filter(
    (body) => (includeSun || body.id !== 'sun') && (includeMoon || body.id !== 'moon'),
  );
  let cursor = 0;
  const layout: Record<string, [number, number, number]> = {};
  for (const body of bodies) {
    const extent = bodyExtent(body, 'size');
    layout[body.id] = [cursor + extent, 0, 0];
    cursor += extent * 2 + 1.4;
  }
  for (const point of Object.values(layout)) point[0] -= (cursor - 1.4) / 2;
  return layout;
}

/** All starting phases are illustrative; day zero is not a calendar date/ephemeris. */
export function orbitAngle(days: number, periodDays: number, phase = 0): number {
  if (!Number.isFinite(periodDays) || periodDays <= 0)
    throw new RangeError('Chu kỳ quỹ đạo phải dương');
  return (((days % periodDays) / periodDays) * TAU + phase) % TAU;
}

export function bodyPosition(
  body: SolarBody,
  days: number,
  scale: SolarScale,
  includeSun = false,
  includeMoon = true,
): [number, number, number] {
  if (scale === 'size') return comparisonLayout(includeSun, includeMoon)[body.id] ?? [0, 0, 0];
  if (body.id === 'sun') return [0, 0, 0];
  const index = planets.findIndex((planet) => planet.id === body.id);
  const phase = body.id === 'moon' ? 0.5 : index * 0.67 + 0.35;
  const angle = orbitAngle(days, body.orbitalPeriodDays!, phase);
  const radius = orbitalDisplayRadius(body, scale);
  const point: [number, number, number] = [Math.cos(angle) * radius, 0, -Math.sin(angle) * radius];
  if (body.parentId === 'earth') {
    const earth = bodyPosition(getSolarBody('earth')!, days, scale);
    return [point[0] + earth[0], 0, point[2] + earth[2]];
  }
  return point;
}

/** Obliquity >90 already encodes retrograde direction: use the magnitude here
 * to avoid applying both negative period and flipped axis (double inversion). */
export function spinAngle(days: number, body: SolarBody): number {
  if (!body.rotationHours) return 0;
  return (((days * 24) % Math.abs(body.rotationHours)) / Math.abs(body.rotationHours)) * TAU;
}

export function advanceSimulation(
  days: number,
  deltaSeconds: number,
  running: boolean,
  daysPerSecond: number,
): number {
  if (
    ![days, deltaSeconds, daysPerSecond].every(Number.isFinite) ||
    deltaSeconds < 0 ||
    daysPerSecond < 0
  )
    throw new RangeError('Đồng hồ mô phỏng không hợp lệ');
  return running ? days + deltaSeconds * daysPerSecond : days;
}

export const scaleNotes: Record<SolarScale, string> = {
  get explore() {
    return t('scales.explore');
  },
  get size() {
    return t('scales.size');
  },
  get distance() {
    return t('scales.distance');
  },
};
