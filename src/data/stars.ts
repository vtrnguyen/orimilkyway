import vi from '../i18n/locales/vi.json';
import { searchNames } from '../i18n';
import {
  equatorialToCartesian,
  normalizeSearch,
  parallaxToLightYears,
  type EquatorialPosition,
} from '../lib/astronomy';

export interface Star {
  id: string;
  name: string;
  aliases: string[];
  kind: 'Sao đơn' | 'Thành phần hệ sao' | 'Hệ sao';
  constellation?: string;
  distanceLy?: number;
  spectral?: string;
  temperatureK?: number;
  massSolar?: number;
  radiusSolar?: number;
  color: string;
  description: string;
  facts: string[];
  position?: EquatorialPosition;
  sources: { title: string; url: string }[];
  note?: string;
}

const simbad = (name: string) =>
  `https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=${encodeURIComponent(name)}`;
const pos = (raHours: number, decDegrees: number, name: string): EquatorialPosition => ({
  raHours,
  decDegrees,
  epoch: 'J2000',
  frame: 'ICRS',
  source: simbad(name),
});
const ref = (name: string) => [{ title: `SIMBAD · ${name}`, url: simbad(name) }];

export const stars: Star[] = [
  {
    id: 'sun',
    name: vi['stars.sun.name'],
    aliases: ['Sun', 'Sol', 'Hệ Mặt Trời'],
    kind: 'Sao đơn',
    distanceLy: 0,
    spectral: 'G2 V',
    temperatureK: 5772,
    massSolar: 1,
    radiusSolar: 1,
    color: '#ffcd78',
    description: vi['stars.sun.description'],
    facts: [vi['stars.sun.facts.0'], vi['stars.sun.facts.1'], vi['stars.sun.facts.2']],
    sources: [
      { title: 'NASA · Sun facts', url: 'https://science.nasa.gov/sun/facts/' },
      {
        title: 'NASA · Sun Fact Sheet',
        url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html',
      },
    ],
    note: vi['stars.sun.note'],
  },
  {
    id: 'sirius-a',
    name: vi['stars.sirius-a.name'],
    aliases: ['Sirius', 'Thiên Lang', 'Alpha Canis Majoris', 'Dog Star'],
    kind: 'Thành phần hệ sao',
    constellation: vi['stars.sirius-a.constellation'],
    distanceLy: parallaxToLightYears(379.21),
    color: '#c3ddff',
    description: vi['stars.sirius-a.description'],
    facts: [vi['stars.sirius-a.facts.0'], vi['stars.sirius-a.facts.1']],
    position: pos(6 + 45 / 60 + 8.91728 / 3600, -(16 + 42 / 60 + 58.0171 / 3600), 'Sirius A'),
    sources: ref('Sirius A'),
    note: vi['stars.sirius-a.note'],
  },
  {
    id: 'vega',
    name: vi['stars.vega.name'],
    aliases: ['Chức Nữ', 'Alpha Lyrae'],
    kind: 'Sao đơn',
    constellation: vi['stars.vega.constellation'],
    distanceLy: parallaxToLightYears(130.23),
    spectral: 'A0 V',
    color: '#c6d6ff',
    description: vi['stars.vega.description'],
    facts: [vi['stars.vega.facts.0'], vi['stars.vega.facts.1']],
    position: pos(18 + 36 / 60 + 56.33635 / 3600, 38 + 47 / 60 + 1.2802 / 3600, 'Vega'),
    sources: ref('Vega'),
    note: vi['stars.vega.note'],
  },
  {
    id: 'altair',
    name: vi['stars.altair.name'],
    aliases: ['Ngưu Lang', 'Alpha Aquilae'],
    kind: 'Sao đơn',
    constellation: vi['stars.altair.constellation'],
    distanceLy: parallaxToLightYears(194.95),
    color: '#e3e9ff',
    description: vi['stars.altair.description'],
    facts: [vi['stars.altair.facts.0'], vi['stars.altair.facts.1']],
    position: pos(19 + 50 / 60 + 46.99855 / 3600, 8 + 52 / 60 + 5.9563 / 3600, 'Altair'),
    sources: ref('Altair'),
    note: vi['stars.altair.note'],
  },
  {
    id: 'barnard',
    name: vi['stars.barnard.name'],
    aliases: ["Barnard's Star", 'Sao Barnard', 'GJ 699'],
    kind: 'Sao đơn',
    constellation: vi['stars.barnard.constellation'],
    distanceLy: parallaxToLightYears(546.9759),
    color: '#ff9979',
    description: vi['stars.barnard.description'],
    facts: [vi['stars.barnard.facts.0'], vi['stars.barnard.facts.1']],
    position: pos(
      17 + 57 / 60 + 48.4984700685 / 3600,
      4 + 41 / 60 + 36.113879676 / 3600,
      "Barnard's star",
    ),
    sources: ref("Barnard's star"),
    note: vi['stars.barnard.note'],
  },
  {
    id: 'proxima',
    name: vi['stars.proxima.name'],
    aliases: ['Alpha Centauri C', 'Cận Tinh', 'GJ 551'],
    kind: 'Thành phần hệ sao',
    constellation: vi['stars.proxima.constellation'],
    distanceLy: 4.24,
    color: '#ff967f',
    description: vi['stars.proxima.description'],
    facts: [vi['stars.proxima.facts.0'], vi['stars.proxima.facts.1']],
    position: pos(
      14 + 29 / 60 + 42.9461331854 / 3600,
      -(62 + 40 / 60 + 46.164680672 / 3600),
      'Proxima Centauri',
    ),
    sources: [
      {
        title: 'NASA / ESA · Proxima Centauri',
        url: 'https://science.nasa.gov/asset/hubble/proxima-centauri/',
      },
      ...ref('Proxima Centauri'),
    ],
    note: vi['stars.proxima.note'],
  },
  {
    id: 'alpha-centauri',
    name: vi['stars.alpha-centauri.name'],
    aliases: ['Alpha Centauri', 'Rigil Kentaurus', 'Toliman'],
    kind: 'Hệ sao',
    constellation: vi['stars.alpha-centauri.constellation'],
    color: '#ffe0ad',
    description: vi['stars.alpha-centauri.description'],
    facts: [vi['stars.alpha-centauri.facts.0'], vi['stars.alpha-centauri.facts.1']],
    sources: ref('alf Cen'),
    note: vi['stars.alpha-centauri.note'],
  },
  {
    id: 'trappist',
    name: vi['stars.trappist.name'],
    aliases: ['2MASS J23062928-0502285'],
    kind: 'Sao đơn',
    constellation: vi['stars.trappist.constellation'],
    distanceLy: 40,
    color: '#fa886f',
    description: vi['stars.trappist.description'],
    facts: [vi['stars.trappist.facts.0'], vi['stars.trappist.facts.1']],
    sources: [
      {
        title: 'NASA · TRAPPIST-1 system',
        url: 'https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-is-webb-revealing-about-the-trappist-1-system/',
      },
    ],
    note: vi['stars.trappist.note'],
  },
  {
    id: 'betelgeuse',
    name: vi['stars.betelgeuse.name'],
    aliases: ['Sâm Tú Tứ', 'Alpha Orionis'],
    kind: 'Sao đơn',
    constellation: vi['stars.betelgeuse.constellation'],
    color: '#ff9d66',
    description: vi['stars.betelgeuse.description'],
    facts: [vi['stars.betelgeuse.facts.0'], vi['stars.betelgeuse.facts.1']],
    sources: ref('Betelgeuse'),
    note: vi['stars.betelgeuse.note'],
  },
  {
    id: 'rigel',
    name: vi['stars.rigel.name'],
    aliases: ['Sâm Tú Thất', 'Beta Orionis'],
    kind: 'Thành phần hệ sao',
    constellation: vi['stars.rigel.constellation'],
    color: '#add3ff',
    description: vi['stars.rigel.description'],
    facts: [vi['stars.rigel.facts.0'], vi['stars.rigel.facts.1']],
    sources: ref('Rigel'),
    note: vi['stars.rigel.note'],
  },
  {
    id: 'polaris',
    name: vi['stars.polaris.name'],
    aliases: ['Sao Bắc Cực', 'Alpha Ursae Minoris'],
    kind: 'Hệ sao',
    constellation: vi['stars.polaris.constellation'],
    color: '#ffe1a9',
    description: vi['stars.polaris.description'],
    facts: [vi['stars.polaris.facts.0'], vi['stars.polaris.facts.1']],
    sources: ref('Polaris'),
    note: vi['stars.polaris.note'],
  },
  {
    id: 'deneb',
    name: vi['stars.deneb.name'],
    aliases: ['Thiên Tân Tứ', 'Alpha Cygni'],
    kind: 'Sao đơn',
    constellation: vi['stars.deneb.constellation'],
    color: '#c8deff',
    description: vi['stars.deneb.description'],
    facts: [vi['stars.deneb.facts.0'], vi['stars.deneb.facts.1']],
    sources: ref('Deneb'),
    note: vi['stars.deneb.note'],
  },
];

export function searchStars(query: string): Star[] {
  const q = normalizeSearch(query);
  return stars.filter((star) =>
    [star.name, ...star.aliases, ...searchNames(star.id)].some((name) =>
      normalizeSearch(name).includes(q),
    ),
  );
}

export function starPosition(star: Star): [number, number, number] | null {
  if (star.id === 'sun') return [0, 0, 0];
  if (!star.position || star.distanceLy === undefined) return null;
  return equatorialToCartesian(star.position.raHours, star.position.decDegrees, star.distanceLy);
}

export const mappedStars = stars.filter((star) => starPosition(star) !== null);

/** Qualitative temperature classes, never apparent brightness → physical size.
 * Unknown classes stay neutral instead of inventing a measured stellar color. */
export function starDisplayColor(star: Star): string {
  if (star.temperatureK !== undefined) {
    if (star.temperatureK >= 10000) return '#d7e5ff';
    if (star.temperatureK >= 6000) return '#f0f3ff';
    if (star.temperatureK >= 4500) return '#fff0ce';
    return '#ffd1ab';
  }
  const group = star.spectral?.trim()[0];
  if (group && 'OBA'.includes(group)) return '#d7e5ff';
  if (group && 'FG'.includes(group)) return '#fff0d4';
  if (group && 'KM'.includes(group)) return '#ffd1ab';
  return '#e2e4e9';
}
