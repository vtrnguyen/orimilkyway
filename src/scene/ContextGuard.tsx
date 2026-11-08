import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** R3F intentionally loses the old WebGL context when disposing a Canvas.
 * Only a loss in a live, connected canvas should switch the app to 2D. */
export function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    let mounted = true;
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      if (!mounted || !canvas.isConnected) return;
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => {
      mounted = false;
      canvas.removeEventListener('webglcontextlost', lost);
    };
  }, [gl, onFailure]);
  return null;
}
