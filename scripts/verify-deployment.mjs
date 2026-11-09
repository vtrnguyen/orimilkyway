import { chromium, devices, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

const target = new URL(process.argv[2] ?? 'https://vtrnguyen.github.io/orimilkyway/');
const copy = Object.fromEntries(
  await Promise.all(
    ['vi', 'en', 'ja'].map(async (language) => [
      language,
      JSON.parse(
        await readFile(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'),
      ),
    ]),
  ),
);
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader'] });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      ...(mobile ? devices['iPhone 13'] : { viewport: { width: 1440, height: 960 } }),
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('response', (response) => {
      if (new URL(response.url()).origin === target.origin && response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
    const response = await page.goto(target.href);
    expect(response?.status()).toBe(200);
    const search = page.getByRole('combobox', { name: copy.vi['Search.timKiemThienThe'] });
    await search.fill('地球');
    await search.press('Enter');
    await expect(page.locator('.info-panel h2')).toHaveText('Trái Đất');
    await expect(page.locator('canvas')).toBeVisible();
    const canvas = await page.locator('canvas').elementHandle();
    for (const language of ['en', 'ja']) {
      if (mobile) await page.locator('.mobile-controls').click();
      await page
        .locator(mobile ? '.mobile-language select' : '.topbar .language-select select')
        .selectOption(language);
      if (mobile) await page.locator('.mobile-sidebar-title button').click();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('.info-panel h2')).toHaveText(copy[language]['bodies.earth.name']);
      await expect(page.locator('.info-panel .description')).toHaveText(
        copy[language]['bodies.earth.description'],
      );
      expect(await canvas.evaluate((element) => element === document.querySelector('canvas'))).toBe(
        true,
      );
    }
    await page.locator('.immersive-enter').click();
    await expect(
      page.locator('.info-panel:visible,.topbar:visible,.labels-overlay:visible'),
    ).toHaveCount(0);
    await expect
      .poll(async () => {
        const rect = await page.locator('canvas').boundingBox();
        return (
          rect?.width === page.viewportSize().width && rect?.height === page.viewportSize().height
        );
      })
      .toBe(true);
    await page.waitForFunction(() =>
      document.querySelector('[data-body-id="earth"]')?.style.transform.includes('translate3d'),
    );
    // Earth was explicitly focused before entering; its center is the orbit target.
    const { width, height } = page.viewportSize();
    if (mobile) await page.touchscreen.tap(width / 2, height / 2);
    else await page.mouse.click(width / 2, height / 2);
    await expect(page.getByRole('complementary', { name: '地球の詳細' })).toBeVisible();
    const prefix = target.hostname === '127.0.0.1' ? 'preview' : 'live';
    await page.screenshot({ path: `test-results/${prefix}-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.keyboard.press('Escape');
    await expect(page.locator('.info-panel:visible')).toHaveCount(0);
    await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.info-panel h2')).toHaveText('地球');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page).toHaveTitle(copy.ja['metadata.title']);
    const phenomenonTargets = {
      supernova: 'neutron',
      blackhole: 'horizon',
      solarEclipse: 'moon',
      lunarEclipse: 'moon',
      tides: 'observer',
    };
    for (const [kind, component] of Object.entries(phenomenonTargets)) {
      if (mobile) await page.locator('.mobile-controls').click();
      if (!(await page.locator('.phen-navigation').evaluate((el) => el.open)))
        await page.locator('.phen-navigation summary').click();
      await page
        .locator('.phen-navigation')
        .getByRole('button', { name: copy.ja[`phen.name.${kind}`], exact: true })
        .click();
      await expect(page.locator('.phenomena-stage')).toHaveAttribute('data-phenomenon', kind);
      await expect(page.locator('canvas')).toBeVisible();
      await page.waitForFunction(() =>
        document
          .querySelector('.phen-labels .projected-label')
          ?.style.transform.includes('translate3d'),
      );
      await page.locator('.phen-enter').click();
      await page.getByRole('button', { name: copy.ja['phen.openControls'], exact: true }).click();
      const progress = kind === 'supernova' ? 0.55 : 0.5;
      await page
        .locator('.phen-floating-controls input[type="range"]')
        .evaluate((element, value) => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
            element,
            String(value),
          );
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }, progress);
      await expect(page.locator('.phenomena-stage')).toHaveAttribute(
        'data-progress',
        String(progress),
      );
      await page
        .locator('.phen-floating-controls')
        .getByRole('combobox', { name: copy.ja['phen.chooseComponent'], exact: true })
        .selectOption(component);
      await expect(page.locator('.phen-info h2')).toHaveText(
        copy.ja[`phen.component.${component}.name`],
      );
      await page
        .locator('.phen-floating-controls')
        .getByRole('button', { name: copy.ja['phen.closeControls'], exact: true })
        .click();
      await page.screenshot({
        path: `test-results/${prefix}-${mobile ? 'mobile' : 'desktop'}-phen-${kind}.png`,
      });
      await page.keyboard.press('Escape');
      await expect(page.locator('.info-panel:visible')).toHaveCount(0);
      await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
      await page.keyboard.press('Escape');
    }
    const returnSearch = page.getByRole('combobox', { name: copy.ja['Search.timKiemThienThe'] });
    await returnSearch.fill('Earth');
    await returnSearch.press('Enter');
    await expect(page.locator('.phenomena-stage')).toHaveCount(0);
    await expect(page.locator('.info-panel h2')).toHaveText('地球');
    expect(errors).toEqual([]);
    console.log(
      `${mobile ? 'Mobile' : 'Desktop'}: HTTP 200, 3D, vi/en/ja, all five phenomena, immersive details, Escape and preference passed at ${target.href}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
