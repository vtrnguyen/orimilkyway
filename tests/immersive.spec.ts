import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
});

import { renderer } from './helpers/renderer';

async function sidebar(page: Page, mobile: boolean, action: () => Promise<void>) {
  if (mobile) await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
  await action();
  if (mobile && (await page.locator('.sidebar.open').count()))
    await page.locator('.mobile-sidebar-title button').click();
}

async function choose(page: Page, query: string) {
  const input = page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' });
  await input.fill(query);
  await input.press('Enter');
}

async function expectFullCanvas(page: Page) {
  await expect
    .poll(async () => {
      const box = await page.locator('canvas').boundingBox();
      const viewport = page.viewportSize()!;
      return (
        !!box &&
        Math.abs(box.x) < 1 &&
        Math.abs(box.y) < 1 &&
        Math.abs(box.width - viewport.width) < 1 &&
        Math.abs(box.height - viewport.height) < 1
      );
    })
    .toBe(true);
  await expect
    .poll(async () => {
      const snapshot = await renderer(page);
      const viewport = page.viewportSize()!;
      return (
        Math.abs(snapshot.aspect - viewport.width / viewport.height) < 0.001 &&
        Math.abs(snapshot.buffer[0] - viewport.width * snapshot.dpr) <= 1 &&
        Math.abs(snapshot.buffer[1] - viewport.height * snapshot.dpr) <= 1
      );
    })
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

function expectSameView(
  before: Awaited<ReturnType<typeof renderer>>,
  after: Awaited<ReturnType<typeof renderer>>,
) {
  expect(after.cameraId).toBe(before.cameraId);
  expect(after.sceneId).toBe(before.sceneId);
  expect(after.geometries).toEqual(before.geometries);
  expect(after.zoom).toBe(before.zoom);
  expect(after.fov).toBe(before.fov);
  before.position.forEach((value, i) => expect(after.position[i]).toBeCloseTo(value, 6));
  before.target.forEach((value, i) => expect(after.target[i]).toBeCloseTo(value, 6));
  before.quaternion.forEach((value, i) => expect(after.quaternion[i]).toBeCloseTo(value, 6));
}

test('năm cảnh giữ Canvas/camera, ẩn toàn bộ UI và khôi phục đúng trạng thái', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const mobile = testInfo.project.name === 'mobile';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.solar-label')).toBeVisible();

  for (const scenario of ['galaxy', 'local', 'solar', 'size', 'distance']) {
    if (scenario === 'local') await choose(page, 'Sirius');
    if (scenario === 'solar') await choose(page, 'Earth');
    if (scenario === 'size' || scenario === 'distance') {
      await sidebar(page, mobile, async () => {
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
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const canvasHandle = await canvas.elementHandle();
    const before = await renderer(page);
    const clock = (await page.locator('.simulation-clock output').count())
      ? await page.locator('.simulation-clock output').textContent()
      : null;
    const panelName = (await page.locator('.info-panel h2').count())
      ? await page.locator('.info-panel h2').textContent()
      : null;
    const visibleLabels = await page.locator('.scene-label:visible').count();
    if (scenario === 'solar')
      await page.screenshot({ path: `test-results/${testInfo.project.name}-focus-before.png` });

    const entry = page.getByRole('button', { name: 'Xem 3D tập trung', exact: true });
    await expect(entry).toBeVisible();
    await entry.click();
    const exit = page.getByRole('button', { name: 'Thoát chế độ tập trung', exact: true });
    await expect(exit).toBeFocused();
    await expectFullCanvas(page);
    expect(
      await canvasHandle!.evaluate((element) => element === document.querySelector('canvas')),
    ).toBe(true);
    expectSameView(before, await renderer(page));
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(
      page.locator(
        '.scene-label:visible, .core-label:visible, .simulation-clock:visible, .topbar:visible, .sidebar:visible, .info-panel:visible, .stage-heading:visible, .toolbar:visible, .solar-scale-banner:visible',
      ),
    ).toHaveCount(0);
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          !!document.activeElement?.matches('.immersive-exit, canvas'),
      ),
    ).toBe(true);
    await expect(page.getByRole('combobox')).toHaveCount(0);

    if (scenario === 'solar')
      await page.screenshot({ path: `test-results/${testInfo.project.name}-focus-after.png` });
    if (scenario === 'distance') {
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await expectFullCanvas(page);
      expectSameView(before, await renderer(page));
      await expect(exit).toBeVisible();
      await page.setViewportSize(viewport);
      await expectFullCanvas(page);
    }
    if (scenario === 'local' || scenario === 'size') await exit.click();
    else await page.keyboard.press('Escape');
    await expect(entry).toBeFocused();
    await expect(page.locator('.topbar')).toBeVisible();
    expectSameView(before, await renderer(page));
    if (panelName) await expect(page.locator('.info-panel h2')).toHaveText(panelName);
    if (clock) await expect(page.locator('.simulation-clock output')).toHaveText(clock);
    expect(await page.locator('.scene-label:visible').count()).toBe(visibleLabels);
  }
  await expect.poll(() => errors).toEqual([]);
});

test('mô phỏng chạy tiếp, giữ lựa chọn nhãn và thao tác camera trên toàn vùng', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const mobile = testInfo.project.name === 'mobile';
  await page.goto('/');
  await choose(page, 'Jupiter');
  await expect(page.locator('.solar-container canvas')).toBeVisible();
  await sidebar(page, mobile, async () => {
    await page.getByRole('switch', { name: 'Tên thiên thể' }).click();
    await page.getByLabel('Tốc độ', { exact: true }).selectOption('0.05');
  });
  await page.getByLabel('Theo dõi thiên thể đang di chuyển').uncheck();
  // Pause for a deterministic view before testing interactions; then resume inside
  // focus mode by preserving the previous running state in the second entry.
  await sidebar(page, mobile, async () => {
    await page.getByRole('button', { name: 'Tạm dừng mô phỏng', exact: true }).click();
  });
  const entry = page.getByRole('button', { name: 'Xem 3D tập trung' });
  await entry.click();
  await expectFullCanvas(page);
  const before = await renderer(page);
  const viewport = page.viewportSize()!;
  const touch = mobile ? await page.context().newCDPSession(page) : null;
  if (touch) {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 35, y: viewport.height * 0.45, id: 1 }],
    });
    for (let i = 1; i <= 10; i++)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 35 + i * 10, y: viewport.height * (0.45 + i * 0.005), id: 1 }],
      });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(35, viewport.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(135, viewport.height * 0.5, { steps: 12 });
    await page.mouse.up();
  }
  await expect.poll(async () => (await renderer(page)).position).not.toEqual(before.position);
  const rotated = await renderer(page);
  if (touch) {
    const middle = viewport.width / 2,
      y = viewport.height * 0.6;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: middle - 25, y, id: 1 },
        { x: middle + 25, y, id: 2 },
      ],
    });
    for (let i = 1; i <= 8; i++)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: middle - 25 - i * 5, y, id: 1 },
          { x: middle + 25 + i * 5, y, id: 2 },
        ],
      });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(viewport.width * 0.5, viewport.height * 0.6);
    await page.mouse.wheel(0, 700);
  }
  await expect.poll(async () => (await renderer(page)).position).not.toEqual(rotated.position);
  const zoomed = await renderer(page);
  if (touch) {
    const y = viewport.height * 0.45;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: 80, y, id: 1 },
        { x: 160, y, id: 2 },
      ],
    });
    for (let i = 1; i <= 8; i++)
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: 80 + i * 5, y, id: 1 },
          { x: 160 + i * 5, y, id: 2 },
        ],
      });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(viewport.width * 0.5, viewport.height * 0.4);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(viewport.width * 0.5 + 55, viewport.height * 0.4 + 25, { steps: 10 });
    await page.mouse.up({ button: 'right' });
  }
  await expect.poll(async () => (await renderer(page)).target).not.toEqual(zoomed.target);
  await page.keyboard.press('Escape');
  await sidebar(page, mobile, async () => {
    await expect(page.getByRole('switch', { name: 'Tên thiên thể' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Chạy mô phỏng', exact: true }).click();
  });
  const clock = page.locator('.simulation-clock output');
  const clockBefore = await clock.textContent();
  await entry.click();
  await expect(clock).not.toHaveText(clockBefore!);
  await page.getByRole('button', { name: 'Thoát chế độ tập trung' }).click();
  await expect(page.getByRole('complementary', { name: 'Thông tin Sao Mộc' })).toBeVisible();
  await sidebar(page, mobile, async () => {
    await expect(page.getByRole('switch', { name: 'Tên thiên thể' })).not.toBeChecked();
    await expect(
      page.getByRole('button', { name: 'Tạm dừng mô phỏng', exact: true }),
    ).toBeVisible();
  });
});

test('không gọi Fullscreen API và không thoát fullscreen có sẵn', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.solar-label')).toBeVisible();
  await page.evaluate(async () => {
    await document.documentElement.requestFullscreen();
  });
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  // Any app request/exit would now throw and leave a visible console/test error.
  await page.evaluate(() => {
    Element.prototype.requestFullscreen = () => {
      throw new Error('App called requestFullscreen');
    };
    document.exitFullscreen = () => {
      throw new Error('App called exitFullscreen');
    };
  });
  await page.getByRole('button', { name: 'Xem 3D tập trung' }).click();
  await expectFullCanvas(page);
  await page.getByRole('button', { name: 'Thoát chế độ tập trung' }).click();
  expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Xem 3D tập trung' })).toBeFocused();
});
