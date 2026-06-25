import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COUNTRY_DATA, flagEmoji } from '../../lib/constants/countries';

interface PhoneInputProps {
  /** Full phone string, e.g. "+91 98765 43210" */
  value?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  id?: string;
}

/** Dial codes sorted longest-first so "+1869" matches before "+1" when parsing. */
const DIAL_CODES = COUNTRY_DATA.map((c) => c.dialCode).sort((a, b) => b.length - a.length);

const MENU_HEIGHT = 290;

/** Split a stored phone string into a dial code + the remaining national number. */
function parsePhone(raw: string): { dial: string; national: string } {
  const trimmed = (raw || '').trim();
  if (!trimmed) return { dial: '', national: '' };
  const compact = trimmed.replace(/\s+/g, '');
  if (compact.startsWith('+')) {
    const match = DIAL_CODES.find((d) => compact.startsWith(d));
    if (match) {
      return { dial: match, national: trimmed.slice(trimmed.indexOf(match) + match.length).trim() };
    }
  }
  return { dial: '', national: trimmed };
}

function combine(dial: string, national: string): string {
  return `${dial} ${national}`.trim();
}

/**
 * Serialize for the form value, collapsing a dial-code-only value (a country
 * picked but no number typed) to '' — so an optional phone left blank after
 * selecting a country is treated as empty rather than an invalid "+NN".
 */
function serialize(dial: string, national: string): string {
  return national.trim() ? combine(dial, national) : '';
}

interface MenuPos {
  top: number;
  left: number;
  openUp: boolean;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  placeholder = 'Phone number',
  hasError,
  disabled,
  id,
}: PhoneInputProps) {
  const parsed = parsePhone(value || '');
  const [dial, setDial] = useState(parsed.dial);
  const [national, setNational] = useState(parsed.national);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Re-sync internal state when the form value changes externally (e.g. resume / reset).
  useEffect(() => {
    const incoming = (value || '').trim();
    if (incoming !== serialize(dial, national)) {
      const p = parsePhone(incoming);
      setDial(p.dial);
      setNational(p.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selectedCountry = useMemo(
    () => COUNTRY_DATA.find((c) => c.dialCode === dial),
    [dial],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_DATA;
    return COUNTRY_DATA.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [query]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < MENU_HEIGHT && r.top > spaceBelow;
    setPos({ top: openUp ? r.top : r.bottom, left: r.left, openUp });
  };

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const pickDial = (d: string) => {
    setDial(d);
    setOpen(false);
    setQuery('');
    onChange(serialize(d, national));
  };

  const handleNationalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow digits, spaces and common separators only.
    const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '');
    setNational(cleaned);
    onChange(serialize(dial, cleaned));
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
              width: 320,
              maxWidth: '90vw',
              zIndex: 1000,
            }}
            className="bg-white border border-border rounded-[7px] shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code…"
                className="h-[34px] w-full px-2.5 border-[1.5px] border-border rounded-[6px] font-sans text-[13.5px] text-text bg-off-white outline-none focus:border-navy-mid focus:bg-white"
              />
            </div>
            <ul role="listbox" className="max-h-[240px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-[13px] text-text-muted">No matches</li>
              ) : (
                filtered.map((c) => {
                  const isSelected = c.dialCode === dial && c.code === selectedCountry?.code;
                  return (
                    <li
                      key={c.code}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pickDial(c.dialCode)}
                      className={`px-3 py-2 text-[14px] cursor-pointer flex items-center gap-2.5 hover:bg-navy-light ${
                        isSelected ? 'font-semibold text-navy' : 'text-text'
                      }`}
                    >
                      <span className="text-[14px] leading-none">{flagEmoji(c.code)}</span>
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-text-muted text-[13px]">{c.dialCode}</span>
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
      <div
        className={`flex h-[40px] border-[1.5px] border-border rounded-[7px] bg-off-white overflow-hidden transition-colors focus-within:border-navy-mid focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] ${
          hasError ? '!border-danger !bg-[#fff5f5]' : ''
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 border-r border-border bg-transparent hover:bg-navy-light/60 transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <span className="text-[14px] leading-none">
            {selectedCountry ? flagEmoji(selectedCountry.code) : '🌐'}
          </span>
          <span className="text-[13.5px] text-text font-medium">{dial || '+'}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#8892aa" strokeWidth="2" className="w-3 h-3">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          value={national}
          disabled={disabled}
          onChange={handleNationalChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 bg-transparent font-sans text-[14px] text-text outline-none"
        />
      </div>
      {menu}
    </div>
  );
}
