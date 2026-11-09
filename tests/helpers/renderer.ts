import { expect, type Page } from '@playwright/test';

// Read the renderer in browser QA only; no production debug hooks/state changes.
export async function renderer(page: Page) {
  const url = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((name) => name.includes('/@react-three_fiber.js?')),
  );
  if (!url) throw new Error('React Three Fiber has not loaded');
  // A canvas element can be visible before its asynchronous R3F root and
  // controls are ready, particularly just after switching scenes on mobile.
  const read = () =>
    page.evaluate(async (moduleUrl) => {
      const fiber = (await import(moduleUrl)) as typeof import('@react-three/fiber');
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const canvas = document.querySelector('canvas');
      const state = canvas ? fiber._roots.get(canvas)?.store.getState() : undefined;
      if (
        !canvas ||
        !state?.internal.active ||
        !(state.controls as import('three-stdlib').OrbitControls | null)?.target
      )
        return false;
      const camera = state.camera as import('three').PerspectiveCamera;
      const controls = state.controls as import('three-stdlib').OrbitControls;
      const geometries: string[] = [];
      state.scene.traverse((object) => {
        const geometry = (object as import('three').Mesh).geometry;
        if (geometry) geometries.push(geometry.uuid);
      });
      return {
        cameraId: camera.uuid,
        sceneId: state.scene.uuid,
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        zoom: camera.zoom,
        fov: camera.fov,
        aspect: camera.aspect,
        target: controls.target.toArray(),
        size: [state.size.width, state.size.height],
        buffer: [canvas.width, canvas.height],
        dpr: state.gl.getPixelRatio(),
        geometries: geometries.sort(),
      };
    }, url);
  let result = await read();
  if (!result)
    await expect
      .poll(async () => {
        result = await read();
        return !!result;
      })
      .toBe(true);
  return result as Exclude<Awaited<ReturnType<typeof read>>, false>;
}
