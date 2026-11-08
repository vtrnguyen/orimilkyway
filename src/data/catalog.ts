import { normalizeSearch } from '../lib/astronomy';
import { solarBodies } from './solarSystem';
import { stars, starPosition } from './stars';
import { searchNames } from '../i18n';

export type Category = 'Tất cả' | 'Ngôi sao' | 'Hành tinh' | 'Vệ tinh tự nhiên';
export const catalog = [
  ...stars.map((star) => ({
    id: star.id,
    name: star.name,
    aliases: star.aliases,
    color: star.color,
    category: 'Ngôi sao' as const,
    detail: star.kind,
    mapped: starPosition(star) !== null,
  })),
  ...solarBodies
    .filter((body) => body.id !== 'sun')
    .map((body) => ({
      id: body.id,
      name: body.name,
      aliases: [body.englishName, ...body.aliases],
      color: body.color,
      category: body.category,
      detail: body.englishName,
      mapped: true,
    })),
];
const searchIndex = new Map(
  catalog.map((body) => [
    body.id,
    [body.name, ...body.aliases, ...searchNames(body.id)].map(normalizeSearch),
  ]),
);

export function searchCatalog(query: string, category: Category = 'Tất cả') {
  const normalized = normalizeSearch(query);
  return catalog.filter(
    (body) =>
      (category === 'Tất cả' || body.category === category) &&
      searchIndex.get(body.id)!.some((name) => name.includes(normalized)),
  );
}
