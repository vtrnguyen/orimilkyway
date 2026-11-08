import { describe, expect, it } from 'vitest';
import { createSelectionGesture } from './selectionGesture';
import { explorerReducer, initialExplorerState } from '../state/useExplorer';

describe('phân biệt nhấp với điều khiển camera', () => {
  it('chọn khi nhấp/chạm ngắn, cho phép độ rung nhỏ', () => {
    const gesture = createSelectionGesture();
    gesture.down(1, 10, 20, 0, 0);
    gesture.move(1, 13, 22);
    gesture.up(1, 13, 22, 180);
    expect(gesture.canSelect(4, 0, 185)).toBe(true);
    expect(gesture.canSelect(4, 2, 185)).toBe(false);
    expect(gesture.canSelect(4, 0, 900)).toBe(false);
  });
  it('kéo ra xa rồi trở về điểm đầu không trở thành click', () => {
    const gesture = createSelectionGesture();
    gesture.down(1, 10, 20, 0, 0);
    gesture.move(1, 80, 100);
    gesture.move(1, 10, 20);
    gesture.up(1, 10, 20, 200);
    expect(gesture.canSelect(0, 0, 205)).toBe(false);
  });
  it('pinch/pan hai ngón, wheel và pointercancel không chọn', () => {
    const gesture = createSelectionGesture();
    gesture.down(1, 10, 20, 0, 0);
    gesture.down(2, 50, 20, 0, 10);
    gesture.up(2, 50, 20, 80);
    gesture.up(1, 10, 20, 90);
    expect(gesture.canSelect(0, 0, 95)).toBe(false);
    gesture.down(3, 10, 20, 0, 100);
    gesture.wheel();
    gesture.up(3, 10, 20, 150);
    expect(gesture.canSelect(0, 0, 155)).toBe(false);
    gesture.down(4, 10, 20, 0, 200);
    gesture.cancel(4);
    expect(gesture.canSelect(0, 0, 205)).toBe(false);
    gesture.down(5, 10, 20, 0, 300);
    gesture.up(5, 10, 20, 350);
    expect(gesture.canSelect(0, 0, 355)).toBe(true);
  });
  it('giữ lâu hoặc kéo bằng chuột phải không chọn', () => {
    const gesture = createSelectionGesture();
    gesture.down(1, 10, 20, 0, 0);
    gesture.up(1, 10, 20, 800);
    expect(gesture.canSelect(0, 0, 805)).toBe(false);
    gesture.down(1, 10, 20, 2, 900);
    gesture.up(1, 10, 20, 950);
    expect(gesture.canSelect(0, 0, 955)).toBe(false);
  });
});

describe('xem gần theo yêu cầu, giữ cảnh hiện tại', () => {
  it('focus dấu Mặt Trời không chuyển cảnh Ngân Hà khi đang xem hồ sơ', () => {
    expect(
      explorerReducer(initialExplorerState, { type: 'focus-current', id: 'sun' }),
    ).toMatchObject({ mode: 'galaxy', selectedId: 'sun', reset: 1 });
    expect(explorerReducer(initialExplorerState, { type: 'focus-current', id: 'earth' })).toBe(
      initialExplorerState,
    );
  });
  it('không focus một đối tượng không tồn tại hoặc chưa được bật trong cảnh', () => {
    const state = { ...initialExplorerState, mode: 'solar' as const };
    expect(explorerReducer(state, { type: 'focus-current', id: 'moon' })).toBe(state);
    expect(explorerReducer(state, { type: 'focus-current', id: 'jupiter' })).toMatchObject({
      mode: 'solar',
      selectedId: 'jupiter',
      reset: 1,
      follow: true,
    });
  });
});
