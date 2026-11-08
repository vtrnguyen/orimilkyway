import { t, objectName, formatNumber } from '../i18n';
import type { Dispatch } from 'react';
import { ChevronRight, Orbit, Pause, Play } from 'lucide-react';
import { solarBodies } from '../data/solarSystem';
import { scaleNotes, type SolarScale } from '../lib/solarSystem';
import type { ExplorerAction, ExplorerState } from '../state/useExplorer';
export function SolarControls({
  state,
  dispatch,
  onSelect,
  reduced,
}: {
  state: ExplorerState;
  dispatch: Dispatch<ExplorerAction>;
  onSelect: (id: string) => void;
  reduced: boolean;
}) {
  const scaleOptions: [SolarScale, string, string][] = [
    ['explore', t('SolarControls.khamPha'), t('SolarControls.kichThuocKhoangCachDieuChinh')],
    ['size', t('SolarControls.soSanhKichThuocThat'), t('SolarControls.chungTyLeBanKinhTuyenTinh')],
    [
      'distance',
      t('SolarControls.khoangCachQuyDaoThat'),
      t('SolarControls.chungTyLeKhoangCachTheoAu'),
    ],
  ];
  return (
    <div className="solar-controls">
      <div className="section-label">
        {t('SolarControls.cachNhinHeMatTroi')}
        <Orbit size={13} />
      </div>
      <div className="scale-options" role="group" aria-label={t('SolarControls.cheDoTyLe')}>
        {scaleOptions.map(([scale, name, text]) => (
          <button
            key={scale}
            aria-pressed={state.solarScale === scale}
            onClick={() => dispatch({ type: 'scale', scale })}
          >
            <span>
              {name}
              <small>{text}</small>
            </span>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      <p className="sidebar-scale-note">{scaleNotes[state.solarScale]}</p>
      {state.solarScale === 'size' && (
        <label className="solar-checkbox">
          <input
            type="checkbox"
            checked={state.compareSun}
            onChange={() => dispatch({ type: 'toggle', key: 'compareSun' })}
          />
          {t('SolarControls.matTroiVaCacHanhTinh')}
        </label>
      )}
      <label className="solar-checkbox">
        <input
          type="checkbox"
          checked={state.moon}
          onChange={() => dispatch({ type: 'toggle', key: 'moon' })}
        />
        {t('SolarControls.hienThiMatTrang')}
      </label>
      <label className="solar-checkbox">
        <input
          type="checkbox"
          checked={state.orbits}
          disabled={state.solarScale === 'size'}
          onChange={() => dispatch({ type: 'toggle', key: 'orbits' })}
        />
        {t('SolarControls.duongQuyDao')}
      </label>
      <div className="simulation-controls">
        <button
          className="icon-button"
          disabled={reduced}
          aria-label={
            state.moving ? t('SolarControls.tamDungMoPhong') : t('SolarControls.chayMoPhong')
          }
          onClick={() => dispatch({ type: 'toggle', key: 'moving' })}
        >
          {state.moving ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <label htmlFor="simulation-speed">
          {t('SolarControls.tocDo')}
          <select
            id="simulation-speed"
            aria-label={t('SolarControls.tocDo')}
            value={state.speed}
            onChange={(e) => dispatch({ type: 'speed', speed: Number(e.target.value) })}
          >
            <option value={0.05}>{t('simulation.speed', { speed: formatNumber(0.05) })}</option>
            <option value={0.5}>{t('simulation.speed', { speed: formatNumber(0.5) })}</option>
            <option value={2}>{t('simulation.speed', { speed: formatNumber(2) })}</option>
            <option value={10}>{t('simulation.speed', { speed: formatNumber(10) })}</option>
            <option value={20}>{t('simulation.speed', { speed: formatNumber(20) })}</option>
          </select>
        </label>
      </div>
      <p className="sidebar-scale-note">{t('SolarControls.quyDaoGianLuocTronDongPhangMotDong')}</p>
      <div className="section-label">{t('SolarControls.matTroiTamHanhTinh')}</div>
      <ol className="solar-destinations" aria-label={t('SolarControls.thuTuCacHanhTinh')}>
        {solarBodies
          .filter((body) => body.id !== 'moon')
          .map((body) => (
            <li key={body.id}>
              <button aria-pressed={state.selectedId === body.id} onClick={() => onSelect(body.id)}>
                <span className={`body-chip chip-${body.id}`} />
                {objectName(body.id)}
                <small>{body.englishName}</small>
              </button>
            </li>
          ))}
      </ol>
    </div>
  );
}
