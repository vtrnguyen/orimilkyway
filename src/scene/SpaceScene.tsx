import { t, objectName } from '../i18n';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { mappedStars, stars, starPosition, starDisplayColor } from '../data/stars';
import { BodyModel } from './BodyModel';
import { ContextGuard } from './ContextGuard';
import { seededRandom } from '../lib/astronomy';
import type { ExplorerState } from '../state/useExplorer';
import { useScenePicking } from './useScenePicking';
const INITIAL_CAMERA = {
  position: [0, 66, 90] as [number, number, number],
  fov: 48,
  near: 0.1,
  far: 700,
};
const vertexShader = `
  attribute float aSize;
  varying vec3 vColor;
  uniform float uSize;
  void main() {
    vColor = color;
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uSize * (240.0 / -p.z), 0.8, 38.0);
    gl_Position = projectionMatrix * p;
  }
`;
const fragmentShader = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = pow(1.0 - d * 2.0, 2.6);
    gl_FragColor = vec4(vColor, glow * 0.86);
  }
`;
function Galaxy({ quality, dust }: { quality: ExplorerState['quality']; dust: boolean }) {
  const geometry = useMemo(() => {
    const random = seededRandom(20261108);
    const count = quality === 'high' ? 68000 : 26000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const color = new THREE.Color();
    const warm = new THREE.Color('#ffd5a4');
    const white = new THREE.Color('#fff0e1');
    const purple = new THREE.Color('#a894ef');
    const blue = new THREE.Color('#6b9ad4');
    for (let i = 0; i < count; i++) {
      const isCore = i < count * 0.23;
      let x: number, y: number, z: number, r: number;
      if (isCore) {
        r = Math.pow(random(), 1.8) * 11;
        const theta = random() * Math.PI * 2;
        const phi = Math.acos(2 * random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta) * 1.7;
        y = r * Math.cos(phi) * 0.4;
        z = r * Math.sin(phi) * Math.sin(theta) * 0.7;
        color.copy(warm).lerp(white, random() * 0.7);
      } else if (i < count * 0.39) {
        // A diffuse stellar disk bridges the arms rather than making four isolated spokes.
        r = Math.pow(random(), 1.25) * 49;
        const theta = random() * Math.PI * 2;
        x = Math.cos(theta) * r;
        z = Math.sin(theta) * r;
        y = (random() + random() - 1) * (1.2 - r * 0.015);
        color
          .copy(warm)
          .lerp(purple, Math.min(1, r / 25))
          .multiplyScalar(0.48);
      } else {
        r = 3 + Math.pow(random(), 0.8) * 46;
        const arm = i % 4;
        const theta = (arm * Math.PI) / 2 + Math.log(r / 4) * 1.35;
        const scatter = (random() + random() + random() - 1.5) * (1.1 + r * 0.22);
        const angleScatter = scatter / r;
        x = Math.cos(theta + angleScatter) * r;
        z = Math.sin(theta + angleScatter) * r;
        y = (random() + random() - 1) * (0.3 + r * 0.018);
        color
          .copy(warm)
          .lerp(purple, Math.min(1, r / 24))
          .lerp(blue, random() * 0.65);
        if (random() > 0.93) color.copy(white);
      }
      positions.set([x, y, z], i * 3);
      if (isCore) color.multiplyScalar(0.72);
      colors.set([color.r, color.g, color.b], i * 3);
      sizes[i] = isCore ? 0.45 + random() * 1.1 : 0.3 + Math.pow(random(), 5) * (dust ? 3.4 : 1.5);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    result.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    result.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return result;
  }, [quality, dust]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uSize: { value: dust ? 1.5 : 0.9 } }}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
function BackgroundStars({ quality }: { quality: ExplorerState['quality'] }) {
  const geometry = useMemo(() => {
    const random = seededRandom(317);
    const count = quality === 'high' ? 1800 : 700;
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const b = Math.acos(2 * random() - 1);
      const r = 180 + random() * 100;
      p.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(p, 3));
  }, [quality]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#8f9bbd"
        size={0.32}
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
function Glow({ color, scale = 1 }: { color: string; scale?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.08, color);
    gradient.addColorStop(0.3, color + '65');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, [color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite scale={[scale, scale, scale]}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}
function Rings({ local }: { local: boolean }) {
  const rings = useMemo(
    () =>
      (local ? [5, 10, 15, 20] : [13, 26, 39, 50]).map((r) =>
        Array.from(
          { length: 129 },
          (_, i) =>
            new THREE.Vector3(
              Math.cos((i / 128) * Math.PI * 2) * r,
              -0.7,
              Math.sin((i / 128) * Math.PI * 2) * r,
            ),
        ),
      ),
    [local],
  );
  return (
    <group>
      {rings.map((points, i) => (
        <Line key={i} points={points} color="#586381" lineWidth={0.6} transparent opacity={0.3} />
      ))}
    </group>
  );
}
function Markers({ state, onSelect }: { state: ExplorerState; onSelect: (id: string) => void }) {
  const canSelect = useScenePicking();
  const local = state.mode === 'local';
  return (
    <group>
      {(local ? mappedStars : [stars[0]]).map((star) => {
        const selected = state.selectedId === star.id;
        const position: [number, number, number] = local ? starPosition(star)! : [21, 0.5, 15.3];
        return (
          <group key={star.id} position={position}>
            <Glow
              color={starDisplayColor(star)}
              scale={(local ? (selected ? 2.4 : 1.5) : 2.5) * (state.dust ? 1 : 0.45)}
            />
            {local &&
              selected &&
              (star.id === 'sun' ? (
                <BodyModel
                  id="sun"
                  radius={0.4}
                  high={state.quality === 'high'}
                  halo={state.dust}
                />
              ) : (
                <mesh>
                  <sphereGeometry args={[0.4, 64, 40]} />
                  <meshBasicMaterial color={starDisplayColor(star)} toneMapped={false} />
                </mesh>
              ))}
            <mesh
              name={`pick-${star.id}`}
              onPointerUp={(event: ThreeEvent<PointerEvent>) => {
                event.stopPropagation();
                if (canSelect(event)) onSelect(star.id);
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = '';
              }}
            >
              <sphereGeometry args={[local ? 0.8 : 1.7, 12, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
type ProjectedLabel = {
  id: string;
  point: [number, number, number];
};
function LabelProjector({
  labels,
  elements,
}: {
  labels: ProjectedLabel[];
  elements: RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const label of labels) {
      const element = elements.current[label.id];
      if (!element) continue;
      point.set(...label.point).project(camera);
      element.style.visibility = point.z < 1 && point.z > -1 ? 'visible' : 'hidden';
      element.style.transform = `translate3d(${((point.x + 1) * size.width) / 2}px,${((1 - point.y) * size.height) / 2}px,0) translate(-50%,-50%)`;
    }
  });
  return null;
}
function CameraRig({ state, reduced }: { state: ExplorerState; reduced: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const goal = useRef<{
    camera: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  useEffect(() => {
    if (!controls.current) return;
    const selected = stars.find((s) => s.id === state.selectedId);
    const local = state.mode === 'local';
    const point = selected
      ? local
        ? starPosition(selected)
        : selected.id === 'sun'
          ? ([21, 0.5, 15.3] as [number, number, number])
          : null
      : null;
    // Information-only objects never trigger a fabricated camera destination.
    if (selected && !point) return;
    const target = new THREE.Vector3(...((point || [0, 0, 0]) as [number, number, number]));
    const offset = selected
      ? local
        ? new THREE.Vector3(6, 5, 9)
        : new THREE.Vector3(17, 23, 27)
      : local
        ? new THREE.Vector3(23, 20, 29)
        : new THREE.Vector3(0, 66, 90);
    goal.current = { camera: target.clone().add(offset), target };
    if (reduced || !state.moving) {
      // Consume orbit inertia before setting an exact, repeatable destination.
      controls.current.enableDamping = false;
      controls.current.update();
      camera.position.copy(goal.current.camera);
      controls.current.target.copy(target);
      controls.current.update();
      controls.current.enableDamping = !reduced;
      goal.current = null;
    }
  }, [state.mode, state.selectedId, state.reset, state.moving, reduced, camera]);
  useFrame((_, delta) => {
    if (!goal.current || !controls.current) return;
    const damping = 1 - Math.exp(-delta * 4);
    camera.position.lerp(goal.current.camera, damping);
    controls.current.target.lerp(goal.current.target, damping);
    controls.current.update();
    if (camera.position.distanceTo(goal.current.camera) < 0.02) goal.current = null;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!reduced}
      dampingFactor={0.08}
      minDistance={state.mode === 'local' ? 2 : 12}
      maxDistance={state.mode === 'local' ? 110 : 210}
      maxPolarAngle={Math.PI * 0.89}
      autoRotate={state.moving && !state.selectedId && !reduced}
      autoRotateSpeed={0.14}
      onStart={() => {
        goal.current = null;
      }}
    />
  );
}
export default function SpaceScene({
  state,
  onSelect,
  reduced,
  onFailure,
}: {
  state: ExplorerState;
  onSelect: (id: string) => void;
  reduced: boolean;
  onFailure: () => void;
}) {
  const elements = useRef<Record<string, HTMLDivElement | null>>({});
  const visibleStars = (state.mode === 'local' ? mappedStars : [stars[0]]).filter(
    (star) => state.labels || state.selectedId === star.id,
  );
  const labels: ProjectedLabel[] = visibleStars.map((star) => {
    const p: [number, number, number] =
      state.mode === 'local' ? [...starPosition(star)!] : [21, 0.5, 15.3];
    p[1] += state.mode === 'local' ? 0.65 : 2.5;
    return { id: star.id, point: p };
  });
  if (state.mode === 'galaxy' && state.labels) labels.push({ id: 'core', point: [-4, 0.5, -2] });
  return (
    <div className="scene-container">
      <Canvas
        camera={INITIAL_CAMERA}
        dpr={state.quality === 'high' ? [1, 1.7] : [1, 1]}
        gl={{
          antialias: state.quality === 'high',
          alpha: true,
          powerPreference: 'high-performance',
        }}
        fallback={
          <div className="scene-message">{t('SpaceScene.webglKhongKhaDungBanVanCoTheTim')}</div>
        }
      >
        <ContextGuard onFailure={onFailure} />
        <BackgroundStars quality={state.quality} />
        {state.mode === 'galaxy' && (
          <>
            <Galaxy quality={state.quality} dust={state.dust} />
            <Glow color="#ffd4ad" scale={19} />
          </>
        )}
        {state.grid && <Rings local={state.mode === 'local'} />}
        <Markers state={state} onSelect={onSelect} />
        <CameraRig state={state} reduced={reduced} />
        <LabelProjector labels={labels} elements={elements} />
      </Canvas>
      <div className="labels-overlay">
        {visibleStars.map((star) => (
          <div
            className="projected-label"
            key={star.id}
            ref={(el) => {
              elements.current[star.id] = el;
            }}
          >
            <button
              className={`scene-label ${star.id === 'sun' ? 'solar-label' : ''} ${state.selectedId === star.id ? 'selected' : ''}`}
              onClick={() => onSelect(star.id)}
            >
              <span className="label-dot" style={{ background: starDisplayColor(star) }} />
              {state.mode === 'local' ? objectName(star.id) : t('SpaceScene.heMatTroi')}
              {state.mode === 'galaxy' && (
                <span className="label-caption">{t('SpaceScene.moHeMatTroi')}</span>
              )}
            </button>
          </div>
        ))}
        {state.mode === 'galaxy' && state.labels && (
          <div
            className="projected-label"
            ref={(el) => {
              elements.current.core = el;
            }}
          >
            <div className="core-label">
              {t('SpaceScene.tamNganHa')}
              <span>{t('SpaceScene.sagittariusAHuongTrungTam')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
