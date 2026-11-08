import { t, localizeStar, categoryLabel } from '../i18n';
import { ArrowUpRight, Crosshair, Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Star } from '../data/stars';
import { starPosition, starDisplayColor } from '../data/stars';
import { formatValue } from '../lib/astronomy';
export function StarInfo({
  star: rawStar,
  onClose,
  onFocus,
}: {
  star: Star;
  onClose: () => void;
  onFocus: () => void;
}) {
  const star = localizeStar(rawStar);
  const located = starPosition(star) !== null;
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [star.id]);
  return (
    <aside
      ref={panel}
      className="info-panel panel"
      aria-label={t('StarInfo.thongTinValue', { value1: star.name })}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="panel-top">
        <span className="eyebrow">{t('StarInfo.hoSoThienThe')}</span>
        <button className="icon-button" aria-label={t('StarInfo.dongThongTin')} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div
        className="star-portrait"
        style={{ '--star-color': starDisplayColor(star) } as React.CSSProperties}
      >
        <div className="portrait-orbit" />
        <div className="portrait-star" />
        <span>{t('StarInfo.minhHoaKhongTheoTyLe')}</span>
      </div>
      <div className="info-body">
        <span className="object-type">
          <span style={{ background: starDisplayColor(star) }} />
          {t('StarInfo.ngoiSao')}
          {categoryLabel(star.kind)}
        </span>
        <h2>{star.name}</h2>
        <p className="aliases">{star.aliases.slice(0, 2).join(' / ')}</p>
        <p className="description">{star.description}</p>
        <p className="stellar-render-note">{t('StarInfo.khiXemGanSaoLaHinhCauTuPhat')}</p>
        <dl className="star-stats">
          <div>
            <dt>{t('StarInfo.khoangCachToiMatTroi')}</dt>
            <dd>{formatValue(star.distanceLy, t('StarInfo.namAnhSang'))}</dd>
          </div>
          <div>
            <dt>{t('StarInfo.chomSao')}</dt>
            <dd>{star.constellation || t('common.notApplicable')}</dd>
          </div>
          <div>
            <dt>{t('StarInfo.nhietDoBeMat')}</dt>
            <dd>{formatValue(star.temperatureK, 'K', 0)}</dd>
          </div>
          <div>
            <dt>
              {t('StarInfo.loaiQuangPho')}
              <abbr title={t('StarInfo.chuChoNhomNhietDoSoLaMaCho')}>?</abbr>
            </dt>
            <dd>{star.spectral || t('common.missing')}</dd>
          </div>
          <div>
            <dt>
              {t('StarInfo.khoiLuong')}
              <abbr title={t('StarInfo.mLaKhoiLuongMatTroi')}>M☉</abbr>
            </dt>
            <dd>{formatValue(star.massSolar, 'M☉')}</dd>
          </div>
          <div>
            <dt>
              {t('StarInfo.banKinh')}
              <abbr title={t('StarInfo.rLaBanKinhMatTroi')}>R☉</abbr>
            </dt>
            <dd>{formatValue(star.radiusSolar, 'R☉')}</dd>
          </div>
        </dl>
        <h3>{t('StarInfo.dieuThuVi')}</h3>
        <ul className="fact-list">
          {star.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        {located ? (
          <button className="primary-button" onClick={onFocus}>
            <Crosshair size={16} />
            {t('StarInfo.duaVeTamGocNhin')}
          </button>
        ) : (
          <div className="data-note">
            <Info size={16} />
            <span>{t('StarInfo.chuaCoToaDoDaXacMinhDoiTuong')}</span>
          </div>
        )}
        <details className="source-details">
          <summary>{t('StarInfo.nguonDoChinhXac')}</summary>
          <p>{star.note}</p>
          {star.position && (
            <p>
              {t('coordinates.description', {
                frame: star.position.frame,
                epoch: star.position.epoch,
                ra: formatValue(star.position.raHours, t('StarInfo.gio'), 5),
                dec: formatValue(star.position.decDegrees, '°', 5),
              })}
            </p>
          )}
          <p>{t('StarInfo.cacOChuaCoDuLieuChuaDuocDoi')}</p>
          {star.sources.map((source) => (
            <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
              {source.title}
              <ArrowUpRight size={14} />
            </a>
          ))}
        </details>
      </div>
    </aside>
  );
}
