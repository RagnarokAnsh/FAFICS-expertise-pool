import React from 'react';
import { Button } from './Button';

interface DynamicRowListProps<T> {
  items: T[];
  renderRow: (item: T, index: number, onRemove: () => void) => React.ReactNode;
  onAdd: () => void;
  addLabel: string;
  /**
   * Column template applied on lg+ so row fields line up with the section's
   * header labels (which are also lg-only). Small screens keep the responsive
   * auto-fit layout.
   */
  gridTemplateColumns?: string;
}

export function DynamicRowList<T>({ items, renderRow, onAdd, addLabel, gridTemplateColumns }: DynamicRowListProps<T>) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5">
        {items.map((item: any, index) => (
          <div key={item.id || index} className="flex items-start gap-2 bg-off-white border border-border rounded-lg p-3 relative">
            <div className="text-[12px] font-bold text-text-muted w-5 pt-[13px] shrink-0 text-center">
              {index + 1}
            </div>
            {/*
              min-w-0 on the grid AND on every descendant field lets the fr tracks
              shrink below the fields' intrinsic width — without it, inputs/selects
              force the row wider than its container (horizontal scroll on large
              screens) and the fr columns stop lining up with the header above.
              Below lg the grid auto-fits/wraps; on lg it uses the section's
              explicit column template so fields sit under their header labels.
            */}
            <div
              className="flex-1 grid gap-2.5 min-w-0 [&>*]:min-w-0 [&_input]:min-w-0 [&_select]:min-w-0 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] lg:[grid-template-columns:var(--row-cols,repeat(auto-fit,minmax(150px,1fr)))]"
              style={
                gridTemplateColumns
                  ? ({ '--row-cols': gridTemplateColumns } as React.CSSProperties)
                  : undefined
              }
            >
              {renderRow(item, index, () => {})}
            </div>
          </div>
        ))}
      </div>
      <div>
        <Button type="button" variant="add" onClick={onAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
