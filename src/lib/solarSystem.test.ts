import { describe, expect, it } from 'vitest';
import { planets, solarBodies, getSolarBody } from '../data/solarSystem';
import {
  advanceSimulation,
  auToKm,
  bodyExtent,
  bodyPosition,
  comparisonLayout,
  displayRadius,
  hitRadius,
  KM_PER_AU,
  kmToAU,
  orbitAngle,
  orbitalDisplayRadius,
  spinAngle,
} from './solarSystem';
import { searchCatalog } from '../data/catalog';
import { explorerReducer, initialExplorerState } from '../state/useExplorer';

describe('đơn vị và dữ liệu vật lý', () => {
  it('AU round-trip và khoảng cách Trái Đất độc lập với bán kính', () => {
    expect(auToKm(1)).toBe(149597870.7);
    expect(kmToAU(KM_PER_AU)).toBe(1);
    [384400, 57.909e6, 4514.953e6].forEach((km) => expect(auToKm(kmToAU(km))).toBeCloseTo(km, 5));
    expect(kmToAU(getSolarBody('earth')!.semiMajorAxisKm!)).toBeCloseTo(1, 5);
  });
  it('đủ tám hành tinh, đúng thứ tự khoảng cách; Mặt Trăng quay quanh Trái Đất', () => {
    expect(planets.map((p) => p.id)).toEqual([
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]);
    planets
      .slice(1)
      .forEach((body, i) =>
        expect(body.semiMajorAxisKm!).toBeGreaterThan(planets[i].semiMajorAxisKm!),
      );
    expect(getSolarBody('moon')).toMatchObject({
      category: 'Vệ tinh tự nhiên',
      parentId: 'earth',
      semiMajorAxisKm: 384400,
    });
    expect(getSolarBody('sun')).toMatchObject({ category: 'Ngôi sao', radiusKm: 695700 });
    expect(getSolarBody('jupiter')!.radiusKm).toBe(69911); // Mean, not equatorial 71492.
    expect(new Set(solarBodies.map((b) => b.id)).size).toBe(solarBodies.length);
  });
});

describe('tỷ lệ và bố cục', () => {
  it('so sánh giữ đúng mọi tỷ số bán kính, kể cả Mặt Trời và Mặt Trăng', () => {
    const earth = getSolarBody('earth')!;
    for (const body of solarBodies)
      expect(displayRadius(body, 'size') / displayRadius(earth, 'size')).toBeCloseTo(
        body.radiusKm / earth.radiusKm,
        12,
      );
  });
  it.each([false, true])(
    'các hình cầu và vành đai không chồng nhau khi có Mặt Trời=%s',
    (includeSun) => {
      const layout = comparisonLayout(includeSun, true);
      const bodies = solarBodies.filter((b) => includeSun || b.id !== 'sun');
      for (let i = 1; i < bodies.length; i++) {
        const prev = bodies[i - 1],
          body = bodies[i];
        expect(layout[body.id][0] - bodyExtent(body, 'size')).toBeGreaterThan(
          layout[prev.id][0] + bodyExtent(prev, 'size'),
        );
      }
    },
  );
  it('cảnh khám phá giữ thứ tự kích thước hành tinh, không dùng độ sáng', () => {
    const sorted = [...planets].sort((a, b) => a.radiusKm - b.radiusKm);
    sorted
      .slice(1)
      .forEach((body, i) =>
        expect(displayRadius(body, 'explore')).toBeGreaterThan(displayRadius(sorted[i], 'explore')),
      );
  });
  it('cảnh khoảng cách dùng một tỷ lệ AU và bán kính bắt chọn riêng', () => {
    for (const body of planets) {
      expect(orbitalDisplayRadius(body, 'distance') / body.semiMajorAxisKm!).toBeCloseTo(
        10 / KM_PER_AU,
        15,
      );
      const p = bodyPosition(body, 1234, 'distance');
      expect(Math.hypot(...p)).toBeCloseTo(orbitalDisplayRadius(body, 'distance'), 9);
      expect(hitRadius(body, 'size')).toBeGreaterThanOrEqual(displayRadius(body, 'size'));
    }
  });
  it('quỹ đạo Mặt Trăng tính quanh Trái Đất, không coi khoảng cách là tới Mặt Trời', () => {
    const moon = bodyPosition(getSolarBody('moon')!, 50, 'distance');
    const earth = bodyPosition(getSolarBody('earth')!, 50, 'distance');
    expect(Math.hypot(...moon.map((v, i) => v - earth[i]))).toBeCloseTo(
      (384400 / KM_PER_AU) * 10,
      10,
    );
  });
  it('chuyển tỷ lệ không thay đổi dữ liệu khoa học', () => {
    const snapshot = JSON.stringify(solarBodies);
    solarBodies.forEach((body) => {
      displayRadius(body, 'explore');
      displayRadius(body, 'size');
      bodyPosition(body, 100, 'distance');
    });
    expect(JSON.stringify(solarBodies)).toBe(snapshot);
  });
});

describe('đồng hồ mô phỏng chung', () => {
  it('chia nhỏ khung hình giữ thời gian, tạm dừng không làm nhảy khi chạy tiếp', () => {
    const oneFrame = advanceSimulation(7, 1, true, 2);
    let manyFrames = 7;
    for (let i = 0; i < 100; i++) manyFrames = advanceSimulation(manyFrames, 0.01, true, 2);
    expect(manyFrames).toBeCloseTo(oneFrame, 10);
    const paused = advanceSimulation(manyFrames, 999, false, 2);
    expect(paused).toBe(manyFrames);
    expect(advanceSimulation(paused, 0.5, true, 2)).toBeCloseTo(oneFrame + 1);
  });
  it('một chu kỳ của Trái Đất không là một chu kỳ của Sao Mộc', () => {
    expect(orbitAngle(365.256, 365.256)).toBeCloseTo(0);
    expect(orbitAngle(365.256, 4332.589)).toBeCloseTo((2 * Math.PI * 365.256) / 4332.589);
    expect(orbitAngle(87.969, 87.969)).toBeCloseTo(0);
  });
  it('tự quay dùng chu kỳ khác quỹ đạo và không đảo hai lần cho trục nghiêng >90°', () => {
    const earth = getSolarBody('earth')!,
      venus = getSolarBody('venus')!,
      uranus = getSolarBody('uranus')!;
    expect(spinAngle(earth.rotationHours! / 24, earth)).toBeCloseTo(0);
    expect(orbitAngle(earth.rotationHours! / 24, earth.orbitalPeriodDays!)).toBeGreaterThan(0);
    expect(venus.obliquityDegrees).toBeGreaterThan(90);
    expect(uranus.obliquityDegrees).toBeGreaterThan(90);
    expect(spinAngle(0.01, uranus)).toBeGreaterThan(0); // Axis orientation carries retrograde direction.
  });
  it('chặn đồng hồ, tốc độ và chu kỳ không hợp lệ', () => {
    expect(() => advanceSimulation(0, -1, true, 1)).toThrow(RangeError);
    expect(() => advanceSimulation(0, 1, true, NaN)).toThrow(RangeError);
    expect(() => orbitAngle(0, 0)).toThrow(RangeError);
    expect(explorerReducer(initialExplorerState, { type: 'speed', speed: -2 })).toBe(
      initialExplorerState,
    );
  });
});

describe('tìm kiếm, phân loại và chuyển cảnh', () => {
  it.each([
    ['trai dat', 'earth'],
    ['EARTH', 'earth'],
    ['sao moc', 'jupiter'],
    ['Jupiter', 'jupiter'],
    ['mat trang', 'moon'],
    ['Neptune', 'neptune'],
  ])('%s → %s', (q, id) => {
    expect(searchCatalog(q).map((b) => b.id)).toContain(id);
  });
  it('bộ lọc hành tinh không lẫn ngôi sao hoặc vệ tinh, không lặp Mặt Trời', () => {
    expect(searchCatalog('', 'Hành tinh')).toHaveLength(8);
    expect(searchCatalog('', 'Vệ tinh tự nhiên').map((b) => b.id)).toEqual(['moon']);
    expect(searchCatalog('Sol').filter((b) => b.id === 'sun')).toHaveLength(1);
  });
  it('chọn hành tinh hoặc dấu Hệ Mặt Trời đi vào cảnh phù hợp', () => {
    expect(explorerReducer(initialExplorerState, { type: 'select', id: 'earth' })).toMatchObject({
      mode: 'solar',
      selectedId: 'earth',
    });
    expect(explorerReducer(initialExplorerState, { type: 'select', id: 'sun' })).toMatchObject({
      mode: 'solar',
      selectedId: 'sun',
    });
    const chosen = explorerReducer(initialExplorerState, { type: 'select', id: 'moon' });
    expect(chosen).toMatchObject({ mode: 'solar', selectedId: 'moon', moon: true });
    expect(explorerReducer(chosen, { type: 'toggle', key: 'moon' }).selectedId).toBeNull();
  });
});
