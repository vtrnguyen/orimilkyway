import { useTranslation } from 'react-i18next';
import { changeLanguage, i18n, t } from '../i18n';

export function LanguageSelect() {
  useTranslation(undefined, { i18n });
  return (
    <label className="language-select">
      <span>{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={i18n.resolvedLanguage}
        onChange={(event) => void changeLanguage(event.target.value)}
      >
        <option value="vi" lang="vi">
          Tiếng Việt
        </option>
        <option value="en" lang="en">
          English
        </option>
        <option value="ja" lang="ja">
          日本語
        </option>
      </select>
    </label>
  );
}
