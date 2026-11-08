import { useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { createSelectionGesture } from '../lib/selectionGesture';

export function useScenePicking() {
  const gl = useThree((state) => state.gl);
  const connected = useThree((state) => state.events.connected);
  const gesture = useRef(createSelectionGesture());
  useEffect(() => {
    // OrbitControls captures pointers on the connected wrapper, so observe
    // that wrapper rather than just the canvas. These listeners never prevent
    // camera gestures or capture pointers themselves.
    const target = connected || gl.domElement;
    const down = (event: Event) => {
      const e = event as PointerEvent;
      gesture.current.down(e.pointerId, e.clientX, e.clientY, e.button, performance.now());
    };
    const move = (event: Event) => {
      const e = event as PointerEvent;
      gesture.current.move(e.pointerId, e.clientX, e.clientY);
    };
    const up = (event: Event) => {
      const e = event as PointerEvent;
      gesture.current.up(e.pointerId, e.clientX, e.clientY, performance.now());
    };
    const cancel = (event: Event) => gesture.current.cancel((event as PointerEvent).pointerId);
    const wheel = () => gesture.current.wheel();
    target.addEventListener('pointerdown', down, true);
    target.addEventListener('pointermove', move, true);
    target.addEventListener('pointerup', up, true);
    target.addEventListener('pointercancel', cancel, true);
    target.addEventListener('wheel', wheel, { capture: true, passive: true });
    return () => {
      target.removeEventListener('pointerdown', down, true);
      target.removeEventListener('pointermove', move, true);
      target.removeEventListener('pointerup', up, true);
      target.removeEventListener('pointercancel', cancel, true);
      target.removeEventListener('wheel', wheel, true);
    };
  }, [gl, connected]);
  // Pick on a validated pointer release: mobile browsers may suppress the
  // synthesized click after a previous touch drag. Never pick on pointerdown.
  return (event: ThreeEvent<PointerEvent>) =>
    gesture.current.canSelect(event.delta, event.nativeEvent.button, performance.now());
}
