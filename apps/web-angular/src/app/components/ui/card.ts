import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** <div appCard heading="…"> — components/ui/Card.tsx. */
@Component({
  selector: 'div[appCard]',
  template: `
    <div class="bg-navy px-[22px] py-3 flex items-center gap-[10px]">
      <div class="w-[6px] h-[6px] rounded-full bg-gold shrink-0"></div>
      <h3 class="text-[13px] font-semibold text-white tracking-[0.03em] uppercase">{{ heading() }}</h3>
    </div>
    <div class="p-[22px] overflow-hidden">
      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bg-white border border-border rounded-theme shadow-theme mb-5 overflow-hidden' },
})
export class CardComponent {
  readonly heading = input('');
}
