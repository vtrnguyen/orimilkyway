import { test, expect, type Page } from '@playwright/test';
import { renderer } from './helpers/renderer';
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import ja from '../src/i18n/locales/ja.json' with { type: 'json' };

const ids = ['supernova', 'blackhole', 'solarEclipse', 'lunarEclipse', 'tides'] as const;
const dictionaries = { vi, en, ja };
type Kind = (typeof ids)[number];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('milkyway-intro-seen', 'yes'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});
async function controls(page: Page, mobile: boolean, action: () => Promise<void>) {
  if (mobile) await page.locator('.mobile-controls').click();
  await action();
  if (mobile && (await page.locator('.sidebar.open').count()))
    await page.locator('.mobile-sidebar-title button').click();
}
async function choose(page: Page, mobile: boolean, kind: Kind) {
  await controls(page, mobile, async () => {
    if (!(await page.locator('.phen-navigation').evaluate((el) => (el as HTMLDetailsElement).open)))
      await page.locator('.phen-navigation summary').click();
    await page
      .locator('.phen-navigation')
      .getByRole('button', { name: vi[`phen.name.${kind}`], exact: true })
      .click();
  });
  await expect(page.locator('.phenomena-stage')).toHaveAttribute('data-phenomenon', kind);
}
async function seek(page: Page, value: number, selector = '.sidebar') {
  await page.locator(`${selector} input[type="range"]`).evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      element,
      String(value),
    );
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('.phenomena-stage')).toHaveAttribute('data-progress', String(value));
}
async function point(page: Page, id: string) {
  await renderer(page);
  return page.evaluate(async (id) => {
    const url = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((n) => n.includes('/@react-three_fiber.js?'))!;
    const fiber = (await import(url)) as typeof import('@react-three/fiber');
    const canvas = document.querySelector('canvas')!,
      { scene, camera } = fiber._roots.get(canvas)!.store.getState();
    const object = scene.getObjectByName(`phen-component-${id}`)!;
    const position = object.position.clone();
    object.getWorldPosition(position).project(camera);
    const box = canvas.getBoundingClientRect();
    return {
      x: box.x + ((position.x + 1) * box.width) / 2,
      y: box.y + ((1 - position.y) * box.height) / 2,
    };
  }, id);
}
function sameCamera(
  a: Awaited<ReturnType<typeof renderer>>,
  b: Awaited<ReturnType<typeof renderer>>,
) {
  expect(b.cameraId).toBe(a.cameraId);
  expect(b.sceneId).toBe(a.sceneId);
  expect(b.size).toEqual(a.size);
  expect(b.aspect).toBe(a.aspect);
  expect(b.zoom).toBe(a.zoom);
  a.position.forEach((value, i) => expect(b.position[i]).toBeCloseTo(value, 6));
  a.target.forEach((value, i) => expect(b.target[i]).toBeCloseTo(value, 6));
}

test('five separate 3D simulations, presets, reversible timelines, graph and screenshots', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const mobile = info.project.name === 'mobile';
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  for (const kind of ids) {
    await choose(page, mobile, kind);
    await expect(page.locator('.phen-scene canvas')).toBeVisible();
    const before = await renderer(page);
    await controls(page, mobile, async () => {
      await page.getByRole('combobox', { name: vi['phen.view'], exact: true }).selectOption('top');
    });
    expect((await renderer(page)).position).not.toEqual(before.position);
    await controls(page, mobile, async () => {
      await page
        .getByRole('combobox', { name: vi['phen.view'], exact: true })
        .selectOption('overview');
    });
    await controls(page, mobile, async () => {
      await expect(
        page.getByRole('button', { name: vi['SolarControls.chayMoPhong'], exact: true }),
      ).toBeDisabled();
      await seek(page, 0.9);
      await seek(page, 0.32);
      await seek(page, 0.5);
    });
    sameCamera(before, await renderer(page));
    if (kind === 'solarEclipse' || kind === 'lunarEclipse') {
      const presets =
        kind === 'solarEclipse'
          ? ['partial', 'total', 'annular']
          : ['penumbral', 'partial', 'total'];
      for (const preset of presets) {
        await controls(page, mobile, async () => {
          await page.getByRole('combobox', { name: vi['phen.preset'] }).selectOption(preset);
        });
        await expect(page.locator('.phen-observer')).toHaveAttribute('data-phase', preset);
        await controls(page, mobile, async () => {
          await seek(page, 0);
        });
        await expect(page.locator('.phen-observer')).toHaveAttribute('data-phase', 'none');
        await controls(page, mobile, async () => {
          await seek(page, 0.5);
        });
        await expect(page.locator('.phen-observer')).toHaveAttribute('data-phase', preset);
      }
    }
    if (kind === 'tides') {
      const curve = await page.getByTestId('tide-curve').getAttribute('d');
      await controls(page, mobile, async () => {
        await page.getByLabel(vi['phen.parameter.solarTide'], { exact: true }).uncheck();
      });
      await expect(page.getByTestId('tide-curve')).not.toHaveAttribute('d', curve!);
      await controls(page, mobile, async () => {
        await seek(page, 0.125);
      });
      expect(
        Number(await page.locator('.phen-tide-graph').getAttribute('data-height')),
      ).toBeCloseTo(0.25);
    }
    if (mobile && (await page.locator('.phen-observer,.phen-tide-graph').count())) {
      const widget = await page.locator('.phen-observer,.phen-tide-graph').boundingBox();
      for (const body of ['sun', 'earth', 'moon']) {
        const center = await point(page, body);
        expect(
          center.x > widget!.x &&
            center.x < widget!.x + widget!.width &&
            center.y > widget!.y &&
            center.y < widget!.y + widget!.height,
        ).toBe(false);
      }
    }
    await page.screenshot({ path: `test-results/${info.project.name}-phen-${kind}.png` });
    await controls(page, mobile, async () => {
      await page.getByRole('button', { name: vi['phen.restart'], exact: true }).click();
    });
    await expect(page.locator('.phenomena-stage')).toHaveAttribute('data-progress', '0');
  }
  expect(errors).toEqual([]);
});

test('immersive picking, drag rejection, non-modal detail, floating controls and ordered Escape', async ({
  page,
}, info) => {
  const mobile = info.project.name === 'mobile';
  await page.goto('/');
  await choose(page, mobile, 'blackhole');
  await renderer(page);
  await page.getByRole('button', { name: vi['App.xem3dTapTrung'], exact: true }).click();
  await expect
    .poll(async () => (await renderer(page)).size)
    .toEqual([page.viewportSize()!.width, page.viewportSize()!.height]);
  await expect(
    page.locator(
      '.phen-guide:visible,.labels-overlay:visible,.phen-observer:visible,.topbar:visible',
    ),
  ).toHaveCount(0);
  const before = await renderer(page),
    p = await point(page, 'horizon');
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 45, p.y + 20, { steps: 8 });
  await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  const pick = await point(page, 'horizon');
  if (mobile) await page.touchscreen.tap(pick.x, pick.y);
  else await page.mouse.click(pick.x, pick.y);
  await expect(
    page.getByRole('complementary', { name: 'Giải thích: Chân trời sự kiện' }),
  ).toBeVisible();
  const afterDrag = await renderer(page);
  expect(afterDrag.cameraId).toBe(before.cameraId);
  await page.keyboard.press('Escape');
  await expect(page.locator('.info-panel:visible')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
  await page.getByRole('button', { name: vi['phen.openControls'], exact: true }).click();
  await expect(page.locator('.phen-floating-controls')).toBeVisible();
  const box = await page.locator('.phen-floating-controls').boundingBox(),
    exit = await page.locator('.immersive-exit').boundingBox();
  expect(box!.y).toBeGreaterThan(exit!.y + exit!.height);
  await seek(page, 0.6, '.phen-floating-controls');
  await page
    .locator('.phen-floating-controls')
    .getByLabel(vi['phen.parameter.disk'], { exact: true })
    .uncheck();
  sameCamera(afterDrag, await renderer(page));
  if (mobile) {
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => (await renderer(page)).size).toEqual([844, 390]);
    const landscape = await renderer(page);
    expect(landscape.cameraId).toBe(afterDrag.cameraId);
    landscape.position.forEach((v, i) => expect(v).toBeCloseTo(afterDrag.position[i], 6));
    await expect(page.locator('.immersive-exit')).toBeVisible();
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => (await renderer(page)).size)
      .toEqual([viewport.width, viewport.height]);
  }
  await page.screenshot({ path: `test-results/${info.project.name}-phen-immersive.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('.phen-floating-controls')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: vi['App.xem3dTapTrung'], exact: true }),
  ).toBeFocused();
});

test('all translations preserve every simulation, selected component, camera and meshes', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const mobile = info.project.name === 'mobile';
  await page.goto('/');
  for (const kind of ids) {
    await choose(page, mobile, kind);
    await controls(page, mobile, async () => {
      await seek(page, 0.42);
    });
    await renderer(page);
    await page.locator('.phen-labels button').first().click();
    const before = await renderer(page),
      canvas = await page.locator('canvas').elementHandle();
    for (const lng of ['en', 'ja', 'vi'] as const) {
      await controls(page, mobile, async () => {
        await page
          .locator(mobile ? '.mobile-language select' : '.topbar .language-select select')
          .selectOption(lng);
      });
      await expect(page.locator('.phenomena-stage h1')).toHaveText(
        dictionaries[lng][`phen.name.${kind}`],
      );
      await expect(page.locator('.phenomena-stage')).toHaveAttribute('data-progress', '0.42');
      await expect(page.locator('.phen-info')).toBeVisible();
      sameCamera(before, await renderer(page));
      expect((await renderer(page)).geometries).toEqual(before.geometries);
      expect(await canvas!.evaluate((el) => el === document.querySelector('canvas'))).toBe(true);
    }
    await page.getByRole('button', { name: vi['SolarInfo.dongThongTin'], exact: true }).click();
  }
});

test('every immersive scene raycasts meaningful components through transparent teaching volumes', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const mobile = info.project.name === 'mobile';
  await page.goto('/');
  const targets = {
    supernova: 'neutron',
    blackhole: 'horizon',
    solarEclipse: 'moon',
    lunarEclipse: 'moon',
    tides: 'observer',
  } as const;
  for (const kind of ids) {
    await choose(page, mobile, kind);
    await controls(page, mobile, async () => {
      await seek(page, kind === 'supernova' ? 0.9 : kind === 'tides' ? 0.125 : 0.5);
    });
    await renderer(page);
    await page.getByRole('button', { name: vi['App.xem3dTapTrung'], exact: true }).click();
    await expect
      .poll(async () => (await renderer(page)).size)
      .toEqual([page.viewportSize()!.width, page.viewportSize()!.height]);
    const before = await renderer(page),
      target = targets[kind],
      p = await point(page, target);
    if (mobile) await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
    const component = vi[`phen.component.${target}.name`];
    await expect(
      page.getByRole('complementary', {
        name: vi['phen.detailsTitle'].replace('{{name}}', component),
      }),
    ).toBeVisible();
    sameCamera(before, await renderer(page));
    await page.keyboard.press('Escape');
    await expect(page.locator('.info-panel:visible')).toHaveCount(0);
    await expect(page.locator('.app-shell')).toHaveClass(/is-immersive/);
    await page.keyboard.press('Escape');
  }
});

test('2D fallback retains five diagrams, states and explanations', async ({ page }, info) => {
  const mobile = info.project.name === 'mobile';
  await page.goto('/?webgl=off');
  for (const kind of ids) {
    await choose(page, mobile, kind);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.phen-fallback svg')).toBeVisible();
    await controls(page, mobile, async () => {
      await seek(page, 0.5);
    });
    await page.locator('.phen-fallback .phen-component-list button').first().click();
    await expect(page.locator('.phen-info .description')).not.toHaveText('');
    await page.getByRole('button', { name: vi['SolarInfo.dongThongTin'], exact: true }).click();
  }
});

test('playback pauses, resets, changes speed and releases inactive scene roots', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const mobile = info.project.name === 'mobile';
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await choose(page, mobile, 'supernova');
  await controls(page, mobile, async () => {
    await page.getByRole('button', { name: vi['SolarControls.chayMoPhong'], exact: true }).click();
  });
  const progress = () =>
    page.locator('.phenomena-stage').getAttribute('data-progress').then(Number);
  await expect.poll(progress).toBeGreaterThan(0.025);
  await controls(page, mobile, async () => {
    await page.getByRole('combobox', { name: vi['phen.speed'], exact: true }).selectOption('2');
    await page
      .getByRole('button', { name: vi['SolarControls.tamDungMoPhong'], exact: true })
      .click();
  });
  const paused = await progress();
  await page.waitForTimeout(250);
  expect(await progress()).toBe(paused);
  await controls(page, mobile, async () => {
    await page.getByRole('button', { name: vi['phen.restart'], exact: true }).click();
  });
  expect(await progress()).toBe(0);
  for (let cycle = 0; cycle < 2; cycle++)
    for (const kind of ids) {
      await choose(page, mobile, kind);
      await renderer(page);
      await expect(page.locator('canvas')).toHaveCount(1);
    }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const url = performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .find((n) => n.includes('/@react-three_fiber.js?'))!;
        const fiber = (await import(url)) as typeof import('@react-three/fiber');
        return fiber._roots.size;
      }),
    )
    .toBe(1);
  await expect(page.locator('.phen-fallback')).toHaveCount(0);
});
