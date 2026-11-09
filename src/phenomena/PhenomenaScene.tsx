import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import { BodyModel } from '../scene/BodyModel';
import { ContextGuard } from '../scene/ContextGuard';
import { useScenePicking } from '../scene/useScenePicking';
import { seededRandom } from '../lib/astronomy';
import { t } from '../i18n';
import {
  blackHoleMatterAt,
  tidalHeight,
  tidalForce,
  unit,
  type EclipseFrame,
  type Vec3,
} from './model';
import {
  eclipseDisplay,
  shadowSurface,
  componentColors,
  SHADOW_SCALE,
  type SceneModel,
  type ShadowZone,
} from './geometry';
import type { SimulationState } from './state';

type SelectableProps = { id: string; position?: Vec3; children: ReactNode };
type Selector = (props: SelectableProps) => ReactNode;
const PickingContext = createContext<
  ((event: ThreeEvent<PointerEvent>, id: string) => void) | null
>(null);
function Selectable({ id, position, children }: SelectableProps) {
  const pick = useContext(PickingContext)!;
  return (
    <group
      name={`phen-component-${id}`}
      position={position}
      onPointerUp={(event) => pick(event, id)}
    >
      {children}
    </group>
  );
}

function Ejecta({ radius, count }: { radius: number; count: number }) {
  const geometry = useMemo(() => {
    const random = seededRandom(915),
      points = new Float32Array(count * 3),
      colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const z = random() * 2 - 1,
        angle = random() * Math.PI * 2,
        r = 0.85 + random() * 0.3,
        equator = Math.sqrt(1 - z * z);
      points.set([equator * Math.cos(angle) * r, z * r, equator * Math.sin(angle) * r], i * 3);
      colors.set(i % 5 === 0 ? [0.5, 0.72, 1] : [1, 0.44 + random() * 0.32, 0.22], i * 3);
    }
    return new THREE.BufferGeometry()
      .setAttribute('position', new THREE.BufferAttribute(points, 3))
      .setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points scale={radius} name="phen-ejecta">
      <primitive object={geometry} attach="geometry" />
      <pointsMaterial vertexColors size={0.09} transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

function Supernova({
  model,
  state,
  low,
  Select,
}: {
  model: SceneModel;
  state: SimulationState;
  low: boolean;
  Select: Selector;
}) {
  const sn = model.sn!;
  return (
    <>
      <Select id={sn.exploded ? 'neutron' : 'core'}>
        <mesh scale={sn.coreRadius}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshBasicMaterial color={sn.exploded ? '#a7d9ff' : '#ffe3a0'} />
        </mesh>
      </Select>
      {!sn.exploded ? (
        <Select id="envelope">
          {[1.1, 1.6, 2.15].map((radius, i) => (
            <mesh key={radius} scale={radius}>
              <sphereGeometry
                args={[
                  1,
                  low ? 32 : 64,
                  32,
                  state.parameters.cutaway ? Math.PI : 0,
                  state.parameters.cutaway ? Math.PI * 1.5 : Math.PI * 2,
                ]}
              />
              <meshBasicMaterial
                color={['#cf6556', '#f9ae62', '#ee8553'][i]}
                side={THREE.DoubleSide}
                transparent
                opacity={state.parameters.cutaway ? 0.72 : 1}
              />
            </mesh>
          ))}
        </Select>
      ) : (
        <Select id="envelope">
          <Ejecta radius={sn.ejectaRadius} count={low ? 1000 : 2600} />
        </Select>
      )}
      {sn.exploded && state.progress < 0.78 && (
        <Select id="shock">
          <mesh scale={sn.shockRadius}>
            <sphereGeometry args={[1, low ? 24 : 48, 24]} />
            <meshBasicMaterial
              color="#f2c483"
              wireframe
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
        </Select>
      )}
      {sn.exploded && (
        <mesh scale={sn.ejectaRadius * 1.02}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshBasicMaterial
            color="#ffd29e"
            transparent
            opacity={sn.luminosity * (low ? 0.025 : 0.1)}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </>
  );
}

function OrbitingMatter({ progress, low }: { progress: number; low: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null),
    count = low ? 28 : 96;
  const transform = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const positions = blackHoleMatterAt(progress, count);
    for (let i = 0; i < count; i++) {
      const position = positions[i];
      transform.position.set(...position);
      transform.updateMatrix();
      mesh.current?.setMatrixAt(i, transform.matrix);
    }
    if (mesh.current) {
      mesh.current.instanceMatrix.needsUpdate = true;
      mesh.current.computeBoundingSphere();
    }
  }, [progress, count, transform]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.075, 8, 6]} />
      <meshBasicMaterial color="#ffe0a1" />
    </instancedMesh>
  );
}
function BlackHole({
  state,
  low,
  Select,
}: {
  state: SimulationState;
  low: boolean;
  Select: Selector;
}) {
  const paths = useMemo(
    () =>
      [-1, 1].map((sign) =>
        Array.from({ length: 65 }, (_, i) => {
          const x = -9 + (i / 64) * 18;
          return [x, 0.35, sign * (3.8 - 0.14 * (x + Math.sqrt(x * x + 3)))] as Vec3;
        }),
      ),
    [],
  );
  return (
    <>
      <Select id="horizon">
        <mesh>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial color="#010208" />
        </mesh>
        <mesh scale={1.01}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#83bfe1" wireframe transparent opacity={0.14} />
        </mesh>
      </Select>
      {state.parameters.disk && (
        <Select id="disk">
          <group rotation={[-Math.PI / 2, 0, 0]}>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh key={i}>
                <ringGeometry args={[3 + i * 0.24, 3.17 + i * 0.24, low ? 64 : 128]} />
                <meshBasicMaterial
                  color={i % 2 ? '#ad6948' : '#f1b675'}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            ))}
          </group>
        </Select>
      )}
      <Select id="matter">
        <OrbitingMatter progress={state.progress} low={low} />
      </Select>
      {state.parameters.lightPaths && (
        <Select id="light">
          {paths.map((points, i) => (
            <Line
              key={i}
              points={points}
              color="#a9dcff"
              dashed
              dashSize={0.2}
              gapSize={0.12}
              lineWidth={1.5}
            />
          ))}
        </Select>
      )}
    </>
  );
}

function Shadow({ frame, zone }: { frame: EclipseFrame; zone: ShadowZone }) {
  const surface = shadowSurface(frame, zone);
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry(),
      indexes: number[] = [];
    result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(49 * 2 * 3), 3));
    for (let i = 0; i < 48; i++) indexes.push(i, i + 1, i + 49, i + 1, i + 50, i + 49);
    result.setIndex(indexes);
    return result;
  }, []);
  useLayoutEffect(() => {
    if (!surface) return;
    (geometry.attributes.position as THREE.BufferAttribute).array.set(surface);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
  }, [geometry, surface]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!surface) return null;
  return (
    <mesh>
      <primitive attach="geometry" object={geometry} />
      <meshBasicMaterial
        color={componentColors[zone]}
        transparent
        opacity={zone === 'penumbra' ? 0.045 : 0.16}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
const moonVertex = `varying vec3 world; varying vec3 normalWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.0);world=w.xyz;normalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
const moonFragment = `varying vec3 world; varying vec3 normalWorld; uniform float umbra; uniform float penumbra;
void main(){float r=length(world.yz);float u=1.0-smoothstep(umbra-.015,umbra+.015,r);float p=1.0-smoothstep(penumbra-.02,penumbra+.02,r);float light=.18+.82*max(dot(normalWorld,vec3(-1.,0.,0.)),0.);vec3 grey=vec3(.69,.68,.7)*light;vec3 color=mix(grey,grey*.55,p);color=mix(color,vec3(.35,.075,.035)*light,u);gl_FragColor=vec4(color,1.);}`;
function EclipsedMoon({ frame }: { frame: EclipseFrame }) {
  const uniforms = useMemo(() => ({ umbra: { value: 0 }, penumbra: { value: 0 } }), []);
  uniforms.umbra.value = Math.max(0, frame.umbra) * SHADOW_SCALE;
  uniforms.penumbra.value = frame.penumbra * SHADOW_SCALE;
  return (
    <mesh>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial uniforms={uniforms} vertexShader={moonVertex} fragmentShader={moonFragment} />
    </mesh>
  );
}
function Eclipse({ model, low, Select }: { model: SceneModel; low: boolean; Select: Selector }) {
  const frame = model.eclipse!,
    moon = model.points.find((p) => p.id === 'moon')!;
  const alignment = useMemo(
    () =>
      [
        eclipseDisplay(frame, frame.sun),
        eclipseDisplay(frame, frame.moon),
        eclipseDisplay(frame, frame.earth),
      ].sort((a, b) => a[0] - b[0]),
    [frame.kind, frame.moon[0], frame.moon[1], frame.moon[2]],
  );
  const behind = frame.shadowEnd,
    ratio = 1 + behind / frame.sourceDistance;
  const y = frame.moon[1] * ratio * SHADOW_SCALE,
    z = frame.moon[2] * ratio * SHADOW_SCALE;
  return (
    <>
      <ambientLight intensity={0.18} />
      <pointLight position={[-8, 0, 0]} intensity={3} decay={0} />
      <Select id="sun" position={eclipseDisplay(frame, frame.sun)}>
        <BodyModel id="sun" radius={2} high={!low} halo={false} />
      </Select>
      <Select id="earth" position={eclipseDisplay(frame, frame.earth)}>
        <BodyModel id="earth" radius={1.2} high={!low} halo={false} />
      </Select>
      <Select id="moon" position={moon.position}>
        {frame.kind === 'solarEclipse' ? (
          <BodyModel id="moon" radius={moon.radius} high={!low} halo={false} />
        ) : (
          <group scale={moon.radius}>
            <EclipsedMoon frame={frame} />
          </group>
        )}
      </Select>
      {(['penumbra', 'umbra', 'antumbra'] as const).map((zone) => (
        <Select key={zone} id={zone}>
          <Shadow frame={frame} zone={zone} />
        </Select>
      ))}
      {frame.kind === 'solarEclipse' && y * y + z * z < 1.2 ** 2 && (
        <group
          position={[5 - Math.sqrt(1.44 - y * y - z * z) - 0.015, y, z]}
          rotation={[0, -Math.PI / 2, 0]}
        >
          <mesh>
            <circleGeometry args={[frame.penumbra * SHADOW_SCALE, 48]} />
            <meshBasicMaterial
              color="#20182e"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <circleGeometry args={[Math.abs(frame.umbra) * SHADOW_SCALE, 32]} />
            <meshBasicMaterial
              color={frame.umbra > 0 ? '#100c1e' : '#b074b4'}
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
      <Select id="observer" position={model.points.find((p) => p.id === 'observer')!.position}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshBasicMaterial color="#70e6c6" depthTest={false} />
        </mesh>
      </Select>
      <Line
        points={alignment}
        color="#a6a7bd"
        transparent
        opacity={0.2}
        dashed
        dashSize={0.18}
        gapSize={0.15}
      />
    </>
  );
}

function Ocean({ state, low }: { state: SimulationState; low: boolean }) {
  const geometry = useMemo(
    () =>
      new THREE.SphereGeometry(
        1,
        low ? 40 : 80,
        low ? 24 : 48,
        0,
        state.parameters.cutaway ? Math.PI * 1.5 : Math.PI * 2,
      ),
    [low, state.parameters.cutaway],
  );
  const original = useMemo(() => new Float32Array(geometry.attributes.position.array), [geometry]);
  useLayoutEffect(() => {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const n = unit([original[i * 3], original[i * 3 + 1], original[i * 3 + 2]]);
      const r =
        1.43 + 0.22 * tidalHeight(n, state.parameters.tidePreset, state.parameters.solarTide);
      position.setXYZ(i, n[0] * r, n[1] * r, n[2] * r);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }, [geometry, original, state.parameters.tidePreset, state.parameters.solarTide]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial
        color="#63b4d7"
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
function Tides({
  model,
  state,
  low,
  Select,
}: {
  model: SceneModel;
  state: SimulationState;
  low: boolean;
  Select: Selector;
}) {
  const tide = model.tide!;
  const arrows = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2,
          n: Vec3 = [Math.cos(angle), 0, Math.sin(angle)],
          force = tidalForce(n, state.parameters.tidePreset, state.parameters.solarTide),
          r = Math.hypot(...force);
        const direction = unit(force),
          end = direction.map((v) => v * r * 0.35) as Vec3;
        return {
          origin: n.map((v) => v * 1.75) as Vec3,
          direction,
          end,
          points: [[0, 0, 0] as Vec3, end],
        };
      }),
    [state.parameters.tidePreset, state.parameters.solarTide],
  );
  const alignment = useMemo(
    () =>
      [
        [-6.5, 0, 0],
        [0, 0, 0],
        state.parameters.tidePreset === 'spring' ? [5.8, 0, 0] : [0, 0, 5.8],
      ] as Vec3[],
    [state.parameters.tidePreset],
  );
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-6, 4, 3]} intensity={2} />
      <Select id="earth">
        <group rotation={[0, -tide.angle, 0]}>
          <BodyModel id="earth" radius={1.14} high={!low} halo={false} />
        </group>
      </Select>
      <Select id="water">
        <Ocean state={state} low={low} />
      </Select>
      <Select id="sun" position={[-6.5, 0, 0]}>
        <BodyModel id="sun" radius={0.9} high={!low} halo={false} />
      </Select>
      <Select
        id="moon"
        position={state.parameters.tidePreset === 'spring' ? [5.8, 0, 0] : [0, 0, 5.8]}
      >
        <BodyModel id="moon" radius={0.48} high={!low} halo={false} />
      </Select>
      <Select id="observer" position={model.points.find((p) => p.id === 'observer')!.position}>
        <mesh>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color="#70e6c6" depthTest={false} />
        </mesh>
      </Select>
      {state.parameters.forces && (
        <Select id="forces">
          {arrows.map((arrow, i) => (
            <group key={i} position={arrow.origin}>
              <Line points={arrow.points} color="#eaa581" lineWidth={2} />
              <mesh
                position={arrow.end}
                quaternion={new THREE.Quaternion().setFromUnitVectors(
                  new THREE.Vector3(0, 1, 0),
                  new THREE.Vector3(...arrow.direction),
                )}
              >
                <coneGeometry args={[0.07, 0.18, 8]} />
                <meshBasicMaterial color="#eaa581" />
              </mesh>
            </group>
          ))}
        </Select>
      )}
      <Line points={alignment} color="#818aa1" dashed dashSize={0.2} gapSize={0.15} />
    </>
  );
}

function Camera({ state, reduced }: { state: SimulationState; reduced: boolean }) {
  const { camera, size } = useThree(),
    controls = useRef<Controls>(null);
  const fit = useRef<number | null>(null);
  useEffect(() => {
    fit.current ??= Math.max(
      25,
      12 / (Math.tan((48 * Math.PI) / 360) * Math.min(1, size.width / size.height)),
    );
    const ctrl = controls.current;
    if (!ctrl) return;
    const distance = fit.current;
    ctrl.enableDamping = false;
    ctrl.update();
    ctrl.target.set(0, 0, 0);
    if (state.view === 'top') camera.position.set(0, distance, 0.01);
    else if (state.view === 'observer') {
      camera.position.set(state.kind === 'solarEclipse' ? 3.5 : -0.4, 1.4, 2);
      ctrl.target.set(state.kind === 'solarEclipse' ? -4 : 5, 0, 0);
    } else camera.position.set(distance * 0.22, distance * 0.35, distance);
    ctrl.update();
    ctrl.enableDamping = !reduced;
    // Fit once; language, progress, selection and immersive layout never reset a camera.
  }, [camera, state.view, state.viewRevision, reduced]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!reduced}
      dampingFactor={0.1}
      minDistance={2.2}
      maxDistance={150}
      maxPolarAngle={Math.PI * 0.94}
    />
  );
}
function World({
  model,
  state,
  low,
  reduced,
  onSelect,
  elements,
}: {
  model: SceneModel;
  state: SimulationState;
  low: boolean;
  reduced: boolean;
  onSelect: (id: string) => void;
  elements: RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const canSelect = useScenePicking(),
    { camera, size } = useThree();
  const vector = useMemo(() => new THREE.Vector3(), []);
  const select = (event: ThreeEvent<PointerEvent>, id: string) => {
    const transparent = [
      'umbra',
      'penumbra',
      'antumbra',
      'shock',
      'water',
      ...(model.sn?.exploded ? ['envelope'] : []),
    ];
    // Transparent teaching volumes must not consume a click on a visible body
    // behind them (especially the Moon inside Earth's shadow).
    if (
      transparent.includes(id) &&
      event.intersections.some((hit) => {
        for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
          if (object.name.startsWith('phen-component-')) {
            const target = object.name.slice('phen-component-'.length);
            return !transparent.includes(target) && target !== 'light';
          }
        }
        return false;
      })
    )
      return;
    event.stopPropagation();
    if (canSelect(event)) onSelect(id);
  };
  const Select = Selectable;
  useFrame(() => {
    const occupied: { left: number; top: number; width: number; height: number }[] = [];
    // Measure first, then write positions, avoiding interleaved forced layouts.
    const labels = model.points.map((point) => ({
      point,
      element: elements.current[point.id],
      width: elements.current[point.id]?.offsetWidth ?? 0,
      height: elements.current[point.id]?.offsetHeight ?? 0,
    }));
    for (const { point, element, width, height } of labels) {
      if (!element || !width) continue;
      vector
        .set(point.position[0], point.position[1] + point.radius + 0.24, point.position[2])
        .project(camera);
      element.style.visibility =
        vector.z > -1 && vector.z < 1 && Math.abs(vector.x) < 1.2 ? 'visible' : 'hidden';
      const left = Math.max(
        8,
        Math.min(size.width - width - 8, ((vector.x + 1) * size.width) / 2 - width / 2),
      );
      const base = ((1 - vector.y) * size.height) / 2 - height;
      let top = Math.max(8, Math.min(size.height - height - 8, base));
      for (let attempt = 0; attempt < 24; attempt++) {
        const offset =
          attempt === 0 ? 0 : Math.ceil(attempt / 2) * (height + 6) * (attempt % 2 ? -1 : 1);
        const candidate = Math.max(8, Math.min(size.height - height - 8, base + offset));
        if (
          !occupied.some(
            (box) =>
              left < box.left + box.width + 5 &&
              left + width + 5 > box.left &&
              candidate < box.top + box.height + 5 &&
              candidate + height + 5 > box.top,
          )
        ) {
          top = candidate;
          break;
        }
      }
      occupied.push({ left, top, width, height });
      element.style.transform = `translate3d(${left}px,${top}px,0)`;
    }
  });
  const props = { model, state, low, Select };
  return (
    <PickingContext.Provider value={select}>
      <color attach="background" args={['#080b13']} />
      {model.kind === 'supernova' ? (
        <Supernova {...props} />
      ) : model.kind === 'blackhole' ? (
        <BlackHole {...props} />
      ) : model.eclipse ? (
        <Eclipse {...props} />
      ) : (
        <Tides {...props} />
      )}
      <Camera state={state} reduced={reduced} />
    </PickingContext.Provider>
  );
}
const INITIAL_CAMERA = { position: [0, 12, 32] as Vec3, fov: 48, near: 0.03, far: 1000 };
export default function PhenomenaScene({
  model,
  state,
  quality,
  reduced,
  onSelect,
  onFailure,
}: {
  model: SceneModel;
  state: SimulationState;
  quality: 'low' | 'high';
  reduced: boolean;
  onSelect: (id: string) => void;
  onFailure: () => void;
}) {
  const elements = useRef<Record<string, HTMLDivElement | null>>({}),
    low =
      quality === 'low' || reduced || (model.kind === 'supernova' && state.parameters.softEffects);
  return (
    <div className="scene-container phen-scene">
      <Canvas
        camera={INITIAL_CAMERA}
        dpr={quality === 'low' ? 1 : [1, 1.7]}
        gl={{ antialias: quality === 'high' }}
      >
        <ContextGuard onFailure={onFailure} />
        <World
          model={model}
          state={state}
          low={low}
          reduced={reduced}
          onSelect={onSelect}
          elements={elements}
        />
      </Canvas>
      <div className="labels-overlay phen-labels">
        {model.points.map((point) => (
          <div
            key={point.id}
            ref={(el) => {
              elements.current[point.id] = el;
            }}
            className="projected-label"
            data-component={point.id}
          >
            <button
              className="scene-label"
              style={{ borderColor: point.color }}
              onClick={() => onSelect(point.id)}
            >
              {t(`phen.component.${point.id}.name`)}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
