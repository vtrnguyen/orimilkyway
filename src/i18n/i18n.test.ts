import { afterEach, describe, expect, it, vi as vitest } from 'vitest';
import {
  changeLanguage,
  i18n,
  isLanguage,
  languageStorageKey,
  localizeStar,
  objectName,
  readLanguage,
  resources,
  t,
} from './index';
import { searchCatalog } from '../data/catalog';
import { getSolarBody, solarBodies } from '../data/solarSystem';
import { stars } from '../data/stars';
import { formatValue } from '../lib/astronomy';

afterEach(async () => {
  await changeLanguage('vi');
  vitest.unstubAllGlobals();
});

describe('translation integrity', () => {
  const placeholders = (text: string) =>
    [...text.matchAll(/{{\s*([^},]+).*?}}/g)].map((match) => match[1]).sort();
  for (const language of ['en', 'ja'] as const) {
    it(`${language}: all keys and interpolation placeholders match Vietnamese`, () => {
      const base = resources.vi.translation,
        translated = resources[language].translation;
      expect(Object.keys(translated).sort()).toEqual(Object.keys(base).sort());
      for (const key of Object.keys(base) as (keyof typeof base)[]) {
        expect(translated[key].trim(), key).not.toBe('');
        expect(placeholders(translated[key]), key).toEqual(placeholders(base[key]));
      }
    });
  }
  it('falls back to Vietnamese for a missing translated entry', async () => {
    const store = i18n.getResourceBundle('en', 'translation') as Record<string, string>;
    const original = store['common.missing'];
    delete store['common.missing'];
    try {
      await changeLanguage('en');
      expect(t('common.missing')).toBe(resources.vi.translation['common.missing']);
    } finally {
      store['common.missing'] = original;
    }
  });
  it('formats numbers, missing data and names in the active locale', async () => {
    await changeLanguage('en');
    expect(formatValue(6371, 'km', 1)).toBe('6,371 km');
    expect(formatValue(undefined)).toBe('No data available');
    expect(objectName('earth')).toBe('Earth');
    await changeLanguage('ja');
    expect(objectName('earth')).toBe('地球');
    expect(localizeStar(stars[1]).description).toBe(
      resources.ja.translation['stars.sirius-a.description'],
    );
    await changeLanguage('vi');
    expect(formatValue(6371, 'km', 1)).toBe('6.371 km');
  });
  it('leaves physical data and object identity untouched', async () => {
    const original = JSON.stringify(solarBodies),
      earth = getSolarBody('earth');
    await changeLanguage('ja');
    expect(JSON.stringify(solarBodies)).toBe(original);
    expect(getSolarBody('earth')).toBe(earth);
  });
});

describe('language preference', () => {
  it.each([null, '', 'fr', 'VI', 'undefined'])(
    'defaults to vi for unsupported stored value %s',
    (value) => {
      expect(readLanguage({ getItem: () => value })).toBe('vi');
    },
  );
  it.each(['vi', 'en', 'ja'])('reads valid stored preference %s', (value) => {
    expect(readLanguage({ getItem: () => value })).toBe(value);
  });
  it('works when storage throws, and persists valid changes when available', async () => {
    expect(
      readLanguage({
        getItem: () => {
          throw Error('blocked');
        },
      }),
    ).toBe('vi');
    const setItem = vitest.fn();
    vitest.stubGlobal('localStorage', { setItem });
    await changeLanguage('ja');
    expect(setItem).toHaveBeenCalledWith(languageStorageKey, 'ja');
    vitest.stubGlobal('localStorage', {
      setItem: () => {
        throw Error('blocked');
      },
    });
    await changeLanguage('en');
    expect(i18n.resolvedLanguage).toBe('en');
    await changeLanguage('invalid');
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(isLanguage('en-US')).toBe(false);
  });
});

describe('cross-language search', () => {
  it.each(['vi', 'en', 'ja'])(
    'finds names and aliases regardless of UI language %s',
    async (language) => {
      await changeLanguage(language);
      for (const [query, id] of [
        ['trai dat', 'earth'],
        ['EARTH', 'earth'],
        ['地球', 'earth'],
        ['MỘC TINH', 'jupiter'],
        ['Jupiter', 'jupiter'],
        ['木星', 'jupiter'],
        ['太陽系', 'sun'],
        ['Solar System', 'sun'],
        ['シリウス', 'sirius-a'],
        ['chuc nu', 'vega'],
      ]) {
        expect(
          searchCatalog(query).map((body) => body.id),
          query,
        ).toContain(id);
      }
      expect(searchCatalog('木星', 'Ngôi sao')).toEqual([]);
      expect(searchCatalog('<script>alert(1)</script>')).toEqual([]);
    },
  );
});
