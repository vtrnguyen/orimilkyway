import { SceneBoundary } from './components/SceneBoundary';
import { usePhenomena } from './phenomena/state';
import { phenomenonIds } from './phenomena/model';
import { PhenomenaControls } from './phenomena/PhenomenaControls';
import { t, i18n, objectName, categoryLabel, lessonIds, formatNumber } from './i18n';
import { useTranslation } from 'react-i18next';
import { LanguageSelect } from './components/LanguageSelect';
import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Compass,
  Crosshair,
  Expand,
  Globe2,
  Info,
  Layers3,
  Maximize2,
  Minimize2,
  Menu,
  Minus,
  Mouse,
  Orbit,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search as SearchIcon,
  Settings2,
  Sparkles,
  Telescope,
  X,
} from 'lucide-react';
import { Search } from './components/Search';
import { Modal } from './components/Modal';
import { StarInfo } from './components/StarInfo';
import { SolarInfo } from './components/SolarInfo';
import { SolarControls } from './components/SolarControls';
import { SolarScaleNote } from './components/SolarScaleNote';
import { solarBodies, getSolarBody } from './data/solarSystem';
import { catalog } from './data/catalog';
import { scaleNotes } from './lib/solarSystem';
import { mappedStars, stars, starPosition } from './data/stars';
import { lessons } from './data/lessons';
import { formatValue } from './lib/astronomy';
import { useExplorer } from './state/useExplorer';
import type { Mode } from './state/useExplorer';
import { useImmersiveMode } from './state/useImmersiveMode';
const PhenomenaStage = lazy(() => import('./phenomena/PhenomenaStage'));
const SpaceScene = lazy(() => import('./scene/SpaceScene'));
const SolarScene = lazy(() => import('./scene/SolarScene'));
function hasWebGL() {
  if (new URLSearchParams(window.location.search).get('webgl') === 'off') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
function Switch({
  label,
  checked,
  onChange,
  icon,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      className="layer-switch"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
    >
      <span>
        {icon}
        {label}
      </span>
      <span className={`switch ${checked ? 'on' : ''}`}>
        <span />
      </span>
    </button>
  );
}
function WelcomeCard({ onSelect, onLearn }: { onSelect: () => void; onLearn: () => void }) {
  return (
    <aside className="welcome-card panel">
      <div className="panel-top">
        <span className="eyebrow">
          <span className="live-dot" />
          {t('App.motGocNhinMoi')}
        </span>
        <Sparkles size={15} />
      </div>
      <div className="mini-system">
        <div className="system-ring r1" />
        <div className="system-ring r2" />
        <div className="system-ring r3" />
        <div className="system-sun" />
        <span className="system-planet" />
        <span className="system-caption">{t('App.banDangODay')}</span>
      </div>
      <div className="welcome-body">
        <span className="eyebrow warm-text">{t('App.ngoiNhaCuaChungTa')}</span>
        <h2 className="multiline-copy">{t('welcome.title')}</h2>
        <p>{t('App.heMatTroiNamTrongNhanhOrionMotGoc')}</p>
        <div className="distance-stat">
          <strong>
            ≈ {formatNumber(26000)} <span>{t('App.namAnhSang')}</span>
          </strong>
          <small>{t('App.tuMatTroiDenTamNganHa')}</small>
        </div>
        <button className="primary-button" onClick={onSelect}>
          {t('App.gheThamMatTroi')}
          <ArrowUpRight size={17} />
        </button>
        <button className="text-button" onClick={onLearn}>
          {t('App.timHieuViTriCuaChungTa')}
          <ChevronRight size={15} />
        </button>
      </div>
    </aside>
  );
}
export default function App() {
  useTranslation(undefined, { i18n });
  const translatedLessons = lessons.map((item, index) => ({
    ...item,
    title: t(`lessons.${lessonIds[index]}.title`),
    tag: t(`lessons.${lessonIds[index]}.tag`),
    text: t(`lessons.${lessonIds[index]}.text`),
  }));
  const { state, dispatch, reduced } = useExplorer();
  const simulation = usePhenomena(reduced);
  const phenKind = simulation.state.kind;
  const [phenControlsOpen, setPhenControlsOpen] = useState(false);
  const [immersiveDetailId, setImmersiveDetailId] = useState<string | null>(null);
  const { isImmersiveMode, enterImmersiveMode, exitImmersiveMode, exitButtonRef } =
    useImmersiveMode({
      hasOpenDetails: phenKind ? simulation.state.selected !== null : immersiveDetailId !== null,
      hasOpenControls: !!phenKind && phenControlsOpen,
      onCloseControls: () => setPhenControlsOpen(false),
      onCloseDetails: () => {
        if (phenKind) simulation.dispatch({ type: 'select', id: null });
        else setImmersiveDetailId(null);
      },
    });
  const [webgl, setWebgl] = useState(hasWebGL);
  const onSceneFailure = useCallback(() => setWebgl(false), []);
  const [drawer, setDrawer] = useState(false);
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 760px)').matches);
  const [lesson, setLesson] = useState<number | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [legend, setLegend] = useState(false);
  const [help, setHelp] = useState(false);
  const [helpStep, setHelpStep] = useState(0);
  const [credits, setCredits] = useState(false);
  const detailId = isImmersiveMode && immersiveDetailId ? immersiveDetailId : state.selectedId;
  const selected = stars.find((star) => star.id === detailId);
  const solarSelected = state.mode === 'solar' ? getSolarBody(detailId) : undefined;
  const hasSelection = Boolean(selected || solarSelected);
  useEffect(() => {
    try {
      if (localStorage.getItem('milkyway-intro-seen') !== 'yes') setHelp(true);
    } catch {
      /* Storage may be disabled; help remains accessible. */
    }
  }, []);
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const closeHelp = () => {
    setHelp(false);
    try {
      localStorage.setItem('milkyway-intro-seen', 'yes');
    } catch {
      /* Optional preference only. */
    }
  };
  const select = (id: string) => {
    if (phenKind) simulation.dispatch({ type: 'open', kind: null });
    if (isImmersiveMode) setImmersiveDetailId(id);
    else {
      dispatch({ type: 'select', id });
      setDrawer(false);
    }
  };
  const closeDetails = () => {
    if (isImmersiveMode) setImmersiveDetailId(null);
    else dispatch({ type: 'close' });
  };
  const focusBody = (id: string) => {
    if (isImmersiveMode) dispatch({ type: 'focus-current', id });
    else select(id);
  };
  const followBody = (id: string) => {
    if (isImmersiveMode && state.selectedId !== id) dispatch({ type: 'focus-current', id });
    else dispatch({ type: 'toggle', key: 'follow' });
  };
  const changeMode = (mode: Mode) => {
    simulation.dispatch({ type: 'open', kind: null });
    dispatch({ type: 'mode', mode });
    setDrawer(false);
  };
  const guideSteps = [
    {
      icon: <Mouse size={34} />,
      title: t('App.caMotThienHaTrongTayBan'),
      text: t('App.keoChuotDeXoayKeoBangChuotPhaiDe'),
    },
    {
      icon: <Expand size={34} />,
      title: t('App.tienGanHonMotChut'),
      text: t('App.cuonChuotHoacChumHaiNgonTayDePhong'),
    },
    {
      icon: <SearchIcon size={34} />,
      title: t('App.timThienTheCuaBan'),
      text: t('App.timBangTenQuocTeHoacTenVietKhong'),
    },
    {
      icon: <Crosshair size={34} />,
      title: t('App.moiThienTheCoMotCauChuyen'),
      text: t('App.chonSaoDeMoHoSoHoacBamDau'),
    },
  ];
  return (
    <div
      className={`app-shell ${isImmersiveMode ? 'is-immersive' : ''} ${isImmersiveMode && (phenKind ? simulation.state.selected : immersiveDetailId) ? 'immersive-detail-open' : ''}`}
    >
      <header className="topbar" inert={isImmersiveMode}>
        <a className="brand" href="./" aria-label={t('App.milkyWayExplorerTrangKhamPha')}>
          <span className="brand-mark">
            <Orbit size={27} strokeWidth={1.4} />
          </span>
          <span>
            MILKY WAY<span className="brand-sub">E X P L O R E R</span>
          </span>
        </a>
        <div className="header-divider" />
        <span className="header-context">{t('App.moRongGocNhinCuaBan')}</span>
        <LanguageSelect />
        <Search onSelect={select} enabled={!isImmersiveMode} />
        <button
          className="help-button"
          aria-label={t('App.huongDan')}
          onClick={() => {
            setHelpStep(0);
            setHelp(true);
          }}
        >
          <CircleHelp size={17} />
          <span>{t('App.huongDan')}</span>
        </button>
        <div className="header-status">
          <span className="live-dot" />
          {t('App.khongGianKhamPha')}
        </div>
      </header>
      <div className="workspace">
        {drawer && (
          <button
            className="drawer-scrim"
            aria-label={t('App.dongBangDieuKhien')}
            onClick={() => setDrawer(false)}
          />
        )}
        <aside
          className={`sidebar ${drawer ? 'open' : ''}`}
          inert={isImmersiveMode || (mobile && !drawer)}
          aria-label={t('App.bangDieuKhienKhamPha')}
        >
          <div className="mobile-sidebar-title">
            {t('App.dieuKhien')}
            <button
              className="icon-button"
              aria-label={t('App.dongBangDieuKhien')}
              onClick={() => setDrawer(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="mobile-language">
            <LanguageSelect />
          </div>
          <div className="sidebar-section">
            <div className="section-label">
              {t('App.batDauKhamPha')}
              <span>01</span>
            </div>
            <button
              className={`mode-button ${!phenKind && state.mode === 'galaxy' ? 'active' : ''}`}
              onClick={() => changeMode('galaxy')}
              aria-pressed={!phenKind && state.mode === 'galaxy'}
            >
              <Orbit size={20} />
              <span>
                {t('App.toanCanhNganHa')}
                <small>{t('App.ngoiNhaCuaHangTyNgoiSao')}</small>
              </span>
              <ChevronRight size={15} />
            </button>
            <button
              className={`mode-button ${!phenKind && state.mode === 'local' ? 'active' : ''}`}
              onClick={() => changeMode('local')}
              aria-pressed={!phenKind && state.mode === 'local'}
            >
              <Globe2 size={19} />
              <span>
                {t('App.lanCanMatTroi')}
                <small>{t('App.nhungNguoiHangXomVuTru')}</small>
              </span>
              <ChevronRight size={15} />
            </button>
            <button
              className={`mode-button ${!phenKind && state.mode === 'solar' ? 'active' : ''}`}
              onClick={() => changeMode('solar')}
              aria-pressed={!phenKind && state.mode === 'solar'}
            >
              <Orbit size={20} />
              <span>
                {t('App.heMatTroi')}
                <small>{t('App.motNgoiSaoTamHanhTinh')}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          </div>
          <details className="sidebar-section phen-navigation" open={phenKind ? true : undefined}>
            <summary>{t('phen.navigation')}</summary>
            {phenomenonIds.map((kind) => (
              <button
                key={kind}
                className={`mode-button ${phenKind === kind ? 'active' : ''}`}
                aria-pressed={phenKind === kind}
                onClick={() => {
                  simulation.dispatch({ type: 'open', kind });
                  setDrawer(false);
                }}
              >
                <Sparkles size={18} />
                <span>{t(`phen.name.${kind}`)}</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </details>
          {phenKind ? (
            <PhenomenaControls
              simulation={simulation}
              reduced={reduced}
              onInspect={() => setDrawer(false)}
            />
          ) : (
            <>
              <div className="sidebar-section">
                <div className="section-label">
                  {t('App.cacLopHienThi')}
                  <Layers3 size={13} />
                </div>
                <Switch
                  label={t('App.tenThienThe')}
                  checked={state.labels}
                  disabled={!webgl}
                  onChange={() => dispatch({ type: 'toggle', key: 'labels' })}
                  icon={
                    <span className="letter-icon" aria-hidden="true">
                      Aa
                    </span>
                  }
                />
                <Switch
                  label={t('App.haoQuangSao')}
                  checked={state.dust}
                  disabled={!webgl || (state.mode === 'solar' && state.solarScale === 'size')}
                  onChange={() => dispatch({ type: 'toggle', key: 'dust' })}
                  icon={<Sparkles size={16} />}
                />
                <Switch
                  label={state.mode === 'solar' ? t('App.luoiAu') : t('App.luoiKhoangCach')}
                  checked={state.grid}
                  disabled={!webgl || (state.mode === 'solar' && state.solarScale !== 'distance')}
                  onChange={() => dispatch({ type: 'toggle', key: 'grid' })}
                  icon={<Orbit size={16} />}
                />
              </div>
              {state.mode === 'solar' ? (
                <SolarControls
                  state={state}
                  dispatch={dispatch}
                  onSelect={select}
                  reduced={reduced}
                />
              ) : (
                <div className="sidebar-section destinations">
                  <div className="section-label">
                    {t('App.diemDenGoiY')}
                    <Compass size={13} />
                  </div>
                  {['sun', 'sirius-a', 'proxima', 'vega', 'trappist'].map((id) => {
                    const star = stars.find((s) => s.id === id)!;
                    return (
                      <button
                        key={id}
                        className={`destination ${state.selectedId === id ? 'current' : ''}`}
                        onClick={() => select(id)}
                      >
                        <span
                          className="destination-orb"
                          style={{ '--star-color': star.color } as React.CSSProperties}
                        />
                        <span>
                          {objectName(star.id)}
                          <small>
                            {id === 'sun'
                              ? t('App.ngoiSaoCuaChungTa')
                              : id === 'proxima'
                                ? t('App.nguoiHangXomGanNhat')
                                : id === 'trappist'
                                  ? t('App.motSaoBayHanhTinh')
                                  : id === 'vega'
                                    ? t('App.ngoiSaoChucNu')
                                    : t('App.ngoiSaoThienLang')}
                          </small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <button className="learn-card" onClick={() => setLearnOpen(true)}>
            <span className="learn-icon">
              <BookOpen size={20} />
            </span>
            <span>
              <strong className="multiline-copy">{t('learning.teaser')}</strong>
              <small>
                {t('App.timHieuNhanh')}
                <ArrowRight size={13} />
              </small>
            </span>
          </button>
          <button className="credits-button text-button" onClick={() => setCredits(true)}>
            {t('App.nguonDuLieuCredits')}
            <ArrowUpRight size={13} />
          </button>
          <div className="sidebar-footer">
            <Settings2 size={14} />
            <label htmlFor="quality">{t('App.chatLuong')}</label>
            <select
              id="quality"
              value={state.quality}
              onChange={(e) =>
                dispatch({ type: 'quality', quality: e.target.value as 'low' | 'high' })
              }
            >
              <option value="high">{t('App.cao')}</option>
              <option value="low">{t('App.thap')}</option>
            </select>
          </div>
        </aside>

        {phenKind ? (
          <Suspense
            fallback={
              <main className="stage">
                <p>{t('App.dangMoMotGocVuTru')}</p>
              </main>
            }
          >
            <PhenomenaStage
              key={phenKind}
              simulation={simulation}
              reduced={reduced}
              quality={state.quality}
              webgl={webgl}
              onFailure={onSceneFailure}
              immersive={isImmersiveMode}
              onEnter={enterImmersiveMode}
              onDrawer={() => setDrawer(true)}
              controlsOpen={phenControlsOpen}
              onControls={setPhenControlsOpen}
            />
          </Suspense>
        ) : (
          <main
            className={`stage mode-${state.mode} ${hasSelection ? 'has-selection' : ''}`}
            aria-label={t('App.khongGianKhamPhaDetail')}
          >
            <div className="scene-surface">
              {webgl ? (
                <SceneBoundary onFailure={onSceneFailure}>
                  <Suspense
                    fallback={
                      <div className="scene-message">
                        <span className="loading-orbit" />
                        {t('App.dangMoMotGocVuTru')}
                      </div>
                    }
                  >
                    {state.mode === 'solar' ? (
                      <SolarScene
                        state={state}
                        onSelect={select}
                        reduced={reduced}
                        onFailure={onSceneFailure}
                      />
                    ) : (
                      <SpaceScene
                        state={state}
                        onSelect={select}
                        reduced={reduced}
                        onFailure={onSceneFailure}
                      />
                    )}
                  </Suspense>
                </SceneBoundary>
              ) : (
                <div className="fallback-space">
                  <span className="eyebrow">{t('App.cheDoKhamPha2d')}</span>
                  <h2>{t('App.vuTruVanODay')}</h2>
                  <p>
                    {t('App.webgl2KhongKhaDungHoacDaMatKet')}
                    <br />
                    {t('App.banVanCoTheKhamPhaDayDuDanh')}
                  </p>
                  <div className="fallback-stars">
                    {catalog.map((body) => (
                      <button key={body.id} onClick={() => select(body.id)}>
                        <span className="star-dot" style={{ background: body.color }} />
                        <span>
                          {objectName(body.id)}
                          <small>{categoryLabel(body.category)}</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="stage-heading">
              <div className="eyebrow">
                <span className="tiny-line" />
                {t('App.chuyenHanhTrinhBatDauTuDay')}
              </div>
              <h1>
                <em>{t(`headings.${state.mode}`)}</em>
              </h1>
              <p>
                {state.mode === 'solar'
                  ? t('App.motNgoiSaoTuPhatSangTamHanhTinh')
                  : state.mode === 'galaxy'
                    ? t('App.motThienHaHangTyCauChuyenVaBan')
                    : t('App.motGocKhongGianNhoNhungNguoiHangXom')}
              </p>
            </div>
            <div className="view-badge">
              <span className="live-dot" />
              {state.mode === 'solar'
                ? t('App.heMatTroiDetail')
                : state.mode === 'galaxy'
                  ? t('App.gocNhinThienHa')
                  : t('App.gocNhinLanCan')}
              <span>{webgl ? '3D' : '2D'}</span>
            </div>
            <button className="mobile-controls" onClick={() => setDrawer(true)}>
              <Menu size={18} />
              {t('App.khamPhaDetail')}
            </button>
            {webgl && !hasSelection && state.mode !== 'solar' && (
              <WelcomeCard onSelect={() => select('sun')} onLearn={() => setLesson(1)} />
            )}
            {solarSelected ? (
              <SolarInfo
                body={solarSelected}
                scale={state.solarScale}
                follow={state.follow && state.selectedId === solarSelected.id}
                onClose={closeDetails}
                onFocus={() => focusBody(solarSelected.id)}
                onFollow={() => followBody(solarSelected.id)}
              />
            ) : (
              selected && (
                <StarInfo
                  star={selected}
                  onClose={closeDetails}
                  onFocus={() => focusBody(selected.id)}
                />
              )
            )}
            {state.mode === 'solar' && <SolarScaleNote scale={state.solarScale} />}
            <div className="scene-orientation" aria-hidden="true">
              <span className="axis-y" />
              <span className="axis-x" />
              <span className="axis-z" />
              <i>Y</i>
              <b>X</b>
              <em>Z</em>
            </div>
            <div className="stage-bottom">
              <div className="scene-context">
                <span className="context-number">
                  {state.mode === 'solar' ? '03' : state.mode === 'galaxy' ? '01' : '02'}
                </span>
                <div>
                  <strong>
                    {state.mode === 'solar'
                      ? t('App.heMatTroiSolarSystem')
                      : state.mode === 'galaxy'
                        ? t('App.nganHaMilkyWay')
                        : t('App.vungLanCanMatTroi')}
                  </strong>
                  <span>
                    {state.mode === 'solar'
                      ? t('App.tuQuayChuyenDongQuanhMatTroi')
                      : state.mode === 'galaxy'
                        ? t('App.thienHaXoanOcCoThanh')
                        : t('App.valueDoiTuongCoViTriIcrsJ2000', { value1: mappedStars.length })}
                  </span>
                </div>
              </div>
              <div className="toolbar" role="toolbar" aria-label={t('App.dieuKhienGocNhin')}>
                <button
                  aria-label={t('App.datLaiGocNhin')}
                  title={t('App.datLaiGocNhin')}
                  onClick={() => dispatch({ type: 'reset' })}
                >
                  <RotateCcw size={17} />
                </button>
                <span className="toolbar-divider" />
                <button
                  aria-label={state.moving ? t('App.tatChuyenDong') : t('App.batChuyenDong')}
                  aria-pressed={state.moving}
                  title={
                    reduced
                      ? t('App.thietBiUuTienGiamChuyenDong')
                      : state.moving
                        ? t('App.tatChuyenDong')
                        : t('App.batChuyenDong')
                  }
                  disabled={reduced}
                  onClick={() => dispatch({ type: 'toggle', key: 'moving' })}
                >
                  {state.moving && !reduced ? <Pause size={17} /> : <Play size={17} />}
                </button>
                <button
                  aria-label={t('App.hienChuGiai')}
                  aria-pressed={legend}
                  title={t('App.chuGiai')}
                  onClick={() => setLegend(!legend)}
                >
                  <Info size={17} />
                </button>
                <span className="toolbar-divider" />
                <button
                  className="immersive-enter"
                  aria-label={t('App.xem3dTapTrung')}
                  title={t('App.xem3dTapTrung')}
                  aria-pressed={isImmersiveMode}
                  disabled={!webgl}
                  onClick={enterImmersiveMode}
                >
                  <Maximize2 size={17} />
                </button>
              </div>
              <div className="scale-label">
                <span className="scale-bar" />
                <span>
                  {state.mode === 'solar'
                    ? state.solarScale === 'size'
                      ? t('App.banKinh1DonVi10000Km')
                      : state.solarScale === 'distance'
                        ? t('App.khoangCach10DonVi1Au')
                        : t('App.kichThuocKhoangCachDaDieuChinh')
                    : state.mode === 'galaxy'
                      ? t('App.1DonVi1000NamAnhSang')
                      : t('App.1DonVi1NamAnhSang')}
                </span>
              </div>
            </div>
            {legend && (
              <div className="legend panel">
                <div className="panel-top">
                  <h3>{t('App.docBanDo')}</h3>
                  <button
                    className="icon-button"
                    aria-label={t('App.dongChuGiai')}
                    onClick={() => setLegend(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                {state.mode === 'solar' ? (
                  <>
                    <p>{t('App.duongManhQuyDaoTronGianLuoc')}</p>
                    <p>{t('App.vongTronNhoCanhNhanDauDinhViKhong')}</p>
                    <p>{t('App.luoiAuCanhKhoangCach151020')}</p>
                    <small>
                      {scaleNotes[state.solarScale]}
                      {t('App.beMatVaMauMinhHoaBangThuatToan')}
                    </small>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="star-dot warm" />
                      {t('App.vangViTriMatTroi')}
                    </p>
                    <p>
                      <span className="star-dot cool" />
                      {t('App.xanhDoMauSaoMinhHoa')}
                    </p>
                    <p>
                      {t('legend.rings', {
                        distances: new Intl.ListFormat(i18n.resolvedLanguage, {
                          style: 'long',
                          type: 'conjunction',
                        }).format(
                          (state.mode === 'galaxy'
                            ? [13000, 26000, 39000, 50000]
                            : [5, 10, 15, 20]
                          ).map((n) => formatNumber(n)),
                        ),
                      })}
                    </p>
                    <small>{t('App.hatCuaNganHaDuocSinhTheoThuatToan')}</small>
                  </>
                )}
              </div>
            )}
            <div className="interaction-hint">
              {webgl ? (
                <>
                  <span>
                    <Mouse size={13} />
                    {t('App.keoDeXoay')}
                  </span>
                  <span>
                    <Plus size={12} />
                    <Minus size={12} />
                    {t('App.cuonDeThuPhong')}
                  </span>
                  <span>
                    <Crosshair size={13} />
                    {t('App.chonSaoDeKhamPha')}
                  </span>
                </>
              ) : (
                <span>
                  <SearchIcon size={13} />
                  {t('App.chonTuDanhMucHoacTimTenSaoDe')}
                </span>
              )}
            </div>
            <div className="science-note">
              <Info size={13} />
              <span>
                {state.mode === 'solar'
                  ? t('App.beMatMinhHoaBangThuatToanKhongPhai')
                  : state.mode === 'galaxy'
                    ? t('App.moHinhTrucQuanHoaMinhHoaKhongPhai')
                    : t('App.thangDoRiengVoiNganHaViTriO')}
              </span>
              {!webgl && <span className="fallback-indicator">2D</span>}
            </div>
          </main>
        )}
      </div>

      {isImmersiveMode && (
        <button
          ref={exitButtonRef}
          className="immersive-exit"
          aria-label={t('App.thoatCheDoTapTrung')}
          title={t('App.thoatCheDoTapTrungEscape')}
          onClick={exitImmersiveMode}
        >
          <Minimize2 size={19} aria-hidden="true" />
        </button>
      )}

      {help && (
        <Modal title={guideSteps[helpStep].title} onClose={closeHelp} className="guide-modal">
          <div className="guide-visual">
            {guideSteps[helpStep].icon}
            <span className="guide-visual-orbit" />
          </div>
          <p>{guideSteps[helpStep].text}</p>
          {reduced && (
            <div className="data-note">
              <Info size={16} />
              {t('App.cheDoGiamChuyenDongDangBatTheoCai')}
            </div>
          )}
          <div className="guide-footer">
            <div className="step-dots">
              {guideSteps.map((_, i) => (
                <button
                  aria-label={t('App.buocValue', { value1: i + 1 })}
                  aria-current={helpStep === i ? 'step' : undefined}
                  key={i}
                  onClick={() => setHelpStep(i)}
                  className={helpStep === i ? 'active' : ''}
                />
              ))}
            </div>
            <button className="text-button" onClick={closeHelp}>
              {t('App.boQua')}
            </button>
            <button
              className="primary-button"
              onClick={() => (helpStep < 3 ? setHelpStep(helpStep + 1) : closeHelp())}
            >
              {helpStep === 3 ? t('App.batDauKhamPhaDetail') : t('App.tiepTheo')}
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {learnOpen && (
        <Modal
          title={t('App.toMoLaKhoiDauCuaKhamPha')}
          onClose={() => setLearnOpen(false)}
          className="lessons-modal"
        >
          <p>{t('App.sauCauChuyenNhoDeHieuThemVeVu')}</p>
          <div className="lesson-list">
            {translatedLessons.map((item, i) => (
              <button
                key={item.title}
                onClick={() => {
                  setLearnOpen(false);
                  setLesson(i);
                }}
              >
                <span className="lesson-index">0{i + 1}</span>
                <span>
                  <small>{item.tag}</small>
                  <strong>{item.title}</strong>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {lesson !== null && (
        <Modal
          title={translatedLessons[lesson].title}
          onClose={() => setLesson(null)}
          className="article-modal"
        >
          <div className="article-icon">
            <Telescope size={33} />
          </div>
          <span className="eyebrow">{translatedLessons[lesson].tag}</span>
          <p className="article-text">{translatedLessons[lesson].text}</p>
          <a
            className="source-link"
            href={translatedLessons[lesson].source}
            rel="noreferrer"
            target="_blank"
          >
            {t('App.docThemTaiNasa')}
            <ArrowUpRight size={15} />
          </a>
          <div className="article-footer">
            <button
              className="text-button"
              onClick={() => {
                setLesson(null);
                setLearnOpen(true);
              }}
            >
              <BookOpen size={16} />
              {t('App.tatCaBaiHoc')}
            </button>
            <button
              className="primary-button"
              onClick={() => setLesson((lesson + 1) % lessons.length)}
            >
              {t('App.cauChuyenTiepTheo')}
              <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {credits && (
        <Modal title={t('App.nguonDuLieuCredits')} onClose={() => setCredits(false)}>
          <p>{t('App.soLieuHanhTinhDuocDoiChieuTuNasa')}</p>
          <p>{t('App.tatCaBeMatHeMatTroiLucDia')}</p>
          <div className="credits-links">
            {solarBodies.map((body) => (
              <a href={body.source} key={body.id} target="_blank" rel="noreferrer">
                {t('sources.factSheet', { name: body.englishName })}
                <ArrowUpRight size={13} />
              </a>
            ))}
          </div>
          <p>{t('App.quyDaoVaHuongTrucKhongPhaiNghiemEphemeris')}</p>
        </Modal>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {phenKind
          ? t('phen.status', { name: t(`phen.name.${phenKind}`) })
          : solarSelected
            ? t('App.daChonValueValueCanhHeMatTroiValue', {
                value1: objectName(solarSelected.id),
                value2: categoryLabel(solarSelected.category),
                value3: scaleNotes[state.solarScale],
              })
            : selected
              ? t('App.daChonValueValue', {
                  value1: objectName(selected.id),
                  value2: starPosition(selected)
                    ? t('App.gocNhinValueKhoangCachValue', {
                        value1:
                          state.mode === 'local'
                            ? t('App.lanCanMatTroiDetail')
                            : t('App.nganHaDetail'),
                        value2: formatValue(selected.distanceLy, t('App.namAnhSang')),
                      })
                    : t('App.chuaCoToaDoDaXacMinhChiMo'),
                })
              : state.mode === 'solar'
                ? t('App.heMatTroiValue', { value1: scaleNotes[state.solarScale] })
                : state.mode === 'galaxy'
                  ? t('App.toanCanhNganHa')
                  : t('App.vungLanCanMatTroiMotDonViLa')}
      </div>
      <a className="skip-link" href="#quality">
        {t('App.denCaiDatChatLuong')}
      </a>
    </div>
  );
}
