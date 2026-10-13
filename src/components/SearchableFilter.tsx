import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useI18n } from '../i18n';

type Choice = { id: string; label: string; searchText: string };

export function SearchableFilter({ label, choices, value, onChange }: {
  label: string;
  choices: Choice[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const visible = choices.filter(choice => terms.every(term => choice.searchText.toLocaleLowerCase().includes(term)));
  const selected = choices.find(choice => choice.id === value) ?? choices[0];
  const activeChoice = visible[active];

  function expand() {
    const bounds = container.current?.getBoundingClientRect();
    if (bounds) setAbove(window.innerHeight - bounds.bottom < 280 && bounds.top > window.innerHeight - bounds.bottom);
    setQuery('');
    setActive(Math.max(0, choices.findIndex(choice => choice.id === value)));
    setOpen(true);
  }
  function choose(next: string) {
    onChange(next);
    input.current?.focus();
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    const option = list.current?.children[active] as HTMLElement | undefined;
    if (!open || !option || !list.current) return;
    const bounds = list.current.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    if (item.top < bounds.top) list.current.scrollTop -= bounds.top - item.top;
    else if (item.bottom > bounds.bottom) list.current.scrollTop += item.bottom - bounds.bottom;
  }, [open, active, query]);

  return <fieldset className="filter-row subtopic-filter"><legend>{label}</legend>
    <div ref={container} className="searchable-filter" onKeyDown={event => {
      if (event.key === 'Escape' && open && !event.nativeEvent.isComposing) { setOpen(false); setQuery(''); }
    }} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(''); }
    }}>
      <div className="searchable-filter-control">
        <Search size={16} aria-hidden="true" />
        <input ref={input} type="text" role="combobox" aria-label={label} autoComplete="off"
          aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={open && activeChoice ? `${id}-${activeChoice.id}` : undefined}
          value={open ? query : selected?.label ?? ''}
          placeholder={t('搜索或选择细分考点', 'Search or select a subtopic')}
          title={selected?.label} onFocus={expand} onClick={() => { if (!open) expand(); }}
          onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) expand();
              else setActive(index => Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (!open) expand();
              else if (activeChoice) choose(activeChoice.id);
            } else if (event.key === 'Escape' && open) {
              event.preventDefault(); setOpen(false); setQuery('');
            }
          }} />
        {value !== 'all' ? <button type="button" className="searchable-filter-icon" aria-label={t('清除细分考点筛选', 'Clear subtopic filter')}
          onMouseDown={event => event.preventDefault()} onClick={() => choose('all')}><X size={16} /></button> : null}
        <button type="button" className="searchable-filter-icon" aria-label={open ? t('收起细分考点', 'Close subtopic options') : t('展开细分考点', 'Open subtopic options')}
          onMouseDown={event => event.preventDefault()} onClick={() => {
            if (open) { setOpen(false); setQuery(''); }
            else { input.current?.focus(); expand(); }
          }}><ChevronDown size={16} aria-hidden="true" /></button>
      </div>
      {open ? <div className={`searchable-filter-popup${above ? ' above' : ''}`}>
        <div ref={list} id={`${id}-list`} role="listbox" tabIndex={-1} aria-label={label} className="searchable-filter-options">
          {visible.map((choice, index) => <button type="button" role="option" tabIndex={-1} key={choice.id} id={`${id}-${choice.id}`}
            aria-selected={choice.id === value} className={`searchable-filter-option${index === active ? ' active' : ''}`}
            onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(choice.id)}>
            <span>{choice.label}</span>{choice.id === value ? <Check size={16} aria-hidden="true" /> : null}
          </button>)}
        </div>
        <p role="status" className="searchable-filter-status">{visible.length ? t(`${visible.length} 个选项 · 支持中英文搜索`, `${visible.length} options · Search in Chinese or English`) : t('没有匹配的考点，请换个关键词。', 'No matching subtopics. Try another keyword.')}</p>
      </div> : null}
    </div>
  </fieldset>;
}
