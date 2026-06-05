import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableOption {
  value: string;
  label: string;
  /** Optional leading adornment (e.g. a flag emoji) */
  prefix?: string;
  /** Extra text to match against while searching but not shown as the label */
  keywords?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  id?: string;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
}

const MENU_HEIGHT = 290;

/**
 * Accessible, keyboard-navigable combobox with a built-in search box.
 * The menu renders in a portal with fixed positioning so it is never clipped
 * by an ancestor's `overflow: hidden` (e.g. the form Card).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Select…',
  hasError,
  disabled,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.keywords ? o.keywords.toLowerCase().includes(q) : false),
    );
  }, [options, query]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < MENU_HEIGHT && r.top > spaceBelow;
    setPos({ top: openUp ? r.top : r.bottom, left: r.left, width: r.width, openUp });
  };

  // Position the menu and keep it aligned on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  // Close on outside click (trigger + portal menu both count as "inside").
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
      onBlur?.();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onBlur]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const choose = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) choose(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  const menu =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.openUp ? undefined : pos.top + 4,
              bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
              left: pos.left,
              width: pos.width,
              zIndex: 1000,
            }}
            className="bg-white border border-border rounded-[7px] shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search…"
                className="h-[34px] w-full px-2.5 border-[1.5px] border-border rounded-[6px] font-sans text-[13.5px] text-text bg-off-white outline-none focus:border-navy-mid focus:bg-white"
              />
            </div>
            <ul ref={listRef} role="listbox" className="max-h-[240px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-[13px] text-text-muted">No matches</li>
              ) : (
                filtered.map((o, i) => {
                  const isActive = i === activeIndex;
                  const isSelected = o.value === value;
                  return (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => choose(o.value)}
                      className={`px-3 py-2 text-[14px] cursor-pointer flex items-center gap-2.5 ${
                        isActive ? 'bg-navy-light' : ''
                      } ${isSelected ? 'font-semibold text-navy' : 'text-text'}`}
                    >
                      {o.prefix && <span className="text-[14px] leading-none">{o.prefix}</span>}
                      <span className="truncate">{o.label}</span>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 ml-auto text-gold">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`h-[40px] w-full px-3 pr-9 border-[1.5px] border-border rounded-[7px] font-sans text-[14px] text-left bg-off-white transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] appearance-none flex items-center ${
          hasError ? '!border-danger !bg-[#fff5f5]' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate text-text">
            {selected.prefix && <span className="text-[14px] leading-none">{selected.prefix}</span>}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <span className="text-text-muted truncate">{placeholder}</span>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8892aa"
          strokeWidth="2"
          className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </div>
  );
}
