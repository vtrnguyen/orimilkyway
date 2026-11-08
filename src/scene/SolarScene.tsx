import { t, objectName, formatNumber } from '../i18n';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import { Group, Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { getSolarBody, planets, solarBodies, type SolarBody } from '../data/solarSystem';
import {
  advanceSimulation,
  bodyExtent,
  bodyPosition,
  comparisonLayout,
  displayRadius,
  hitRadius,
  orbitalDisplayRadius,
  spinAngle,
} from '../lib/solarSystem';
import { formatValue } from '../lib/astronomy';
import type { ExplorerState } from '../state/useExplorer';
import { BodyModel } from './BodyModel';
import { ContextGuard } from './ContextGuard';
import { useScenePicking } from './useScenePicking';
const INITIAL_CAMERA = {
  position: [0, 38, 55] as [number, number, number],
  fov: 48,
  near: 0.003,
  far: 5000,
};
function OrbitPath({
  radius,
  center = [0, 0, 0],
  highlight = false,
}: {
  radius: number;
  center?: [number, number, number];
  highlight?: boolean;
}) {
  const points = useMemo(
    () =>
      Array.from(
        { length: 193 },
        (_, i) =>
          [
            Math.cos((i / 192) * Math.PI * 2) * radius,
            0,
            -Math.sin((i / 192) * Math.PI * 2) * radius,
          ] as [number, number, number],
      ),
    [radius],
  );
  return (
    <group position={center}>
      <Line
        points={points}
        color={highlight ? '#a99acb' : '#626b8d'}
        lineWidth={highlight ? 1 : 0.6}
        transparent
        opacity={highlight ? 0.65 : 0.27}
      />
    </group>
  );
}
type LabelElements = RefObject<Record<string, HTMLDivElement | null>>;
function SolarWorld({
  state,
  reduced,
  bodies,
  elements,
  clockElement,
  onSelect,
}: {
  state: ExplorerState;
  reduced: boolean;
  bodies: SolarBody[];
  elements: LabelElements;
  clockElement: RefObject<HTMLOutputElement | null>;
  onSelect: (id: string) => void;
}) {
  const canSelect = useScenePicking();
  const clock = useRef(0);
  const lastClockLabel = useRef('');
  const groups = useRef<Record<string, Group | null>>({});
  const spins = useRef<Record<string, Group | null>>({});
  const moonOrbit = useRef<Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera: baseCamera, size } = useThree();
  const camera = baseCamera as PerspectiveCamera;
  const flight = useRef<{
    offset: Vector3;
    target: Vector3;
    overview: boolean;
  } | null>(null);
  const previousTarget = useRef<Vector3 | null>(null);
  const currentTarget = useMemo(() => new Vector3(), []);
  const difference = useMemo(() => new Vector3(), []);
  const projection = useMemo(() => new Vector3(), []);
  const activeBody = getSolarBody(state.selectedId);
  const visibleKey = bodies.map((body) => body.id).join(',');
  useEffect(() => {
    if (!controls.current) return;
    const ctrl = controls.current;
    ctrl.enableDamping = false;
    ctrl.update(); // Clear inertia; never repeat this while following a moving planet.
    const selected =
      activeBody && bodies.some((body) => body.id === activeBody.id) ? activeBody : null;
    const point = selected
      ? bodyPosition(selected, clock.current, state.solarScale, state.compareSun, state.moon)
      : ([0, 0, 0] as [number, number, number]);
    const target = new Vector3(...point);
    let distance = state.solarScale === 'distance' ? 600 : 65;
    if (state.solarScale === 'size') {
      const layout = comparisonLayout(state.compareSun, state.moon);
      const halfWidth = Math.max(
        ...bodies.map((body) => Math.abs(layout[body.id][0]) + bodyExtent(body, 'size')),
      );
      distance = Math.max(
        38,
        (halfWidth /
          Math.max(0.28, (Math.tan((camera.fov * Math.PI) / 360) * size.width) / size.height)) *
          1.3,
      );
    }
    const extent = selected ? bodyExtent(selected, state.solarScale) : 2.6;
    if (selected) distance = Math.max(extent * 4.8, state.solarScale === 'size' ? 1.7 : 2.5);
    const offset = selected
      ? (selected.id === 'saturn' ? new Vector3(0.7, 0.7, -1) : new Vector3(0.45, 0.28, 1))
          .normalize()
          .multiplyScalar(distance)
      : new Vector3(0, state.solarScale === 'size' ? 0.25 : 0.7, 1)
          .normalize()
          .multiplyScalar(distance);
    const limitingFov = Math.atan(
      Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, size.width / size.height),
    );
    ctrl.minDistance = selected
      ? (extent / Math.sin(limitingFov)) * 1.08 + camera.near * 4
      : state.solarScale === 'size'
        ? 0.08
        : 3.3;
    ctrl.maxDistance =
      state.solarScale === 'distance' ? 1600 : state.solarScale === 'size' ? 950 : 180;
    flight.current = { offset, target, overview: !selected };
    previousTarget.current = target.clone();
    if (reduced) {
      camera.position.copy(target).add(offset);
      ctrl.target.copy(target);
      ctrl.update();
      flight.current = null;
    }
    ctrl.enableDamping = !reduced;
    // Pause, speed and unrelated panels intentionally do not reposition the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reset, state.solarScale, visibleKey, reduced]);
  useFrame((_, delta) => {
    const elapsed = document.hidden ? 0 : Math.min(delta, 0.15);
    clock.current = advanceSimulation(
      clock.current,
      elapsed,
      state.moving && !reduced,
      state.speed,
    );
    const clockLabel = t('simulation.clock', {
      days: formatNumber(clock.current, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    });
    if (clockLabel !== lastClockLabel.current && clockElement.current) {
      clockElement.current.textContent = clockLabel;
      lastClockLabel.current = clockLabel;
    }
    for (const body of bodies) {
      const group = groups.current[body.id];
      if (group)
        group.position.set(
          ...bodyPosition(body, clock.current, state.solarScale, state.compareSun, state.moon),
        );
      if (spins.current[body.id])
        spins.current[body.id]!.rotation.y = spinAngle(clock.current, body);
    }
    if (moonOrbit.current)
      moonOrbit.current.position.set(
        ...bodyPosition(getSolarBody('earth')!, clock.current, state.solarScale),
      );
    const ctrl = controls.current;
    if (!ctrl) return;
    if (activeBody && groups.current[activeBody.id])
      currentTarget.copy(groups.current[activeBody.id]!.position);
    else currentTarget.set(0, 0, 0);
    if (flight.current) {
      if (!flight.current.overview) flight.current.target.copy(currentTarget);
      const destination = difference.copy(flight.current.target).add(flight.current.offset);
      const ease = 1 - Math.exp(-delta * 5);
      camera.position.lerp(destination, ease);
      ctrl.target.lerp(flight.current.target, ease);
      if (camera.position.distanceTo(destination) < 0.015) flight.current = null;
    } else if (activeBody && state.follow && previousTarget.current) {
      // Translation only: keep the user's current orbit/zoom offset while tracking.
      difference.copy(currentTarget).sub(previousTarget.current);
      camera.position.add(difference);
      ctrl.target.add(difference);
    }
    previousTarget.current ??= new Vector3();
    previousTarget.current.copy(currentTarget);
    ctrl.update();
    // Collision envelopes include Saturn's rings, and are independent of picking.
    for (const body of bodies) {
      const position = groups.current[body.id]?.position;
      if (!position) continue;
      const min = bodyExtent(body, state.solarScale) * 1.14 + camera.near * 3;
      difference.copy(camera.position).sub(position);
      if (difference.length() < min) {
        if (difference.lengthSq() < 0.000001) difference.set(0, 0, 1);
        camera.position.copy(position).add(difference.setLength(min));
      }
    }
    camera.updateMatrixWorld();
    for (const body of bodies) {
      const element = elements.current[body.id];
      const group = groups.current[body.id];
      if (!element || !group) continue;
      projection.copy(group.position);
      projection.y += displayRadius(body, state.solarScale) * 1.2;
      projection.project(camera);
      const visible = projection.z > -1 && projection.z < 1;
      element.style.visibility = visible ? 'visible' : 'hidden';
      element.style.transform = `translate3d(${((projection.x + 1) * size.width) / 2}px,${((1 - projection.y) * size.height) / 2}px,0) translate(-50%,-100%)`;
      const projectedRadius =
        ((displayRadius(body, state.solarScale) /
          Math.max(0.001, camera.position.distanceTo(group.position))) *
          size.height) /
        (2 * Math.tan((camera.fov * Math.PI) / 360));
      element.dataset.small = String(projectedRadius < 2);
      element.dataset.crowded = String(
        state.solarScale === 'size' &&
          state.compareSun &&
          body.category !== 'Ngôi sao' &&
          state.selectedId !== body.id,
      );
      // A small locator stays visible without increasing the real-radius mesh.
      element.style.display =
        state.labels || state.selectedId === body.id || projectedRadius < 2 ? 'block' : 'none';
    }
  });
  const selectBody = (event: ThreeEvent<PointerEvent>, id: string) => {
    event.stopPropagation();
    if (canSelect(event)) onSelect(id);
  };
  const sizeComparison = state.solarScale === 'size';
  const sunPosition =
    sizeComparison && state.compareSun
      ? bodyPosition(solarBodies[0], 0, 'size', true, state.moon)
      : ([0, 0, 0] as [number, number, number]);
  return (
    <>
      <ambientLight intensity={sizeComparison ? 0.2 : 0.1} />
      {sizeComparison ? (
        <directionalLight position={[-40, 30, 60]} intensity={2.5} />
      ) : (
        <pointLight position={sunPosition} color="#fff6e9" intensity={3} decay={0} />
      )}
      {!sizeComparison &&
        state.orbits &&
        planets.map((body) => (
          <OrbitPath
            key={body.id}
            radius={orbitalDisplayRadius(body, state.solarScale)}
            highlight={body.id === state.selectedId}
          />
        ))}
      {!sizeComparison && state.orbits && state.moon && (
        <group ref={moonOrbit}>
          <OrbitPath radius={orbitalDisplayRadius(getSolarBody('moon')!, state.solarScale)} />
        </group>
      )}
      {state.solarScale === 'distance' &&
        state.grid &&
        [1, 5, 10, 20, 30].map((au) => <OrbitPath key={au} radius={au * 10} highlight />)}
      {bodies.map((body) => (
        <group
          key={body.id}
          ref={(group) => {
            groups.current[body.id] = group;
          }}
        >
          <group rotation={[0, 0, (-(body.obliquityDegrees || 0) * Math.PI) / 180]}>
            <group
              ref={(group) => {
                spins.current[body.id] = group;
              }}
            >
              <BodyModel
                id={body.id}
                radius={displayRadius(body, state.solarScale)}
                high={state.quality === 'high'}
                halo={state.dust}
                comparison={sizeComparison}
              />
            </group>
            {body.id === 'uranus' && state.selectedId === 'uranus' && (
              <Line
                points={[
                  [0, -displayRadius(body, state.solarScale) * 1.65, 0],
                  [0, displayRadius(body, state.solarScale) * 1.65, 0],
                ]}
                color="#d9eee9"
                lineWidth={1}
                transparent
                opacity={0.7}
              />
            )}
          </group>
          <mesh
            name={`pick-${body.id}`}
            onPointerUp={(e) => selectBody(e, body.id)}
            onPointerOver={() => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            <sphereGeometry args={[hitRadius(body, state.solarScale), 20, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping={!reduced}
        dampingFactor={0.08}
        maxPolarAngle={Math.PI * 0.94}
        minPolarAngle={0.06}
        onStart={() => {
          flight.current = null;
        }}
      />
    </>
  );
}
export default function SolarScene({
  state,
  reduced,
  onSelect,
  onFailure,
}: {
  state: ExplorerState;
  reduced: boolean;
  onSelect: (id: string) => void;
  onFailure: () => void;
}) {
  const elements = useRef<Record<string, HTMLDivElement | null>>({});
  const clockElement = useRef<HTMLOutputElement>(null);
  const bodies = solarBodies.filter(
    (body) =>
      (state.moon || body.id !== 'moon') &&
      (state.solarScale !== 'size' || state.compareSun || body.id !== 'sun'),
  );
  useEffect(
    () => () => {
      document.body.style.cursor = '';
    },
    [],
  );
  return (
    <div className="scene-container solar-container">
      <Canvas
        camera={INITIAL_CAMERA}
        dpr={state.quality === 'high' ? [1, 1.7] : 1}
        gl={{ antialias: true, alpha: true }}
      >
        <ContextGuard onFailure={onFailure} />
        <SolarWorld
          state={state}
          reduced={reduced}
          bodies={bodies}
          elements={elements}
          clockElement={clockElement}
          onSelect={onSelect}
        />
      </Canvas>
      <div className="labels-overlay solar-labels">
        {bodies.map((body) => (
          <div
            className={`projected-label ${state.selectedId === body.id ? 'is-selected' : ''}`}
            data-body-id={body.id}
            key={body.id}
            ref={(el) => {
              elements.current[body.id] = el;
            }}
          >
            <button
              className={`scene-label planet-label ${state.selectedId === body.id ? 'selected' : ''}`}
              onClick={() => onSelect(body.id)}
              aria-label={t('SolarScene.chonValue', { value1: objectName(body.id) })}
            >
              <span className="locator-dot" style={{ borderColor: body.color }} />
              <span className="planet-label-text">
                {objectName(body.id)}
                {state.solarScale === 'size' && (
                  <small>Ø {formatValue(body.radiusKm * 2, 'km', 0)}</small>
                )}
              </span>
            </button>
          </div>
        ))}
      </div>
      <div className="simulation-clock">
        <output ref={clockElement} aria-label={t('SolarScene.thoiGianMoPhong')} />
        <span>{t('SolarScene.khoiDauMinhHoaKhongPhaiViTriHien')}</span>
      </div>
    </div>
  );
}
