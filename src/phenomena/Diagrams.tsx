import { useId } from 'react';
import { t, formatNumber } from '../i18n';
import { EARTH_RADIUS, MOON_RADIUS, tidalHeight, type EclipseFrame, type Vec3 } from './model';
import { componentColors, shadowSurface, type SceneModel } from './geometry';
import type { SimulationState } from './state';

export function EclipseObserver({ frame }: { frame: EclipseFrame }) {
  const clip = useId().replaceAll(':', '');
  const solar = frame.kind === 'solarEclipse',
    scale = solar ? 1 : MOON_RADIUS;
  return (
    <div className="phen-observer" data-phase={frame.phase}>
      <h2>{t(solar ? 'phen.sky.solar' : 'phen.sky.lunar')}</h2>
      <svg viewBox="-1.6 -1.6 3.2 3.2" role="img" aria-label={t('phen.observerDiagram')}>
        <defs>
          <clipPath id={clip}>
            <circle r="1" />
          </clipPath>
        </defs>
        <circle r="1" fill={solar ? '#ffcb73' : '#c4c3c9'} />
        <g clipPath={`url(#${clip})`}>
          {solar ? (
            <circle
              cx={frame.skyX}
              cy={-frame.skyY}
              r={frame.moonAngle / frame.sunAngle}
              fill="#080b13"
            />
          ) : (
            <>
              <circle
                cx={-frame.moon[2] / scale}
                cy={frame.moon[1] / scale}
                r={frame.penumbra / scale}
                fill="#686582"
                opacity=".6"
              />
              <circle
                cx={-frame.moon[2] / scale}
                cy={frame.moon[1] / scale}
                r={Math.max(0, frame.umbra) / scale}
                fill="#8a3d2c"
              />
            </>
          )}
        </g>
        <circle r="1" stroke="#d3c6e5" strokeWidth=".015" fill="none" />
      </svg>
      <output aria-live="polite">{t(`phen.phase.${frame.phase}`)}</output>
      <small>
        {t(solar ? 'phen.coverage.solar' : 'phen.coverage.lunar', {
          value: formatNumber(frame.coverage, { style: 'percent', maximumFractionDigits: 1 }),
        })}
      </small>
    </div>
  );
}

export function TideGraph({ model, progress }: { model: SceneModel; progress: number }) {
  const tide = model.tide!;
  const y = (h: number) => 72 - h * 30;
  const path = tide.samples
    .map((height, i) => `${i ? 'L' : 'M'}${20 + (i / 128) * 280},${y(height)}`)
    .join(' ');
  return (
    <figure className="phen-tide-graph" data-height={tide.height}>
      <figcaption>{t('phen.graph.title')}</figcaption>
      <svg viewBox="0 0 320 135" role="img" aria-label={t('phen.graph.aria')}>
        <path d="M20 12V112H300M20 72H300" fill="none" stroke="#687188" strokeWidth=".7" />
        <path d={path} fill="none" stroke="#70d5df" strokeWidth="2" data-testid="tide-curve" />
        <circle cx={20 + progress * 280} cy={y(tide.height)} r="4" fill="#f6cc8c" />
        <text x="20" y="128" fill="#b8bed0" fontSize="10">
          0%
        </text>
        <text x="270" y="128" fill="#b8bed0" fontSize="10">
          100%
        </text>
      </svg>
      <output>
        {t('phen.graph.value', { height: formatNumber(tide.height, { maximumFractionDigits: 3 }) })}
      </output>
    </figure>
  );
}

/** Accessible 2D fallback uses the identical model, not a separate animation. */
export function FallbackDiagram({
  model,
  state,
  onSelect,
}: {
  model: SceneModel;
  state: SimulationState;
  onSelect: (id: string) => void;
}) {
  const project = (v: Vec3) => [v[0], model.tide ? -v[2] : -v[1] - v[2] * 0.55];
  const ocean = model.tide
    ? Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2,
          n: Vec3 = [Math.cos(a), 0, Math.sin(a)],
          r = 1.43 + 0.22 * tidalHeight(n, state.parameters.tidePreset, state.parameters.solarTide);
        return `${i ? 'L' : 'M'}${n[0] * r},${-n[2] * r}`;
      }).join(' ') + 'Z'
    : undefined;
  return (
    <div className="phen-fallback">
      <p>{t('phen.fallback')}</p>
      <div className="phen-component-list">
        {model.points.map((point) => (
          <button key={point.id} onClick={() => onSelect(point.id)}>
            <span style={{ background: componentColors[point.id] }} />
            {t(`phen.component.${point.id}.name`)}
          </button>
        ))}
      </div>
      <svg viewBox="-10 -7 20 14" role="img" aria-label={t('phen.diagram')}>
        {model.eclipse && (
          <>
            {(['penumbra', 'umbra', 'antumbra'] as const).map((zone) => {
              const surface = shadowSurface(model.eclipse!, zone);
              if (!surface) return null;
              const indices = [12, 49 + 12, 49 + 36, 36];
              const path =
                indices
                  .map(
                    (index, i) =>
                      `${i ? 'L' : 'M'}${project([surface[index * 3], surface[index * 3 + 1], surface[index * 3 + 2]]).join(',')}`,
                  )
                  .join(' ') + 'Z';
              return (
                <path
                  key={zone}
                  d={path}
                  fill={componentColors[zone]}
                  opacity={zone === 'penumbra' ? 0.2 : 0.45}
                />
              );
            })}
            <path d="M-8 0H8" stroke="#808ba1" strokeDasharray=".2 .2" strokeWidth=".02" />
          </>
        )}
        {ocean && <path d={ocean} fill="#4080a8" opacity=".65" />}
        {model.sn && state.progress > 0.4 && (
          <circle
            r={model.sn.ejectaRadius}
            fill="none"
            stroke="#f2a479"
            strokeWidth=".4"
            strokeDasharray=".1 .3"
          />
        )}
        {model.kind === 'blackhole' && state.parameters.disk && (
          <ellipse rx="5" ry="2" fill="none" stroke="#d2a36e" strokeWidth=".8" />
        )}
        {model.points
          .filter(
            (point) =>
              ![
                'umbra',
                'penumbra',
                'antumbra',
                'forces',
                'water',
                'light',
                'envelope',
                'shock',
              ].includes(point.id),
          )
          .map((point) => (
            <circle
              key={point.id}
              cx={project(point.position)[0]}
              cy={project(point.position)[1]}
              r={point.radius}
              fill={point.id === 'horizon' ? '#04050a' : point.color}
              stroke={point.color}
              strokeWidth=".05"
            />
          ))}
      </svg>
      <small>
        {model.eclipse || model.tide
          ? t('phen.notToScale', { earth: formatNumber(EARTH_RADIUS) })
          : t(`phen.limit.${model.kind}`)}
      </small>
    </div>
  );
}
