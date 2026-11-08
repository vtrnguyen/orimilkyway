import { t, objectName, categoryLabel } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, CornerDownLeft, X } from 'lucide-react';
import { searchCatalog, type Category } from '../data/catalog';
export function Search({
  onSelect,
  enabled = true,
}: {
  onSelect: (id: string) => void;
  enabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [category, setCategory] = useState<Category>('Tất cả');
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const results = searchCatalog(query, category);
  useEffect(() => {
    if (!enabled) return;
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', shortcut);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', shortcut);
      document.removeEventListener('pointerdown', outside);
    };
  }, [enabled]);
  const select = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
    input.current?.focus();
  };
  return (
    <div
      className="search-wrap"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <SearchIcon size={18} />
      <input
        ref={input}
        role="combobox"
        aria-label={t('Search.timKiemThienThe')}
        aria-expanded={open}
        aria-controls="star-results"
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `result-${results[active].id}` : undefined}
        placeholder={t('Search.timSaoHanhTinhVeTinh')}
        value={query}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.max(0, Math.min(i + 1, results.length - 1)));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          }
          if (e.key === 'Enter' && open && results[active]) {
            e.preventDefault();
            select(results[active].id);
          }
        }}
      />
      {query ? (
        <button
          className="clear-search"
          aria-label={t('Search.xoaTimKiem')}
          onClick={() => {
            setQuery('');
            setActive(0);
            input.current?.focus();
          }}
        >
          <X size={15} />
        </button>
      ) : (
        <kbd>Ctrl K</kbd>
      )}
      {open && (
        <div className="search-results">
          <div className="result-heading">
            {query
              ? t('search.results', { count: results.length })
              : t('Search.batDauMotChuyenKhamPha')}
          </div>
          <div className="catalog-filters" role="group" aria-label={t('Search.loaiThienThe')}>
            {(['Tất cả', 'Ngôi sao', 'Hành tinh', 'Vệ tinh tự nhiên'] as Category[]).map((item) => (
              <button
                key={item}
                aria-pressed={category === item}
                onClick={() => {
                  setCategory(item);
                  setActive(0);
                  input.current?.focus();
                }}
              >
                {categoryLabel(item)}
              </button>
            ))}
          </div>
          <ul id="star-results" role="listbox" aria-label={t('Search.ketQuaTimKiem')}>
            {results.map((star, i) => (
              <li
                role="option"
                aria-selected={i === active}
                id={`result-${star.id}`}
                key={star.id}
                onPointerMove={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(star.id)}
              >
                <span className="star-dot" style={{ background: star.color }} />
                <span>
                  <strong>{objectName(star.id)}</strong>
                  <small>
                    {categoryLabel(star.category)} ·{' '}
                    {star.category === 'Ngôi sao' ? categoryLabel(star.detail) : star.detail} ·{' '}
                    {star.mapped ? t('Search.coTrenBanDo') : t('Search.thongTinThamKhao')}
                  </small>
                </span>
                <CornerDownLeft size={15} />
              </li>
            ))}
          </ul>
          {!results.length && (
            <div className="no-results">
              {t('Search.chuaTimThayThienTheNay')}
              <br />
              <small>{t('Search.thuEarthSaoMocHoacSiriusKiemTraBo')}</small>
            </div>
          )}
          <div className="search-hint">
            {t('Search.deChon')}
            <span>{t('Search.deKhamPha')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
