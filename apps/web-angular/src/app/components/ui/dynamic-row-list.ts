import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, input, output } from '@angular/core';
import { ButtonComponent } from './button';

export interface RowContext {
  $implicit: string;
  index: number;
}

/**
 * <div appDynamicRowList [items]="fieldIds" [rowTemplate]="tpl"> —
 * components/ui/DynamicRowList.tsx. The row template's root nodes become the
 * grid's direct children, exactly like the React renderRow fragment. Each
 * row also gets its own remove button on the right (see `canRemove`); section
 * headers above the list pad their right side by 48px (pr-12) to match.
 */
@Component({
  selector: 'div[appDynamicRowList]',
  imports: [NgTemplateOutlet, ButtonComponent],
  template: `
    <div class="flex flex-col gap-2.5">
      @for (item of items(); track item; let index = $index) {
        <div class="flex items-start gap-2 bg-off-white border border-border rounded-lg p-3 relative">
          <div class="text-[12px] font-bold text-text-muted w-5 pt-[13px] shrink-0 text-center">{{ index + 1 }}</div>
          <!--
            min-w-0 on the grid AND on every descendant field lets the fr tracks
            shrink below the fields' intrinsic width — without it, inputs/selects
            force the row wider than its container (horizontal scroll on large
            screens) and the fr columns stop lining up with the header above.
            Below lg the grid auto-fits/wraps; on lg it uses the section's
            explicit column template so fields sit under their header labels.
          -->
          <div
            class="flex-1 grid gap-2.5 min-w-0 [&>*]:min-w-0 [&_input]:min-w-0 [&_select]:min-w-0 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] lg:[grid-template-columns:var(--row-cols,repeat(auto-fit,minmax(150px,1fr)))]"
            [style.--row-cols]="gridTemplateColumns()"
          >
            <ng-container *ngTemplateOutlet="rowTemplate(); context: { $implicit: item, index: index }" />
          </div>
          <!--
            Remove sits in its own slot beside the grid (never inside a column),
            centred on the first line of fields. The slot is kept when the row
            can't be removed so columns stay under their headers.
          -->
          <div class="w-7 shrink-0">
            @if (canRemove()) {
              <button
                appButton
                type="button"
                variant="remove"
                [attr.aria-label]="removeLabel() + ' ' + (index + 1)"
                (click)="remove.emit(index)"
              >
                ×
              </button>
            }
          </div>
        </div>
      }
    </div>
    <div>
      <button appButton type="button" variant="add" (click)="add.emit()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-3.5 h-3.5">
          <path d="M12 5v14M5 12h14" /></svg
        >{{ addLabel() }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2.5' },
})
export class DynamicRowListComponent {
  /** Stable row keys (FieldArray ids). */
  readonly items = input.required<string[]>();
  readonly rowTemplate = input.required<TemplateRef<RowContext>>();
  readonly addLabel = input.required<string>();
  /**
   * Column template applied on lg+ so row fields line up with the section's
   * header labels (which are also lg-only). Small screens keep the responsive
   * auto-fit layout.
   */
  readonly gridTemplateColumns = input<string | undefined>(undefined);
  /** Show the remove (×) button on each row, e.g. false when only one row must stay. */
  readonly canRemove = input<boolean>(true);
  /** Screen-reader label, numbered per row: "Remove position 2". */
  readonly removeLabel = input<string>('Remove row');
  readonly add = output<void>();
  readonly remove = output<number>();
}
