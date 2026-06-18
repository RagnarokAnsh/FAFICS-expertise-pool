import React from 'react';
import { createPortal } from 'react-dom';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
}

/**
 * Lightweight checkbox-list multi-select with a popover panel.
 * Controlled component: pass `value` (selected option strings) and `onChange`.
 * Wire it into react-hook-form via <Controller>.
 *
 * The popover renders in a portal with fixed positioning so it is never clipped
 * by an ancestor that scrolls/overflows (e.g. the row's `overflow-x-auto`).
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  hasError,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  const updateCoords = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updateCoords();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReflow = () => updateCoords();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, updateCoords]);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

  const summary = value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selected`;

  return (
    <div className={`relative ${className || ''}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[40px] w-full items-center justify-between gap-2 rounded-[7px] border-[1.5px] px-3 font-sans text-[14px] text-left transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] ${
          hasError ? 'border-danger bg-[#fff5f5]' : 'border-border bg-off-white'
        } ${value.length === 0 ? 'text-text-muted' : 'text-text'}`}
      >
        <span className="truncate">{summary}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8892aa" strokeWidth="2" className="shrink-0"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && mounted && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width, minWidth: 240 }}
          className="z-50 max-h-[240px] overflow-auto rounded-[7px] border border-border bg-white py-1 shadow-lg"
        >
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] text-text hover:bg-navy-light"
            >
              <input
                type="checkbox"
                className="h-[15px] w-[15px] accent-navy"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
