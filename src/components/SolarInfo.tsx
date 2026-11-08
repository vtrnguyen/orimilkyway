import { t, objectName, categoryLabel, numberLocale } from '../i18n';
import { ArrowUpRight, Crosshair, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { SolarBody } from '../data/solarSystem';
import { formatValue } from '../lib/astronomy';
import { kmToAU, scaleNotes, type SolarScale } from '../lib/solarSystem';
export function SolarInfo({
  body: rawBody,
  scale,
  follow,
  onClose,
  onFocus,
  onFollow,
}: {
  body: SolarBody;
  scale: SolarScale;
  follow: boolean;
  onClose: () => void;
  onFocus: () => void;
  onFollow: () => void;
}) {
  const body = {
    ...rawBody,
    name: objectName(rawBody.id),
    description: t(`bodies.${rawBody.id}.description`),
  };
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo({ top: 0 });
  }, [body.id]);
  const mass = new Intl.NumberFormat(numberLocale(), {
    notation: 'scientific',
    maximumFractionDigits: 5,
  }).format(body.massKg);
  return (
    <aside
      ref={panel}
      className="info-panel panel solar-info"
      aria-label={t('SolarInfo.thongTinValue', { value1: body.name })}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="panel-top">
        <span className="eyebrow">{t('SolarInfo.hoSoThienThe')}</span>
        <button className="icon-button" aria-label={t('SolarInfo.dongThongTin')} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="info-body">
        <span className="object-type">
          <span style={{ background: body.color }} />
          {categoryLabel(body.category)}
        </span>
        <h2>{body.name}</h2>
        <p className="aliases">{body.englishName}</p>
        <p className="description">{body.description}</p>
        <dl className="star-stats">
          <div>
            <dt>{t('SolarInfo.banKinhTrungBinhTheTich')}</dt>
            <dd>{formatValue(body.radiusKm, 'km', 1)}</dd>
          </div>
          <div>
            <dt>{t('SolarInfo.duongKinhTrungBinh')}</dt>
            <dd>{formatValue(body.radiusKm * 2, 'km', 1)}</dd>
          </div>
          <div>
            <dt>{t('SolarInfo.khoiLuong')}</dt>
            <dd>{mass} kg</dd>
          </div>
          <div>
            <dt>{t('SolarInfo.thienTheTrungTam')}</dt>
            <dd>
              {body.parentId === 'earth'
                ? t('SolarInfo.traiDat')
                : body.parentId === 'sun'
                  ? t('SolarInfo.matTroi')
                  : t('SolarInfo.khongApDung')}
            </dd>
          </div>
          <div>
            <dt>{t('SolarInfo.banTrucLonQuyDao')}</dt>
            <dd>
              {formatValue(body.semiMajorAxisKm, 'km', 0)}
              {body.semiMajorAxisKm !== undefined && (
                <small>{formatValue(kmToAU(body.semiMajorAxisKm), 'AU', 5)}</small>
              )}
            </dd>
          </div>
          <div>
            <dt>{t('SolarInfo.chuKyQuyDaoThienVan')}</dt>
            <dd>{formatValue(body.orbitalPeriodDays, t('SolarInfo.ngay'), 4)}</dd>
          </div>
          <div>
            <dt>{t('SolarInfo.chuKyTuQuayThienVan')}</dt>
            <dd>
              {formatValue(
                body.rotationHours === undefined ? undefined : Math.abs(body.rotationHours),
                t('SolarInfo.gio'),
                4,
              )}
            </dd>
          </div>
          <div>
            <dt>{t('SolarInfo.doNghiengTrucPhapTuyenQuyDao')}</dt>
            <dd>{formatValue(body.obliquityDegrees, '°', 3)}</dd>
          </div>
        </dl>
        {body.rotationHours !== undefined && body.rotationHours < 0 && (
          <p className="data-note">{t('SolarInfo.tuQuayNghichChieuDuLieuNasaGhiChu')}</p>
        )}
        <button className="primary-button" onClick={onFocus}>
          <Crosshair size={16} />
          {t('SolarInfo.xemGanThienThe')}
        </button>
        <label className="solar-checkbox follow-checkbox">
          <input type="checkbox" checked={follow} onChange={onFollow} />
          {t('SolarInfo.theoDoiThienTheDangDiChuyen')}
        </label>
        <p className="data-note">{scaleNotes[scale]}</p>
        <details className="source-details">
          <summary>{t('SolarInfo.nguonDoChinhXac')}</summary>
          <p>
            {t('solar.orbitMeaning', {
              parent: objectName(body.parentId === 'earth' ? 'earth' : 'sun'),
            })}
          </p>
          <p>{t('SolarInfo.quyDaoTronDongPhangPhaKhoiDauTuy')}</p>
          <p>{t('SolarInfo.beMatMayKhiQuyenVaVanhDaiDuoc')}</p>
          <a href={body.source} target="_blank" rel="noreferrer">
            {t('sources.factSheet', { name: body.englishName })}
            <ArrowUpRight size={14} />
          </a>
        </details>
      </div>
    </aside>
  );
}
