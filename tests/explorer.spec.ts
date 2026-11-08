import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
});

test('tìm kiếm bằng bàn phím, chọn sao, đóng thông tin và đặt lại', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Xin chào, Ngân Hà.' })).toBeVisible();
  const search = page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' });
  await search.fill('thien lang');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await search.press('Enter');
  const info = page.getByRole('complementary', { name: 'Thông tin Sirius A' });
  await expect(info).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Những vì sao gần ta.' })).toBeVisible();
  await expect(info.getByText('8,6 năm ánh sáng', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng thông tin' }).click();
  await expect(info).not.toBeVisible();
  await page.getByRole('button', { name: 'Đặt lại góc nhìn' }).click();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
  await page.getByRole('button', { name: /Toàn cảnh Ngân Hà/ }).click();
  await expect(page.getByRole('heading', { name: 'Xin chào, Ngân Hà.' })).toBeVisible();
  await search.fill('zzzzzz');
  await expect(page.getByText('Chưa tìm thấy thiên thể này.')).toBeVisible();
  await search.press('Escape');
  await expect(page.getByRole('listbox')).not.toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('CHẾ ĐỘ KHÁM PHÁ 2D')).not.toBeVisible();
  await expect.poll(() => errors).toEqual([]);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-galaxy.png`,
    fullPage: true,
  });
});

test('các lớp, chất lượng, chuyển động và nội dung học tập', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Khám phá', exact: true }).click();
  const labels = page.getByRole('switch', { name: 'Tên thiên thể' });
  await expect(labels).toBeChecked();
  await labels.click();
  await expect(labels).not.toBeChecked();
  await page.getByRole('switch', { name: 'Lưới khoảng cách' }).click();
  await page.getByLabel('Chất lượng').selectOption('low');
  await expect(page.getByLabel('Chất lượng')).toHaveValue('low');
  await page.getByRole('button', { name: /Một chút tò mò/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /Một năm ánh sáng dài bao nhiêu/ }).click();
  await expect(page.getByRole('dialog')).toContainText('9,46 nghìn tỷ km');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  if (testInfo.project.name === 'mobile')
    await page.getByRole('button', { name: 'Đóng bảng điều khiển', exact: true }).last().click();
  await page.getByRole('button', { name: 'Tắt chuyển động' }).click();
  await expect(page.getByRole('button', { name: 'Bật chuyển động' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Hiện chú giải' }).click();
  await expect(page.getByRole('heading', { name: 'Đọc bản đồ' })).toBeVisible();
});

test('WebGL tắt: vẫn tìm kiếm, đọc dữ liệu thiếu và không bịa vị trí', async ({
  page,
}, testInfo) => {
  await page.goto('/?webgl=off');
  await expect(page.getByText('CHẾ ĐỘ KHÁM PHÁ 2D')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' }).fill('rigel');
  await page.getByRole('combobox', { name: 'Tìm kiếm thiên thể' }).press('Enter');
  const info = page.getByRole('complementary', { name: 'Thông tin Rigel' });
  await expect(info).toBeVisible();
  await expect(info.getByText('Chưa có dữ liệu', { exact: true }).first()).toBeVisible();
  await expect(info.getByText(/Chưa có tọa độ đã xác minh. Đối tượng này/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Xin chào, Ngân Hà.' })).toBeVisible();
  await info.getByText('Nguồn & độ chính xác').click();
  await expect(info.getByRole('link', { name: 'SIMBAD · Rigel' })).toHaveAttribute(
    'href',
    /Ident=Rigel/,
  );
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-fallback.png`,
    fullPage: true,
  });
});

test('giảm chuyển động được áp dụng và hướng dẫn có thể mở lại', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const motion = page.getByRole('button', { name: 'Bật chuyển động' });
  await expect(motion).toBeDisabled();
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Hướng dẫn' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Chế độ giảm chuyển động');
  await dialog.getByRole('button', { name: 'Tiếp theo' }).click();
  await expect(dialog).toContainText('Tiến gần hơn một chút.');
  await dialog.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Hướng dẫn' })).toBeFocused();
});

test('nhãn trên cảnh chọn được sao, camera phản hồi thao tác và giao diện không tràn ngang', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Tắt chuyển động' }).click();
  const solar = page.locator('.solar-label');
  await expect(solar).toBeVisible();
  const start = await solar.boundingBox();
  const canvas = await page.locator('canvas').boundingBox();
  expect(start).not.toBeNull();
  expect(canvas).not.toBeNull();
  const x = canvas!.x + canvas!.width * 0.4;
  const y = canvas!.y + canvas!.height * 0.42;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y + 35, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const box = await solar.boundingBox();
      return box ? Math.abs(box.x - start!.x) + Math.abs(box.y - start!.y) : 0;
    })
    .toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Đặt lại góc nhìn' }).click();
  await expect
    .poll(async () => {
      const box = await solar.boundingBox();
      return box ? Math.abs(box.x - start!.x) + Math.abs(box.y - start!.y) : 100;
    })
    .toBeLessThan(4);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-overview.png`,
    fullPage: true,
  });
  await solar.click();
  await expect(page.getByRole('complementary', { name: 'Thông tin Mặt Trời' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => errors).toEqual([]);
});
