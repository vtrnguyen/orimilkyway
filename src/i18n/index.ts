import i18next, { type TOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';
import ja from './locales/ja.json';

export const languages = ['vi', 'en', 'ja'] as const;
export type Language = (typeof languages)[number];
export const languageStorageKey = 'milkyway-language';
export const isLanguage = (value: unknown): value is Language =>
  languages.includes(value as Language);
export function readLanguage(storage?: Pick<Storage, 'getItem'>): Language {
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem(languageStorageKey);
    return isLanguage(value) ? value : 'vi';
  } catch {
    return 'vi';
  }
}

export const resources = {
  vi: { translation: vi },
  en: { translation: en },
  ja: { translation: ja },
};
export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: readLanguage(),
  supportedLngs: [...languages],
  fallbackLng: 'vi',
  keySeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function t(key: string, options?: TOptions): string {
  return i18n.t(key, { defaultValue: vi[key as keyof typeof vi] ?? '', ...options }) as string;
}
export const numberLocale = () =>
  ({ vi: 'vi-VN', en: 'en-US', ja: 'ja-JP' })[i18n.resolvedLanguage as Language] ?? 'vi-VN';
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(numberLocale(), options).format(value);

function syncDocument() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = i18n.resolvedLanguage ?? 'vi';
  document.title = t('metadata.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('metadata.description'));
}
i18n.on('languageChanged', () => {
  try {
    globalThis.localStorage?.setItem(languageStorageKey, i18n.resolvedLanguage ?? 'vi');
  } catch {
    /* Optional preference. */
  }
  syncDocument();
});
syncDocument();
export async function changeLanguage(value: string) {
  await i18n.changeLanguage(isLanguage(value) ? value : 'vi');
}

const categoryKeys: Record<string, string> = {
  'Tất cả': 'categories.all',
  'Ngôi sao': 'categories.star',
  'Hành tinh': 'categories.planet',
  'Vệ tinh tự nhiên': 'categories.moon',
  'Sao đơn': 'kinds.single',
  'Thành phần hệ sao': 'kinds.component',
  'Hệ sao': 'kinds.system',
};
export const categoryLabel = (value: string) => t(categoryKeys[value] ?? 'categories.all');
export const objectName = (id: string) =>
  t(`${Object.hasOwn(vi, `bodies.${id}.name`) ? 'bodies' : 'stars'}.${id}.name`);
export const searchNames = (id: string) =>
  Object.values(resources).flatMap(({ translation }) => {
    const entries = translation as Record<string, string>;
    return [
      entries[`bodies.${id}.name`],
      entries[`stars.${id}.name`],
      ...(id === 'sun' ? [entries['search.solarSystemAlias']] : []),
    ].filter((value): value is string => !!value);
  });
export const lessonIds = [
  'galaxy',
  'location',
  'lightYear',
  'starColors',
  'categories',
  'scales',
] as const;

/** Localize only display fields; coordinates, physical values and IDs stay intact. */
export function localizeStar<
  T extends {
    id: string;
    name: string;
    description: string;
    facts: string[];
    constellation?: string;
    note?: string;
  },
>(star: T): T {
  return {
    ...star,
    name: objectName(star.id),
    description: t(`stars.${star.id}.description`),
    facts: star.facts.map((_, index) => t(`stars.${star.id}.facts.${index}`)),
    constellation: star.constellation ? t(`stars.${star.id}.constellation`) : undefined,
    note: star.note ? t(`stars.${star.id}.note`) : undefined,
  };
}
