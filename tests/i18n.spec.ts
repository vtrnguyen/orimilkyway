import { test, expect, type Page } from '@playwright/test';
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };
import { renderer } from './helpers/renderer';

const copy = { vi, en, ja };
type Language = keyof typeof copy;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function controls(page: Page, mobile: boolean, action: () => Promise<void>) {
  if (mobile) await page.locator('.mobile-controls').click();
  await action();
  if (mobile && !(await page.getByRole('dialog').count()))
    await page.locator('.mobile-sidebar-title button').click();
}
async function language(page: Page, mobile: boolean, next: Language) {
  await controls(page, mobile, async () => {
    await page
      .locator(mobile ? '.mobile-language select' : '.topbar .language-select select')
      .selectOption(next);
  });
  await expect(page.locator('html')).toHaveAttribute('lang', next);
}
const infoName = (lng: Language, id: 'earth' | 'sun') =>
  copy[lng]['SolarInfo.thongTinValue'].replace('{{value1}}', copy[lng][`bodies.${id}.name`]);
function sameScene(
  before: Awaited<ReturnType<typeof renderer>>,
  after: Awaited<ReturnType<typeof renderer>>,
) {
  expect(after.cameraId).toBe(before.cameraId);
  expect(after.sceneId).toBe(before.sceneId);
  expect(after.geometries).toEqual(before.geometries);
  expect(after.size).toEqual(before.size);
  expect(after.zoom).toBe(before.zoom);
  before.position.forEach((value, index) => expect(after.position[index]).toBeCloseTo(value, 6));
  before.target.forEach((value, index) => expect(after.target[index]).toBeCloseTo(value, 6));
}

async function pickEarth(page: Page) {
  await renderer(page);
  const point = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((name) => name.includes('/@react-three_fiber.js?'))!;
    const fiber = (await import(url)) as typeof import('@react-three/fiber');
    const canvas = document.querySelector('canvas')!;
    const { scene, camera } = fiber._roots.get(canvas)!.store.getState();
    const mesh = scene.getObjectByName('pick-earth')!;
    const point = mesh.position.clone();
    mesh.getWorldPosition(point).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.x + ((point.x + 1) / 2) * rect.width,
      y: rect.y + ((1 - point.y) / 2) * rect.height,
    };
  });
  await page.mouse.click(point.x, point.y);
}

test('vi/en/ja preserve selected Earth, camera, layers and speed; immersive details update and preference persists', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const mobile = info.project.name === 'mobile';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const search = page.getByRole('combobox', { name: vi['Search.timKiemThienThe'] });
  await search.fill('地球');
  await search.press('Enter');
  await expect(page.getByRole('complementary', { name: infoName('vi', 'earth') })).toBeVisible();
  await controls(page, mobile, async () => {
    await page.locator('#simulation-speed').selectOption('0.5');
    await page.getByRole('switch', { name: vi['App.tenThienThe'] }).click();
  });
  const before = await renderer(page);
  const canvas = await page.locator('canvas').elementHandle();
  const panel = await page.locator('.info-panel').elementHandle();
  const clock = await page.locator('.simulation-clock output').textContent();
  for (const next of ['en', 'ja', 'vi', 'ja'] as const) {
    await language(page, mobile, next);
    await expect(page.getByRole('complementary', { name: infoName(next, 'earth') })).toBeVisible();
    await expect(page.locator('.info-panel .description')).toHaveText(
      copy[next]['bodies.earth.description'],
    );
    await expect(page.locator('.info-panel .star-stats > div').first()).toContainText(
      next === 'vi' ? '6.371 km' : '6,371 km',
    );
    await expect(page).toHaveTitle(copy[next]['metadata.title']);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      copy[next]['metadata.description'],
    );
    expect(await page.locator('.simulation-clock output').textContent()).toContain(
      next === 'vi' ? '0,0' : '0.0',
    );
    expect(await canvas!.evaluate((element) => element === document.querySelector('canvas'))).toBe(
      true,
    );
    expect(
      await panel!.evaluate((element) => element === document.querySelector('.info-panel')),
    ).toBe(true);
    sameScene(before, await renderer(page));
    await controls(page, mobile, async () => {
      await expect(page.locator('#simulation-speed')).toHaveValue('0.5');
      await expect(
        page.getByRole('switch', { name: copy[next]['App.tenThienThe'] }),
      ).not.toBeChecked();
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/${info.project.name}-i18n-${next}.png` });
  }
  expect(clock).toContain('0,0');
  await page.getByRole('button', { name: ja['App.xem3dTapTrung'], exact: true }).click();
  await expect
    .poll(async () => (await renderer(page)).size)
    .toEqual([page.viewportSize()!.width, page.viewportSize()!.height]);
  await pickEarth(page);
  await expect(page.getByRole('complementary', { name: infoName('ja', 'earth') })).toBeVisible();
  await expect(
    page.locator('.language-select:visible,.labels-overlay:visible,.topbar:visible'),
  ).toHaveCount(0);
  const focused = await renderer(page);
  // The selector intentionally stays hidden in immersive mode; use the same
  // language service to verify updates to an already open immersive inspector.
  await page.evaluate(async () => {
    const path = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((name) => name.includes('/src/i18n/index.ts'))!;
    const { changeLanguage } = await import(path);
    await changeLanguage('en');
  });
  await expect(page.getByRole('complementary', { name: infoName('en', 'earth') })).toBeVisible();
  await expect(page.locator('.info-panel .description')).toHaveText(en['bodies.earth.description']);
  await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
  sameScene(focused, await renderer(page));
  await page.screenshot({ path: `test-results/${info.project.name}-i18n-immersive.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: infoName('en', 'earth') })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('combobox', { name: en['Search.timKiemThienThe'] })).toHaveAttribute(
    'placeholder',
    en['Search.timSaoHanhTinhVeTinh'],
  );
  expect(errors).toEqual([]);
});

test('all languages translate onboarding, lessons, star profiles, filters and WebGL fallback; search accepts every language', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const mobile = info.project.name === 'mobile';
  await page.goto('/?webgl=off');
  for (const lng of ['vi', 'en', 'ja'] as const) {
    await language(page, mobile, lng);
    await expect(page.locator('.fallback-space h2')).toHaveText(copy[lng]['App.vuTruVanODay']);
    const search = page.getByRole('combobox', { name: copy[lng]['Search.timKiemThienThe'] });
    for (const query of ['trai dat', 'Earth', '地球', 'MỘC TINH', 'Jupiter', '木星']) {
      await search.fill(query);
      await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
      await expect(page.getByRole('listbox')).toContainText(
        copy[lng][
          query.includes('MỘC') || query === 'Jupiter' || query === '木星'
            ? 'bodies.jupiter.name'
            : 'bodies.earth.name'
        ],
      );
    }
    await search.fill('<img src=x onerror=alert(1)>');
    await expect(page.locator('.no-results')).toContainText(
      copy[lng]['Search.chuaTimThayThienTheNay'],
    );
    await expect(page.locator('.search-results img')).toHaveCount(0);
    await search.fill('シリウス');
    await search.press('Enter');
    await expect(page.locator('.info-panel .description')).toHaveText(
      copy[lng]['stars.sirius-a.description'],
    );
    await expect(page.locator('.info-panel h2')).toHaveText(copy[lng]['stars.sirius-a.name']);
    await expect(page.locator('.fact-list')).toContainText(copy[lng]['stars.sirius-a.facts.0']);
    await page.getByRole('button', { name: copy[lng]['StarInfo.dongThongTin'] }).click();
    await page.getByRole('button', { name: copy[lng]['App.huongDan'], exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(
      copy[lng]['App.keoChuotDeXoayKeoBangChuotPhaiDe'],
    );
    await page.getByRole('button', { name: copy[lng]['Modal.dongHopThoai'] }).click();
    await controls(page, mobile, async () => {
      await page.locator('.learn-card').click();
    });
    await page
      .getByRole('dialog')
      .getByRole('button')
      .filter({ hasText: copy[lng]['lessons.galaxy.title'] })
      .click();
    await expect(page.getByRole('dialog')).toContainText(copy[lng]['lessons.galaxy.text']);
    await page.getByRole('button', { name: copy[lng]['Modal.dongHopThoai'] }).click();
    if (mobile) await page.locator('.mobile-sidebar-title button').click();
  }
});

test('unsupported and unavailable storage fall back safely; changing language preserves a running clock', async ({
  page,
}, info) => {
  const mobile = info.project.name === 'mobile';
  await page.addInitScript(() => localStorage.setItem('milkyway-language', 'unsupported'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const search = page.getByRole('combobox', { name: vi['Search.timKiemThienThe'] });
  await search.fill('Sun');
  await search.press('Enter');
  await controls(page, mobile, async () => {
    await page.getByRole('button', { name: vi['SolarControls.chayMoPhong'], exact: true }).click();
  });
  const days = () =>
    page
      .locator('.simulation-clock output')
      .evaluate((element) =>
        Number(element.textContent!.match(/J \+ ([\d.,]+)/)![1].replace(',', '.')),
      );
  await expect.poll(days).toBeGreaterThan(1);
  const before = await days();
  await language(page, mobile, 'en');
  await expect.poll(days).toBeGreaterThan(before);
  await expect(page.getByRole('complementary', { name: infoName('en', 'sun') })).toBeVisible();
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    }),
  );
  await page.goto('/?webgl=off');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await language(page, mobile, 'ja');
  await expect(page.locator('.fallback-space h2')).toHaveText(ja['App.vuTruVanODay']);
});
