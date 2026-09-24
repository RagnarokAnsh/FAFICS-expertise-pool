import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PortalDirective } from '../../core/portal.directive';
import { COUNTRY_DATA, flagEmoji } from '../../lib/constants/countries';
import { MAX_PHONE_DIGITS } from '../../lib/schemas/application.schema';

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

/** Trim `national` so dial code + national number never exceeds MAX_PHONE_DIGITS digits. */
function capNationalDigits(national: string, dial: string): string {
  const budget = Math.max(0, MAX_PHONE_DIGITS - dial.replace(/\D/g, '').length);
  let digits = 0;
  let out = '';
  for (const ch of national) {
    if (/\d/.test(ch)) {
      if (digits >= budget) break;
      digits++;
    }
    out += ch;
  }
  return out;
}

interface MenuPos {
  top: number;
  left: number;
  openUp: boolean;
}

/** components/ui/PhoneInput.tsx — country dial-code picker + national number. */
@Component({
  selector: 'div[appPhoneInput]',
  imports: [PortalDirective],
  template: `
    <div [class]="wrapperClasses()">
      <button
        #trigger
        type="button"
        [disabled]="disabled()"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        (click)="!disabled() && open.set(!open())"
        class="flex items-center gap-1.5 px-2.5 border-r border-border bg-transparent hover:bg-navy-light/60 transition-colors shrink-0 cursor-pointer disabled:cursor-not-allowed"
      >
        <span class="text-[14px] leading-none">{{ selectedCountry() ? flag(selectedCountry()!.code) : '🌐' }}</span>
        <span class="text-[13.5px] text-text font-medium">{{ dial() || '+' }}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="#8892aa" stroke-width="2" class="w-3 h-3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <input
        [attr.id]="id() ?? null"
        type="tel"
        inputmode="tel"
        [value]="national()"
        [disabled]="disabled()"
        (input)="handleNationalChange($event)"
        (blur)="blurred.emit()"
        [placeholder]="placeholder()"
        class="flex-1 min-w-0 px-3 bg-transparent font-sans text-[14px] text-text outline-none"
      />
    </div>
    @if (open() && pos(); as p) {
      <div
        appPortal
        #menu
        [style.position]="'fixed'"
        [style.top.px]="p.openUp ? null : p.top + 4"
        [style.bottom.px]="p.openUp ? windowHeight() - p.top + 4 : null"
        [style.left.px]="p.left"
        [style.width.px]="320"
        [style.max-width]="'90vw'"
        [style.z-index]="1000"
        class="bg-white border border-border rounded-[7px] shadow-lg overflow-hidden"
      >
        <div class="p-2 border-b border-border">
          <input
            #search
            type="text"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
            placeholder="Search country or code…"
            class="h-[34px] w-full px-2.5 border-[1.5px] border-border rounded-[6px] font-sans text-[13.5px] text-text bg-off-white outline-none focus:border-navy-mid focus:bg-white"
          />
        </div>
        <ul role="listbox" class="max-h-[240px] overflow-y-auto py-1">
          @if (filtered().length === 0) {
            <li class="px-3 py-2 text-[13px] text-text-muted">No matches</li>
          } @else {
            @for (c of filtered(); track c.code) {
              <li
                role="option"
                [attr.aria-selected]="c.dialCode === dial() && c.code === selectedCountry()?.code"
                (click)="pickDial(c.dialCode)"
                [class]="
                  'px-3 py-2 text-[14px] cursor-pointer flex items-center gap-2.5 hover:bg-navy-light ' +
                  (c.dialCode === dial() && c.code === selectedCountry()?.code ? 'font-semibold text-navy' : 'text-text')
                "
              >
                <span class="text-[14px] leading-none">{{ flag(c.code) }}</span>
                <span class="truncate">{{ c.name }}</span>
                <span class="ml-auto text-text-muted text-[13px]">{{ c.dialCode }}</span>
              </li>
            }
          }
        </ul>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative' },
})
export class PhoneInputComponent {
  /** Full phone string, e.g. "+91 98765 43210" */
  readonly value = input<string | null | undefined>(undefined);
  readonly placeholder = input('Phone number');
  readonly hasError = input(false);
  readonly disabled = input(false);
  readonly id = input<string | undefined>(undefined);
  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  protected readonly dial = signal('');
  protected readonly national = signal('');
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly pos = signal<MenuPos | null>(null);
  protected readonly windowHeight = signal(typeof window !== 'undefined' ? window.innerHeight : 0);
  protected readonly flag = flagEmoji;

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLDivElement>>('menu');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly selectedCountry = computed(() => COUNTRY_DATA.find((c) => c.dialCode === this.dial()));

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return COUNTRY_DATA;
    return COUNTRY_DATA.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q),
    );
  });

  protected readonly wrapperClasses = computed(
    () =>
      `flex h-[40px] border-[1.5px] border-border rounded-[7px] bg-off-white overflow-hidden transition-colors focus-within:border-navy-mid focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] ${
        this.hasError() ? '!border-danger !bg-[#fff5f5]' : ''
      } ${this.disabled() ? 'opacity-60' : ''}`,
  );

  constructor() {
    // Re-sync internal state when the form value changes externally (e.g. resume / reset).
    effect(() => {
      const incoming = (this.value() || '').trim();
      untracked(() => {
        if (incoming !== serialize(this.dial(), this.national())) {
          const p = parsePhone(incoming);
          this.dial.set(p.dial);
          this.national.set(p.national);
        }
      });
    });

    effect((onCleanup) => {
      if (!this.open()) return;
      untracked(() => this.updatePosition());
      const onScroll = () => this.updatePosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      onCleanup(() => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      });
    });

    effect((onCleanup) => {
      if (!this.open()) return;
      const handler = (e: MouseEvent) => {
        const t = e.target as Node;
        if (this.trigger().nativeElement.contains(t) || this.menu()?.nativeElement.contains(t)) return;
        this.open.set(false);
        this.query.set('');
      };
      document.addEventListener('mousedown', handler);
      onCleanup(() => document.removeEventListener('mousedown', handler));
    });

    effect((onCleanup) => {
      if (this.open()) {
        const t = setTimeout(() => this.search()?.nativeElement.focus(), 0);
        onCleanup(() => clearTimeout(t));
      }
    });
  }

  private updatePosition(): void {
    const r = this.trigger().nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < MENU_HEIGHT && r.top > spaceBelow;
    this.windowHeight.set(window.innerHeight);
    this.pos.set({ top: openUp ? r.top : r.bottom, left: r.left, openUp });
  }

  protected pickDial(d: string): void {
    const capped = capNationalDigits(this.national(), d);
    this.dial.set(d);
    this.national.set(capped);
    this.open.set(false);
    this.query.set('');
    this.valueChange.emit(serialize(d, capped));
  }

  protected handleNationalChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    // Allow digits, spaces and common separators only, capped at 15 digits total.
    const cleaned = capNationalDigits(target.value.replace(/[^\d\s\-()]/g, ''), this.dial());
    this.national.set(cleaned);
    // A controlled React input snaps the DOM back to state; do the same here.
    if (target.value !== cleaned) {
      target.value = cleaned;
    }
    this.valueChange.emit(serialize(this.dial(), cleaned));
  }
}
