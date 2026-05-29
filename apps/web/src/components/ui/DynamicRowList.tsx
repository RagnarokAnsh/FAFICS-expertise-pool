import React from 'react';
import { Button } from './Button';

interface DynamicRowListProps<T> {
  items: T[];
  renderRow: (item: T, index: number, onRemove: () => void) => React.ReactNode;
  onAdd: () => void;
  addLabel: string;
}

export function DynamicRowList<T>({ items, renderRow, onAdd, addLabel }: DynamicRowListProps<T>) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5">
        {items.map((item: any, index) => (
          <div key={item.id || index} className="flex items-start gap-2 bg-off-white border border-border rounded-lg p-3 relative overflow-x-auto">
            <div className="text-[12px] font-bold text-text-muted w-5 pt-[13px] shrink-0 text-center">
              {index + 1}
            </div>
            <div className="flex-1 grid gap-2.5 min-w-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
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
