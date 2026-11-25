import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PortalDirective } from '../../core/portal.directive';
import { FieldComponent } from './field';

export interface SearchableOption {
  value: string;
  label: string;
  /** Optional leading adornment (e.g. a flag emoji) */
  prefix?: string;
  /** Extra text to match against while searching but not shown as the label */
  keywords?: string;
}

interface MenuPos {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
}

const MENU_HEIGHT = 290;

/**
 * Accessible, keyboard-navigable combobox with a built-in search box —
 * components/ui/SearchableSelect.tsx. The menu renders in a portal with fixed
 * positioning so it is never clipped by an ancestor's `overflow: hidden`.
 */
@Component({
  selector: 'div[appSearchableSelect]',
  imports: [PortalDirective],
  template: `
    <button
      #trigger
      type="button"
      [attr.id]="controlId()"
      [attr.aria-invalid]="hasError() ? 'true' : null"
      [attr.aria-describedby]="field?.describedBy() ?? null"
      [disabled]="disabled()"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      (click)="!disabled() && open.set(!open())"
      (keydown)="handleKeyDown($event)"
      [class]="triggerClasses()"
    >
      @if (selected(); as s) {
        <span class="flex items-center gap-2 truncate text-text">
          @if (s.prefix) {
            <span class="text-[14px] leading-none">{{ s.prefix }}</span>
          }
          <span class="truncate">{{ s.label }}</span>
        </span>
      } @else {
        <span class="text-text-muted truncate">{{ placeholder() }}</span>
      }
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#8892aa"
        stroke-width="2"
        class="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
    @if (open() && pos(); as p) {
      <div
        appPortal
        #menu
        [style.position]="'fixed'"
        [style.top.px]="p.openUp ? null : p.top + 4"
        [style.bottom.px]="p.openUp ? windowHeight() - p.top + 4 : null"
        [style.left.px]="p.left"
        [style.width.px]="p.width"
        [style.z-index]="1000"
        class="bg-white border border-border rounded-[7px] shadow-lg overflow-hidden"
      >
        <div class="p-2 border-b border-border">
          <input
            #search
            type="text"
            [value]="query()"
            (input)="onQuery($event)"
            (keydown)="handleKeyDown($event)"
            placeholder="Search…"
            class="h-[34px] w-full px-2.5 border-[1.5px] border-border rounded-[6px] font-sans text-[13.5px] text-text bg-off-white outline-none focus:border-navy-mid focus:bg-white"
          />
        </div>
        <ul #list role="listbox" class="max-h-[240px] overflow-y-auto py-1">
          @if (filtered().length === 0) {
            <li class="px-3 py-2 text-[13px] text-text-muted">No matches</li>
          } @else {
            @for (o of filtered(); track o.value; let i = $index) {
              <li
                role="option"
                [attr.aria-selected]="o.value === value()"
                (mouseenter)="activeIndex.set(i)"
                (click)="choose(o.value)"
                [class]="
                  'px-3 py-2 text-[14px] cursor-pointer flex items-center gap-2.5 ' +
                  (i === activeIndex() ? 'bg-navy-light' : '') +
                  ' ' +
                  (o.value === value() ? 'font-semibold text-navy' : 'text-text')
                "
              >
                @if (o.prefix) {
                  <span class="text-[14px] leading-none">{{ o.prefix }}</span>
                }
                <span class="truncate">{{ o.label }}</span>
                @if (o.value === value()) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    class="w-3.5 h-3.5 ml-auto text-gold"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                }
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
export class SearchableSelectComponent {
  readonly options = input.required<SearchableOption[]>();
  readonly value = input<string | null | undefined>(undefined);
  readonly placeholder = input('Select…');
  readonly hasError = input(false);
  readonly disabled = input(false);
  readonly id = input<string | undefined>(undefined);
  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  /** The surrounding appField, if any: its label points at this trigger. */
  protected readonly field = inject(FieldComponent, { optional: true });
  protected readonly controlId = computed(() => this.id() ?? this.field?.defaultControlId ?? null);
  private readonly registerWithField = effect(() => {
    const id = this.controlId();
    if (id) this.field?.controlId.set(id);
  });

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);
  protected readonly pos = signal<MenuPos | null>(null);
  protected readonly windowHeight = signal(typeof window !== 'undefined' ? window.innerHeight : 0);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLDivElement>>('menu');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly list = viewChild<ElementRef<HTMLUListElement>>('list');

  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()) || null);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const options = this.options();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.keywords ? o.keywords.toLowerCase().includes(q) : false),
    );
  });

  protected readonly triggerClasses = computed(
    () =>
      `h-[40px] w-full px-3 pr-9 border-[1.5px] border-border rounded-[7px] font-sans text-[14px] text-left bg-off-white transition-colors outline-none focus:border-navy-mid focus:bg-white focus:shadow-[0_0_0_3px_rgba(13,34,64,0.07)] appearance-none flex items-center ${
        this.hasError() ? '!border-danger !bg-[#fff5f5]' : ''
      } ${this.disabled() ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`,
  );

  constructor() {
    // Position the menu and keep it aligned on scroll/resize while open.
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

    // Close on outside click (trigger + portal menu both count as "inside").
    effect((onCleanup) => {
      if (!this.open()) return;
      const handler = (e: MouseEvent) => {
        const t = e.target as Node;
        if (this.trigger().nativeElement.contains(t) || this.menu()?.nativeElement.contains(t)) return;
        this.open.set(false);
        this.query.set('');
        this.blurred.emit();
      };
      document.addEventListener('mousedown', handler);
      onCleanup(() => document.removeEventListener('mousedown', handler));
    });

    effect((onCleanup) => {
      if (this.open()) {
        this.activeIndex.set(0);
        const t = setTimeout(() => this.search()?.nativeElement.focus(), 0);
        onCleanup(() => clearTimeout(t));
      }
    });

    effect(() => {
      const index = this.activeIndex();
      const list = this.list();
      if (!this.open() || !list) return;
      const el = list.nativeElement.children[index] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  private updatePosition(): void {
    const r = this.trigger().nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < MENU_HEIGHT && r.top > spaceBelow;
    this.windowHeight.set(window.innerHeight);
    this.pos.set({ top: openUp ? r.top : r.bottom, left: r.left, width: r.width, openUp });
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  protected choose(val: string): void {
    this.valueChange.emit(val);
    this.open.set(false);
    this.query.set('');
    this.blurred.emit();
  }

  protected handleKeyDown(e: KeyboardEvent): void {
    const open = this.open();
    if (!open && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ')) {
      e.preventDefault();
      this.open.set(true);
      return;
    }
    if (!open) return;
    const filtered = this.filtered();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex.update((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[this.activeIndex()];
      if (opt) this.choose(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.open.set(false);
      this.query.set('');
    }
  }
}
