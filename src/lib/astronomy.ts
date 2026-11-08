import { t, formatNumber } from '../i18n';
export const LIGHT_YEARS_PER_PARSEC = 3.26156;
export const MISSING = 'Chưa có dữ liệu';

export interface EquatorialPosition {
  raHours: number;
  decDegrees: number;
  epoch: 'J2000';
  frame: 'ICRS';
  source: string;
}

/** Heliocentric, right-handed: X toward RA 0h, Y north, Z toward RA -6h.
 * One scene unit = one light-year. ICRS directions at epoch J2000;
 * no proper motion, radial motion, or galactic coordinate mixing. */
export function equatorialToCartesian(
  raHours: number,
  decDegrees: number,
  distanceLy: number,
): [number, number, number] {
  if (
    ![raHours, decDegrees, distanceLy].every(Number.isFinite) ||
    raHours < 0 ||
    raHours >= 24 ||
    Math.abs(decDegrees) > 90 ||
    distanceLy < 0
  ) {
    throw new RangeError('Tọa độ hoặc khoảng cách không hợp lệ');
  }
  const ra = (raHours * Math.PI) / 12;
  const dec = (decDegrees * Math.PI) / 180;
  return [
    distanceLy * Math.cos(dec) * Math.cos(ra),
    distanceLy * Math.sin(dec),
    -distanceLy * Math.cos(dec) * Math.sin(ra),
  ];
}

export function parallaxToLightYears(mas: number): number {
  if (!Number.isFinite(mas) || mas <= 0) throw new RangeError('Thị sai phải lớn hơn 0');
  return (1000 / mas) * LIGHT_YEARS_PER_PARSEC;
}

export function formatValue(value: number | undefined, unit = '', digits = 2): string {
  return value === undefined || !Number.isFinite(value)
    ? t('common.missing')
    : `${formatNumber(value, { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`;
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .trim();
}

export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
