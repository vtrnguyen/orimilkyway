import { t } from '../i18n';
import { useId, useState } from 'react';
import { Info, X } from 'lucide-react';
import { scaleNotes, type SolarScale } from '../lib/solarSystem';
const preferenceKey = 'milkyway-scale-note-hidden';
export function SolarScaleNote({ scale }: { scale: SolarScale }) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) !== 'yes';
    } catch {
      return true;
    }
  });
  const detailsId = useId();
  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(preferenceKey, open ? 'yes' : 'no');
    } catch {
      /* The toggle still works when browser storage is unavailable. */
    }
  };
  return (
    <div className={`solar-scale-banner ${open ? '' : 'is-collapsed'}`} role="note">
      <button
        className="scale-note-toggle"
        aria-label={
          open ? t('SolarScaleNote.anChuThichTyLe') : t('SolarScaleNote.hienChuThichTyLe')
        }
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={toggle}
      >
        {open ? (
          <>
            <strong>
              {scale === 'size'
                ? t('SolarScaleNote.soSanhKichThuocThat')
                : scale === 'distance'
                  ? t('SolarScaleNote.khoangCachQuyDaoThat')
                  : t('SolarScaleNote.khamPhaTyLeDieuChinh')}
            </strong>
            <X size={16} aria-hidden="true" />
          </>
        ) : (
          <>
            <Info size={15} aria-hidden="true" />
            <span>{t('SolarScaleNote.chuThichTyLe')}</span>
          </>
        )}
      </button>
      <div id={detailsId} hidden={!open}>
        <p>{scaleNotes[scale]}</p>
        <small>
          {scale === 'size'
            ? t('SolarScaleNote.anhSangStudioDeSoSanhKhongTheHien')
            : t('SolarScaleNote.quyDaoGianLuocBanTrucLonThayBan')}
        </small>
      </div>
    </div>
  );
}
