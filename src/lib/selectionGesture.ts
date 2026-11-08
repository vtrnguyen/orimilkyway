/** Track the whole gesture, including returning to the starting point. A
 * synthesized click after pan/pinch/wheel must not become a selection. */
export function createSelectionGesture() {
  const pointers = new Map<number, { x: number; y: number; time: number }>();
  let cancelled = false;
  let releasedAt = -Infinity;
  let eligible = false;
  return {
    down(id: number, x: number, y: number, button: number, time: number) {
      if (!pointers.size) cancelled = false;
      eligible = false;
      if (pointers.size || button !== 0) cancelled = true;
      pointers.set(id, { x, y, time });
    },
    move(id: number, x: number, y: number) {
      const start = pointers.get(id);
      if (start && Math.hypot(x - start.x, y - start.y) > 8) cancelled = true;
    },
    up(id: number, x: number, y: number, time: number) {
      const start = pointers.get(id);
      eligible =
        !!start &&
        !cancelled &&
        pointers.size === 1 &&
        time - start.time <= 600 &&
        Math.hypot(x - start.x, y - start.y) <= 8;
      releasedAt = time;
      pointers.delete(id);
    },
    cancel(id: number) {
      pointers.delete(id);
      cancelled = true;
      eligible = false;
    },
    wheel() {
      cancelled = true;
      eligible = false;
    },
    canSelect(delta: number, button: number, time: number) {
      return eligible && button === 0 && delta <= 8 && time - releasedAt <= 700;
    },
  };
}
