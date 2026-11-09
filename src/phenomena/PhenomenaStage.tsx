import { Suspense, lazy, useMemo, type MouseEvent } from 'react';
import { Maximize2, Menu, Settings2, X } from 'lucide-react';
import { t, formatNumber } from '../i18n';
import { SceneBoundary } from '../components/SceneBoundary';
import { sceneModel } from './geometry';
import { phenomenonSources } from './catalog';
import { PhenomenaControls } from './PhenomenaControls';
import { EclipseObserver, FallbackDiagram, TideGraph } from './Diagrams';
import type { Simulation } from './state';

const Scene = lazy(() => import('./PhenomenaScene'));
export default function PhenomenaStage({
  simulation,
  reduced,
  quality,
  webgl,
  onFailure,
  immersive,
  onEnter,
  onDrawer,
  controlsOpen,
  onControls,
}: {
  simulation: Simulation;
  reduced: boolean;
  quality: 'low' | 'high';
  webgl: boolean;
  onFailure: () => void;
  immersive: boolean;
  onEnter: (event: MouseEvent<HTMLButtonElement>) => void;
  onDrawer: () => void;
  controlsOpen: boolean;
  onControls: (value: boolean) => void;
}) {
  const { state, dispatch } = simulation,
    kind = state.kind!;
  const model = useMemo(() => sceneModel(state), [state]);
  const select = (id: string) => dispatch({ type: 'select', id });
  const title = t(`phen.name.${kind}`);
  return (
    <main
      className="stage phenomena-stage"
      aria-label={title}
      data-phenomenon={kind}
      data-progress={state.progress}
    >
      <div className="scene-surface">
        {webgl ? (
          <SceneBoundary onFailure={onFailure}>
            <Suspense fallback={<div className="scene-message">{t('App.dangMoMotGocVuTru')}</div>}>
              <Scene
                model={model}
                state={state}
                reduced={reduced}
                quality={quality}
                onSelect={select}
                onFailure={onFailure}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          <FallbackDiagram model={model} state={state} onSelect={select} />
        )}
      </div>
      <div className="stage-heading">
        <span className="eyebrow">{t('phen.navigation')}</span>
        <h1>{title}</h1>
        <p>{t(`phen.intro.${kind}`)}</p>
      </div>
      <button className="mobile-controls" onClick={onDrawer}>
        <Menu size={18} />
        {t('App.khamPhaDetail')}
      </button>
      <button
        className="phen-enter immersive-enter icon-button"
        onClick={onEnter}
        disabled={!webgl}
        aria-label={t('App.xem3dTapTrung')}
        title={t('App.xem3dTapTrung')}
      >
        <Maximize2 size={20} />
      </button>
      {model.eclipse && <EclipseObserver frame={model.eclipse} />}
      {model.tide && <TideGraph model={model} progress={state.progress} />}
      <section className="phen-guide panel" aria-label={t('phen.explanation')}>
        <div className="phen-phase" aria-live="polite">
          <span className="eyebrow">
            {formatNumber(state.progress * 100, { maximumFractionDigits: 0 })}%
          </span>
          <h2>{t(`phen.phase.${model.phase}`)}</h2>
          <p>{t(`phen.${kind}.${model.phase}`)}</p>
        </div>
        <details>
          <summary>{t('phen.legend')}</summary>
          <div className="phen-component-list">
            {model.points.map((point) => (
              <button key={point.id} onClick={() => select(point.id)}>
                <span style={{ background: point.color }} />
                {t(`phen.component.${point.id}.name`)}
              </button>
            ))}
          </div>
        </details>
        <details className="source-details">
          <summary>{t('phen.limitsSources')}</summary>
          <p>{t(`phen.limit.${kind}`)}</p>
          {kind === 'solarEclipse' && <p className="data-note">{t('phen.eyeSafety')}</p>}
          <p>{t('phen.sources')}</p>
          {phenomenonSources[kind].map((source) => (
            <a href={source.url} key={source.url} target="_blank" rel="noreferrer">
              {t(source.label)} ↗
            </a>
          ))}
        </details>
      </section>
      {state.selected && (
        <aside
          className="info-panel panel phen-info"
          aria-label={t('phen.detailsTitle', { name: t(`phen.component.${state.selected}.name`) })}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="panel-top">
            <span className="eyebrow">{t('phen.explanation')}</span>
            <button
              className="icon-button"
              onClick={() => dispatch({ type: 'select', id: null })}
              aria-label={t('SolarInfo.dongThongTin')}
            >
              <X size={18} />
            </button>
          </div>
          <div className="info-body">
            <h2>{t(`phen.component.${state.selected}.name`)}</h2>
            <p className="description">{t(`phen.component.${state.selected}.text`)}</p>
            <p className="data-note">{t(`phen.limit.${kind}`)}</p>
            <div className="source-details">
              <h3>{t('phen.sources')}</h3>
              {phenomenonSources[kind].map((source) => (
                <a href={source.url} key={source.url} target="_blank" rel="noreferrer">
                  {t(source.label)} ↗
                </a>
              ))}
            </div>
          </div>
        </aside>
      )}
      {immersive && (
        <button
          className="phen-controls-toggle icon-button"
          onClick={() => onControls(!controlsOpen)}
          aria-label={t(controlsOpen ? 'phen.closeControls' : 'phen.openControls')}
          title={t('phen.openControls')}
          aria-expanded={controlsOpen}
        >
          <Settings2 size={20} />
        </button>
      )}
      {immersive && controlsOpen && (
        <div className="phen-floating-controls panel">
          <PhenomenaControls
            simulation={simulation}
            reduced={reduced}
            onClose={() => onControls(false)}
          />
        </div>
      )}
    </main>
  );
}
