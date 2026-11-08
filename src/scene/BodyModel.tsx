import { useEffect, useMemo } from 'react';
import { BackSide, DoubleSide } from 'three';
import { createBodySurface } from './bodySurfaces';

/** Surface radius, halo and picking envelope are deliberately separate. */
export function BodyModel({
  id,
  radius,
  high,
  halo = true,
  comparison = false,
}: {
  id: string;
  radius: number;
  high: boolean;
  halo?: boolean;
  comparison?: boolean;
}) {
  const { texture, bump } = useMemo(() => createBodySurface(id, high), [id, high]);
  const clouds = useMemo(
    () => (id === 'earth' ? createBodySurface(id, high, true).texture : null),
    [id, high],
  );
  useEffect(
    () => () => {
      texture.dispose();
      bump?.dispose();
      clouds?.dispose();
    },
    [texture, bump, clouds],
  );
  const segments = high ? 96 : 56;
  return (
    <group>
      <mesh name={`surface-${id}`}>
        <sphereGeometry args={[radius, segments, segments / 2]} />
        {id === 'sun' ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            map={texture}
            bumpMap={bump}
            bumpScale={radius * 0.017}
            roughness={id === 'earth' ? 0.72 : 0.95}
            metalness={0}
            emissive="#000000"
          />
        )}
      </mesh>
      {clouds && !comparison && (
        <mesh scale={1.008}>
          <sphereGeometry args={[radius, segments, segments / 2]} />
          <meshStandardMaterial map={clouds} transparent depthWrite={false} roughness={1} />
        </mesh>
      )}
      {id === 'earth' && !comparison && (
        <mesh scale={1.018}>
          <sphereGeometry args={[radius, segments, segments / 2]} />
          <meshBasicMaterial
            color="#82b8dd"
            side={BackSide}
            transparent
            opacity={0.075}
            depthWrite={false}
          />
        </mesh>
      )}
      {id === 'sun' && halo && !comparison && (
        <mesh scale={1.08}>
          <sphereGeometry args={[radius, segments, segments / 2]} />
          <meshBasicMaterial
            color="#ffd396"
            side={BackSide}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      )}
      {id === 'saturn' && (
        <group name="saturn-equatorial-rings" rotation={[-Math.PI / 2, 0, 0]}>
          {[
            [1.25, 1.72],
            [1.85, 2.35],
          ].map(([inner, outer], band) => (
            <mesh key={inner} name={`saturn-ring-${band}`}>
              <ringGeometry args={[radius * inner, radius * outer, 160]} />
              <meshStandardMaterial
                color={band === 0 ? '#b9a683' : '#cbbca2'}
                roughness={1}
                side={DoubleSide}
                transparent
                opacity={band === 0 ? 0.83 : 0.64}
              />
            </mesh>
          ))}
          {[1.37, 1.49, 1.59, 1.96, 2.08, 2.22].map((r) => (
            <mesh key={r}>
              <ringGeometry args={[radius * r, radius * (r + 0.018), 160]} />
              <meshStandardMaterial
                color="#8b7b64"
                roughness={1}
                side={DoubleSide}
                transparent
                opacity={0.55}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
