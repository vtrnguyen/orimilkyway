import { expect, test, type Page } from '@playwright/test';
import { renderer } from './helpers/renderer';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function controls(page: Page, mobile: boolean, action: () => Promise<void>) {
  if (mobile) await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
  await action();
  if (mobile && (await page.locator('.sidebar.open').count()))
    await page.locator('.mobile-sidebar-title button').click();
}

async function objectPoint(page: Page, id: string) {
  await renderer(page);
  return page.evaluate(async (objectId) => {
    const url = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((name) => name.includes('/@react-three_fiber.js?'))!;
    const fiber = (await import(url)) as typeof import('@react-three/fiber');
    const canvas = document.querySelector('canvas')!;
    const { camera, scene } = fiber._roots.get(canvas)!.store.getState();
    const object = scene.getObjectByName(`pick-${objectId}`)!;
    const point = object.position.clone();
    object.updateWorldMatrix(true, false);
    object.getWorldPosition(point).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.x + ((point.x + 1) / 2) * rect.width,
      y: rect.y + ((1 - point.y) / 2) * rect.height,
    };
  }, id);
}

async function pick(page: Page, id: string, mobile: boolean) {
  await expect
    .poll(async () => (await renderer(page)).size)
    .toEqual([page.viewportSize()!.width, page.viewportSize()!.height]);
  const point = await objectPoint(page, id);
  expect(point.x).toBeGreaterThan(0);
  expect(point.x).toBeLessThan(page.viewportSize()!.width);
  expect(point.y).toBeGreaterThan(0);
  expect(point.y).toBeLessThan(page.viewportSize()!.height);
  if (mobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

function sameCamera(
  before: Awaited<ReturnType<typeof renderer>>,
  after: Awaited<ReturnType<typeof renderer>>,
) {
  expect(after.cameraId).toBe(before.cameraId);
  expect(after.sceneId).toBe(before.sceneId);
  expect(after.size).toEqual(before.size);
  expect(after.buffer).toEqual(before.buffer);
  expect(after.aspect).toBe(before.aspect);
  expect(after.zoom).toBe(before.zoom);
  before.position.forEach((v, i) => expect(after.position[i]).toBeCloseTo(v, 6));
  before.target.forEach((v, i) => expect(after.target[i]).toBeCloseTo(v, 6));
}

async function solarOverview(page: Page, mobile: boolean, moon = false) {
  await page.goto('/');
  await controls(page, mobile, async () => {
    await page
      .getByRole('button', { name: 'Hệ Mặt Trời Một ngôi sao, tám hành tinh', exact: true })
      .click();
  });
  await expect(page.locator('.solar-container canvas')).toBeVisible();
  if (moon)
    await controls(page, mobile, async () => {
      await page.getByLabel('Hiển thị Mặt Trăng', { exact: true }).check();
    });
  await page.getByRole('button', { name: 'Xem 3D tập trung' }).click();
  await renderer(page);
  if (mobile) {
    await page.mouse.move(40, 350);
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 250);
    await renderer(page);
  }
}

test('raycast chọn Earth/Jupiter/Moon, panel nổi và Escape hai bước, không đổi camera', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const mobile = testInfo.project.name === 'mobile';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await solarOverview(page, mobile, true);
  const canvas = await page.locator('canvas').elementHandle();
  const before = await renderer(page);
  const clock = await page.locator('.simulation-clock output').textContent();
  await pick(page, 'earth', mobile);
  await expect(page.getByRole('complementary', { name: 'Thông tin Trái Đất' })).toBeVisible();
  const panel = await page.locator('.info-panel').elementHandle();
  sameCamera(before, await renderer(page));
  await pick(page, 'jupiter', mobile);
  await expect(page.getByRole('complementary', { name: 'Thông tin Sao Mộc' })).toBeVisible();
  expect(
    await panel!.evaluate((element) => element === document.querySelector('.info-panel')),
  ).toBe(true);
  sameCamera(before, await renderer(page));
  const panelBox = await page.locator('.info-panel').boundingBox();
  const exitBox = await page.locator('.immersive-exit').boundingBox();
  expect(panelBox!.y).toBeGreaterThan(exitBox!.y + exitBox!.height);
  if (mobile) expect(panelBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.46 + 1);
  else expect(panelBox!.width).toBeLessThanOrEqual(320);
  await page.mouse.move(panelBox!.x + panelBox!.width / 2, panelBox!.y + panelBox!.height * 0.65);
  await page.mouse.wheel(0, 400);
  if (mobile)
    await expect
      .poll(() => page.locator('.info-panel').evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  sameCamera(before, await renderer(page));
  if (mobile) {
    const touch = await page.context().newCDPSession(page);
    const x = panelBox!.x + panelBox!.width / 2,
      y = panelBox!.y + panelBox!.height * 0.6;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - 50, id: 1 }],
    });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
    sameCamera(before, await renderer(page));
  }
  await page.getByRole('button', { name: 'Đóng thông tin' }).click();
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
  await expect(
    page.locator('.topbar:visible,.sidebar:visible,.toolbar:visible,.labels-overlay:visible'),
  ).toHaveCount(0);
  await pick(page, 'moon', mobile);
  await expect(page.getByRole('complementary', { name: 'Thông tin Mặt Trăng' })).toBeVisible();
  await expect(page.getByText('Vệ tinh tự nhiên', { exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-immersive-details.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thoát chế độ tập trung' })).toBeFocused();
  sameCamera(before, await renderer(page));
  expect(await canvas!.evaluate((element) => element === document.querySelector('canvas'))).toBe(
    true,
  );
  await expect(page.locator('.simulation-clock output')).toHaveText(clock!);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Xem 3D tập trung' })).toBeFocused();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect.poll(() => errors).toEqual([]);
});

test('kéo qua thiên thể rồi trở lại và zoom không mở nhầm hồ sơ; panel không khóa Tab', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const mobile = testInfo.project.name === 'mobile';
  await solarOverview(page, mobile);
  const point = await objectPoint(page, 'earth');
  const before = await renderer(page);
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...point, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: point.x + 45, y: point.y + 20, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ ...point, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { ...point, id: 1 },
        { x: point.x + 40, y: point.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: point.x + 10, y: point.y, id: 1 },
        { x: point.x + 30, y: point.y, id: 2 },
      ],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 45, point.y + 20, { steps: 8 });
    await page.mouse.move(point.x, point.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  const dragView = await renderer(page);
  expect(dragView.cameraId).toBe(before.cameraId);
  await page.mouse.move(30, 300);
  await page.mouse.wheel(0, 400);
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await pick(page, 'earth', mobile);
  await expect(page.getByRole('complementary', { name: 'Thông tin Trái Đất' })).toBeVisible();
  await page.locator('.immersive-exit').focus();
  await page.keyboard.press('Shift+Tab');
  expect(
    await page
      .locator('.info-panel')
      .evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);
  await page.getByRole('button', { name: 'Đóng thông tin' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
});

test('mở/đóng hồ sơ trong lúc mô phỏng chạy không đặt lại thời gian', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' });
  await search.fill('Sun');
  await search.press('Enter');
  await page.getByLabel('Theo dõi thiên thể đang di chuyển').uncheck();
  await controls(page, mobile, async () => {
    await page.getByLabel('Tốc độ', { exact: true }).selectOption('2');
  });
  const clock = () =>
    page
      .locator('.simulation-clock output')
      .evaluate((element) => Number(element.textContent!.match(/[\d,]+/)![0].replace(',', '.')));
  await expect.poll(clock).toBeGreaterThan(0);
  const before = await clock();
  const canvas = await page.locator('canvas').elementHandle();
  await page.getByRole('button', { name: 'Xem 3D tập trung' }).click();
  // Use the stationary Sun to measure clock continuity independently from
  // planet motion and the camera flight started by the prior search.
  await expect
    .poll(async () => {
      const a = await renderer(page),
        b = await renderer(page);
      return Math.hypot(...a.position.map((value, i) => value - b.position[i]));
    })
    .toBeLessThan(0.0001);
  await pick(page, 'sun', mobile);
  await expect(page.getByRole('complementary', { name: 'Thông tin Mặt Trời' })).toBeVisible();
  await expect.poll(clock).toBeGreaterThan(before);
  const opened = await clock();
  await page.keyboard.press('Escape');
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await expect.poll(clock).toBeGreaterThan(opened);
  expect(await canvas!.evaluate((element) => element === document.querySelector('canvas'))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await controls(page, mobile, async () => {
    await expect(
      page.getByRole('button', { name: 'Tạm dừng mô phỏng', exact: true }),
    ).toBeVisible();
  });
});

test('chọn được ở Ngân Hà, lân cận và hai cảnh tỷ lệ; xem gần chỉ khi yêu cầu', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const mobile = testInfo.project.name === 'mobile';
  for (const scenario of ['galaxy', 'local', 'size', 'distance']) {
    await page.goto('/');
    await expect(page.locator('.solar-label')).toBeVisible();
    if (scenario === 'local')
      await controls(page, mobile, async () => {
        await page.getByRole('button', { name: /Lân cận Mặt Trời Những người/ }).click();
      });
    if (scenario === 'size' || scenario === 'distance') {
      await controls(page, mobile, async () => {
        await page
          .getByRole('button', { name: 'Hệ Mặt Trời Một ngôi sao, tám hành tinh', exact: true })
          .click();
      });
      await controls(page, mobile, async () => {
        await page
          .getByRole('button', {
            name:
              scenario === 'size'
                ? /So sánh kích thước thật Chung/
                : /Khoảng cách quỹ đạo thật Chung/,
          })
          .click();
      });
    }
    await page.getByRole('button', { name: 'Xem 3D tập trung' }).click();
    await expect
      .poll(async () => (await renderer(page)).size)
      .toEqual([page.viewportSize()!.width, page.viewportSize()!.height]);
    if (mobile && scenario !== 'distance') {
      await page.mouse.move(40, 300);
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 250);
    }
    const id = scenario === 'galaxy' ? 'sun' : scenario === 'local' ? 'sirius-a' : 'earth';
    const name = id === 'sun' ? 'Mặt Trời' : id === 'sirius-a' ? 'Sirius A' : 'Trái Đất';
    const before = await renderer(page);
    await pick(page, id, mobile);
    await expect(page.getByRole('complementary', { name: `Thông tin ${name}` })).toBeVisible();
    sameCamera(before, await renderer(page));
    if (scenario === 'galaxy') {
      await page.getByRole('button', { name: 'Đưa về tâm góc nhìn' }).click();
      const focused = await renderer(page);
      expect(focused.cameraId).toBe(before.cameraId);
      expect(focused.sceneId).toBe(before.sceneId);
      expect(focused.position).not.toEqual(before.position);
      await expect(page.locator('.mode-galaxy')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Đóng thông tin' }).click();
    await expect(page.getByRole('button', { name: 'Thoát chế độ tập trung' })).toBeVisible();
  }
});
