import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
});

async function openControls(page: Page, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
}

async function closeControls(page: Page, mobile: boolean) {
  if (mobile)
    await page.getByRole('button', { name: 'Đóng bảng điều khiển', exact: true }).last().click();
}

async function findBody(page: Page, name: string) {
  const search = page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' });
  await search.fill(name);
  await search.press('Enter');
}

test('tám hành tinh, ba tỷ lệ, Mặt Trăng và các ảnh bề mặt', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const mobile = testInfo.project.name === 'mobile';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await openControls(page, mobile);
  await page
    .getByRole('button', { name: 'Hệ Mặt Trời Một ngôi sao, tám hành tinh', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Khám phá Hệ Mặt Trời.' })).toBeVisible();
  await expect(page.locator('.solar-labels [data-body-id]')).toHaveCount(9);
  await openControls(page, mobile);
  const list = page.getByRole('list', { name: 'Thứ tự các hành tinh' });
  await expect(list.locator('li')).toHaveCount(9);
  expect(await list.locator('li').allTextContents()).toEqual([
    'Mặt TrờiSun',
    'Sao ThủyMercury',
    'Sao KimVenus',
    'Trái ĐấtEarth',
    'Sao HỏaMars',
    'Sao MộcJupiter',
    'Sao ThổSaturn',
    'Sao Thiên VươngUranus',
    'Sao Hải VươngNeptune',
  ]);
  await page.getByLabel('Hiển thị Mặt Trăng', { exact: true }).check();
  await expect(page.locator('.solar-labels [data-body-id]')).toHaveCount(10);
  await page.getByRole('button', { name: /So sánh kích thước thật Chung/ }).click();
  await page.getByLabel('Mặt Trời và các hành tinh', { exact: true }).check();
  await closeControls(page, mobile);
  await expect(page.locator('.solar-scale-banner')).toContainText('1 đơn vị = 10.000 km');
  await expect(page.locator('[data-body-id="mercury"] .planet-label')).toHaveAccessibleName(
    'Chọn Sao Thủy',
  );
  await page.screenshot({ path: `test-results/${testInfo.project.name}-size-comparison.png` });
  await openControls(page, mobile);
  await page.getByRole('button', { name: /Khoảng cách quỹ đạo thật Chung/ }).click();
  await closeControls(page, mobile);
  await expect(page.locator('.solar-scale-banner')).toContainText('10 đơn vị = 1 AU');
  await expect(page.locator('.solar-scale-banner')).toContainText('phóng đại');
  await openControls(page, mobile);
  await page.getByRole('button', { name: /Khám phá Kích thước/ }).click();
  await closeControls(page, mobile);
  for (const [query, vietnamese] of [
    ['Earth', 'Trái Đất'],
    ['Jupiter', 'Sao Mộc'],
    ['Saturn', 'Sao Thổ'],
  ]) {
    await findBody(page, query);
    const panel = page.getByRole('complementary', { name: `Thông tin ${vietnamese}` });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Hành tinh', { exact: true })).toBeVisible();
    await expect(panel.getByText('Bán kính trung bình thể tích')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-${query.toLowerCase()}.png`,
    });
  }
  await page.getByRole('button', { name: 'Đóng thông tin' }).click();
  await openControls(page, mobile);
  await page.getByLabel('Hiển thị Mặt Trăng', { exact: true }).uncheck();
  await expect(page.locator('.solar-labels [data-body-id]')).toHaveCount(9);
  await closeControls(page, mobile);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => errors).toEqual([]);
});

test('đồng hồ tạm dừng, camera vẫn thao tác được, theo dõi không đặt lại góc nhìn', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  await page.goto('/');
  await findBody(page, 'Earth');
  await expect(page.getByRole('complementary', { name: 'Thông tin Trái Đất' })).toBeVisible();
  const clock = page.getByLabel('Thời gian mô phỏng');
  await expect(clock).toBeVisible({ timeout: 30000 });
  await expect(clock).not.toHaveText('J + 0,0 ngày mô phỏng');
  await openControls(page, mobile);
  await page.getByLabel('Tốc độ', { exact: true }).selectOption('0.5');
  await page.getByRole('button', { name: 'Tạm dừng mô phỏng', exact: true }).click();
  await closeControls(page, mobile);
  const paused = await clock.textContent();
  // Observe the clock across frames; a paused simulation must not change.
  await page.waitForTimeout(400);
  await expect(clock).toHaveText(paused!);
  const canvas = await page.locator('canvas').boundingBox();
  const x = canvas!.x + canvas!.width * 0.35,
    y = canvas!.y + canvas!.height * 0.6;
  const before = await page.locator('canvas').screenshot();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 55, y + 25, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await page.locator('canvas').screenshot();
  expect(before.equals(after)).toBe(false);
  await expect(clock).toHaveText(paused!);
  const label = page.locator('[data-body-id="earth"]');
  const held = await label.boundingBox();
  await page.waitForTimeout(800);
  const later = await label.boundingBox();
  expect(Math.abs(held!.x - later!.x) + Math.abs(held!.y - later!.y)).toBeLessThan(4);
  await openControls(page, mobile);
  await page.getByRole('button', { name: 'Chạy mô phỏng', exact: true }).click();
  await closeControls(page, mobile);
  await expect(clock).not.toHaveText(paused!);
  const tracked = await label.boundingBox();
  await page.waitForTimeout(650);
  const trackedLater = await label.boundingBox();
  expect(
    Math.abs(tracked!.x - trackedLater!.x) + Math.abs(tracked!.y - trackedLater!.y),
  ).toBeLessThan(5);
});

test('tìm kiếm phân loại và dự phòng 2D vẫn có hành tinh/vệ tinh', async ({ page }) => {
  await page.goto('/?webgl=off');
  const search = page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' });
  await search.fill('');
  await search.click();
  await page.getByRole('button', { name: 'Hành tinh', exact: true }).click();
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(8);
  await search.fill('sao moc');
  await search.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Thông tin Sao Mộc' })).toBeVisible();
  await search.fill('');
  await search.click();
  await page.getByRole('button', { name: 'Vệ tinh tự nhiên', exact: true }).click();
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await search.press('Enter');
  const panel = page.getByRole('complementary', { name: 'Thông tin Mặt Trăng' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Vệ tinh tự nhiên', { exact: true })).toBeVisible();
  await expect(panel.getByText('Trái Đất', { exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('đổi cả ba cảnh không kích hoạt dự phòng giả; zoom gần/xa không mất mô hình', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const mobile = testInfo.project.name === 'mobile';
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.solar-label')).toBeVisible();
  await page.locator('.solar-label').click();
  await expect(page.locator('.solar-container canvas')).toBeVisible();
  // R3F releases the previous canvas after an asynchronous disposal delay.
  await page.waitForTimeout(1000);
  await expect(page.getByText('CHẾ ĐỘ KHÁM PHÁ 2D')).not.toBeVisible();
  for (const mode of [/Toàn cảnh Ngân Hà/, /Lân cận Mặt Trời/, /Hệ Mặt Trời Một ngôi sao/]) {
    await openControls(page, mobile);
    await page.getByRole('button', { name: mode }).click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForTimeout(650);
    await expect(page.getByText('CHẾ ĐỘ KHÁM PHÁ 2D')).not.toBeVisible();
  }
  await findBody(page, 'Saturn');
  await expect(page.getByRole('complementary', { name: 'Thông tin Sao Thổ' })).toBeVisible();
  const label = page.getByRole('button', { name: 'Chọn Sao Thổ', exact: true });
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.55);
  await page.mouse.wheel(0, -10000);
  await expect(label).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-saturn-near.png` });
  await page.mouse.wheel(0, 10000);
  await page.waitForTimeout(200);
  await expect(label).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => errors).toEqual([]);
});
