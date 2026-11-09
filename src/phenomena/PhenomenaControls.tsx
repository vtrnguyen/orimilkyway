import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { t, formatNumber } from '../i18n';
import type { Parameters } from './model';
import type { Simulation } from './state';
import { stageStops } from './catalog';
import { sceneModel } from './geometry';

export function PhenomenaControls({
  simulation,
  reduced,
  onClose,
  onInspect,
}: {
  simulation: Simulation;
  reduced: boolean;
  onClose?: () => void;
  onInspect?: () => void;
}) {
  const { state, dispatch } = simulation;
  const kind = state.kind!;
  const components = sceneModel(state).points;
  const toggle = (key: keyof Parameters) =>
    dispatch({ type: 'parameter', key, value: !state.parameters[key] });
  const fields: (keyof Parameters)[] =
    kind === 'supernova'
      ? ['cutaway', 'softEffects']
      : kind === 'blackhole'
        ? ['disk', 'lightPaths']
        : kind === 'tides'
          ? ['solarTide', 'forces', 'cutaway']
          : [];
  return (
    <section
      className="phen-controls"
      aria-label={t('phen.controls')}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="panel-top">
        <h2>{t('phen.controls')}</h2>
        {onClose && (
          <button className="icon-button" onClick={onClose} aria-label={t('phen.closeControls')}>
            <X size={18} />
          </button>
        )}
      </div>
      <div className="phen-playback">
        <button
          className="primary-button"
          disabled={reduced}
          onClick={() => dispatch({ type: 'play', playing: !state.playing })}
          aria-label={t(
            state.playing ? 'SolarControls.tamDungMoPhong' : 'SolarControls.chayMoPhong',
          )}
        >
          {state.playing ? <Pause size={16} /> : <Play size={16} />}{' '}
          {t(state.playing ? 'SolarControls.tamDungMoPhong' : 'SolarControls.chayMoPhong')}
        </button>
        <button
          className="icon-button"
          onClick={() => dispatch({ type: 'reset' })}
          aria-label={t('phen.restart')}
          title={t('phen.restart')}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      {reduced && <p className="data-note">{t('phen.reduced')}</p>}
      <label>
        {t('phen.progress')}
        <output>{formatNumber(state.progress * 100, { maximumFractionDigits: 1 })}%</output>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={state.progress}
          aria-label={t('phen.progress')}
          onChange={(e) => dispatch({ type: 'seek', progress: Number(e.target.value) })}
        />
      </label>
      <div className="phen-steps" role="group" aria-label={t('phen.steps')}>
        {stageStops[kind].map((p, i) => (
          <button
            key={p}
            title={t('phen.step', { step: formatNumber(i + 1) })}
            aria-label={t('phen.step', { step: formatNumber(i + 1) })}
            onClick={() => dispatch({ type: 'seek', progress: p })}
          >
            {formatNumber(i + 1)}
          </button>
        ))}
      </div>
      <label>
        {t('SolarControls.tocDo')}
        <select
          aria-label={t('phen.speed')}
          value={state.speed}
          onChange={(e) => dispatch({ type: 'speed', speed: Number(e.target.value) })}
        >
          {[0.25, 1, 2].map((value) => (
            <option value={value} key={value}>
              {t('phen.speedValue', { value: formatNumber(value) })}
            </option>
          ))}
        </select>
      </label>
      {(kind === 'solarEclipse' || kind === 'lunarEclipse') && (
        <label>
          {t('phen.preset')}
          <select
            aria-label={t('phen.preset')}
            value={
              kind === 'solarEclipse' ? state.parameters.solarPreset : state.parameters.lunarPreset
            }
            onChange={(e) =>
              dispatch({
                type: 'parameter',
                key: kind === 'solarEclipse' ? 'solarPreset' : 'lunarPreset',
                value: e.target.value as Parameters['solarPreset'] | Parameters['lunarPreset'],
              })
            }
          >
            {(kind === 'solarEclipse'
              ? ['partial', 'total', 'annular']
              : ['penumbral', 'partial', 'total']
            ).map((value) => (
              <option key={value} value={value}>
                {t(`phen.phase.${value}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === 'tides' && (
        <label>
          {t('phen.preset')}
          <select
            aria-label={t('phen.preset')}
            value={state.parameters.tidePreset}
            onChange={(e) =>
              dispatch({
                type: 'parameter',
                key: 'tidePreset',
                value: e.target.value as Parameters['tidePreset'],
              })
            }
          >
            {['spring', 'neap'].map((value) => (
              <option value={value} key={value}>
                {t(`phen.phase.${value}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      {fields.map((field) => (
        <label className="solar-checkbox" key={field}>
          <input
            type="checkbox"
            checked={Boolean(state.parameters[field])}
            onChange={() => toggle(field)}
          />
          {t(`phen.parameter.${field}`)}
        </label>
      ))}
      <label>
        {t('phen.view')}
        <select
          aria-label={t('phen.view')}
          value={state.view}
          onChange={(e) => dispatch({ type: 'view', view: e.target.value as typeof state.view })}
        >
          <option value="overview">{t('phen.view.overview')}</option>
          <option value="top">{t('phen.view.top')}</option>
          {(kind === 'solarEclipse' || kind === 'lunarEclipse') && (
            <option value="observer">{t('phen.view.observer')}</option>
          )}
        </select>
      </label>
      <label>
        {t('phen.chooseComponent')}
        <select
          aria-label={t('phen.chooseComponent')}
          value={state.selected ?? ''}
          onChange={(event) => {
            dispatch({ type: 'select', id: event.target.value || null });
            onInspect?.();
          }}
        >
          <option value="">{t('phen.choosePrompt')}</option>
          {state.selected && !components.some((point) => point.id === state.selected) && (
            <option value={state.selected}>{t(`phen.component.${state.selected}.name`)}</option>
          )}
          {components.map((point) => (
            <option value={point.id} key={point.id}>
              {t(`phen.component.${point.id}.name`)}
            </option>
          ))}
        </select>
      </label>
      <button className="text-button" onClick={() => dispatch({ type: 'view', view: 'overview' })}>
        {t('App.datLaiGocNhin')}
      </button>
    </section>
  );
}
