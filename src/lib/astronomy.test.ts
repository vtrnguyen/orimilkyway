import { describe, expect, it } from 'vitest';
import {
  equatorialToCartesian,
  formatValue,
  parallaxToLightYears,
  seededRandom,
} from './astronomy';
import { mappedStars, searchStars, starPosition, stars, type Star } from '../data/stars';
import { explorerReducer, initialExplorerState, type ExplorerState } from '../state/useExplorer';

describe('ICRS → hệ tọa độ cảnh thuận tay phải', () => {
  it('gốc, xích đạo và thiên cực khớp quy ước trục', () => {
    expect(equatorialToCartesian(0, 0, 0)).toEqual([0, 0, -0]);
    expect(equatorialToCartesian(0, 0, 10)).toEqual([10, 0, -0]);
    expect(equatorialToCartesian(6, 0, 10)[2]).toBeCloseTo(-10);
    expect(equatorialToCartesian(0, 90, 10)[1]).toBeCloseTo(10);
    expect(equatorialToCartesian(0, -90, 10)[1]).toBeCloseTo(-10);
  });
  it('bảo toàn khoảng cách Euclid, không kéo giãn khoảng cách sao', () => {
    for (const star of mappedStars)
      expect(Math.hypot(...starPosition(star)!)).toBeCloseTo(star.distanceLy!, 8);
  });
  it.each([
    [24, 0, 1],
    [-1, 0, 1],
    [1, 91, 1],
    [0, 0, -1],
    [NaN, 0, 1],
    [0, Infinity, 1],
  ])('từ chối dữ liệu ngoài miền (%s,%s,%s)', (ra, dec, r) => {
    expect(() => equatorialToCartesian(ra, dec, r)).toThrow(RangeError);
  });
  it('đổi thị sai sang năm ánh sáng và chặn thị sai vô nghĩa', () => {
    expect(parallaxToLightYears(1000)).toBeCloseTo(3.26156);
    expect(parallaxToLightYears(379.21)).toBeCloseTo(8.6, 1);
    [0, -1, Infinity, NaN].forEach((value) => expect(() => parallaxToLightYears(value)).toThrow());
  });
});

describe('tìm kiếm tên và bí danh', () => {
  it.each([
    ['mat troi', 'sun'],
    ['hệ mặt trời', 'sun'],
    ['NGUU LANG', 'altair'],
    ['Thiên Lang', 'sirius-a'],
    ["barnard's", 'barnard'],
    ['  sol  ', 'sun'],
    ['alpha centauri c', 'proxima'],
  ])('%s → %s', (query, id) => {
    expect(searchStars(query).map((star) => star.id)).toContain(id);
  });
  it('trả danh mục cho truy vấn rỗng và không bịa kết quả', () => {
    expect(searchStars('')).toHaveLength(stars.length);
    expect(searchStars('khong-co-ngoi-sao-nay')).toEqual([]);
  });
});

describe('dữ liệu thiếu và tính nhất quán danh mục', () => {
  it('hiển thị dữ liệu thiếu, giữ số 0 hợp lệ', () => {
    expect(formatValue(undefined, 'K')).toBe('Chưa có dữ liệu');
    expect(formatValue(NaN)).toBe('Chưa có dữ liệu');
    expect(formatValue(0, 'năm ánh sáng')).toBe('0 năm ánh sáng');
  });
  it('không tạo tọa độ cho sao chưa có thông tin', () => {
    const unknown = stars.find((s) => s.id === 'rigel')!;
    expect(starPosition(unknown)).toBeNull();
    expect(starPosition({ ...unknown, position: mappedStars[1].position } as Star)).toBeNull();
  });
  it('ID duy nhất, nguồn HTTPS cho từng bản ghi, nguồn tọa độ riêng', () => {
    expect(stars.length).toBeGreaterThanOrEqual(12);
    expect(new Set(stars.map((star) => star.id)).size).toBe(stars.length);
    for (const star of stars) {
      expect(star.sources.length).toBeGreaterThan(0);
      star.sources.forEach((source) => expect(new URL(source.url).protocol).toBe('https:'));
      if (star.position) {
        expect(star.position.epoch).toBe('J2000');
        expect(star.sources.some((source) => source.url === star.position!.source)).toBe(true);
      }
    }
  });
  it('sinh hạt ổn định theo seed', () => {
    const a = seededRandom(42),
      b = seededRandom(42),
      c = seededRandom(43);
    const first = Array.from({ length: 30 }, a);
    expect(first).toEqual(Array.from({ length: 30 }, b));
    expect(first).not.toEqual(Array.from({ length: 30 }, c));
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('luồng trạng thái khám phá', () => {
  const state: ExplorerState = { ...initialExplorerState, quality: 'low' };
  it('tự đổi sang cảnh lân cận cho sao có tọa độ', () => {
    expect(explorerReducer(state, { type: 'select', id: 'sirius-a' })).toMatchObject({
      mode: 'local',
      selectedId: 'sirius-a',
    });
  });
  it('chỉ mở thông tin khi thiếu tọa độ, không tự đổi cảnh', () => {
    expect(explorerReducer(state, { type: 'select', id: 'rigel' })).toMatchObject({
      mode: 'galaxy',
      selectedId: 'rigel',
    });
    expect(explorerReducer(state, { type: 'select', id: 'invalid' })).toBe(state);
  });
  it('đặt lại xóa lựa chọn; đổi cảnh xóa lựa chọn; giảm chuyển động dừng hoạt ảnh', () => {
    const chosen = explorerReducer(state, { type: 'select', id: 'sun' });
    expect(explorerReducer(chosen, { type: 'reset' })).toMatchObject({
      selectedId: null,
      reset: 2,
    });
    expect(explorerReducer(chosen, { type: 'mode', mode: 'local' })).toMatchObject({
      selectedId: null,
      mode: 'local',
    });
    expect(explorerReducer(state, { type: 'reduce' }).moving).toBe(false);
  });
});
