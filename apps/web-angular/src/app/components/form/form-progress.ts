import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

const STEPS = [
  { id: 1, label: 'Personal\nInformation' },
  { id: 2, label: 'Education &\nLanguages' },
  { id: 3, label: 'Work\nExperience' },
  { id: 4, label: 'Self\nAssessment' },
  { id: 5, label: 'Consent &\nSubmit' },
];

/** components/form/FormProgress.tsx */
@Component({
  selector: 'div[appFormProgress]',
  template: `
    <div
      class="max-w-[1020px] mx-auto flex items-stretch overflow-x-auto whitespace-nowrap pb-1 md:pb-0 justify-start md:justify-center"
    >
      @for (step of steps; track step.id; let index = $index) {
        <div [class]="itemClass(step.id)" (click)="onClick(step.id)">
          <div [class]="numClass(step.id)">{{ step.id }}</div>
          <div [class]="labelClass(step.id)">{{ step.label }}</div>
          @if (index < steps.length - 1) {
            <div class="absolute right-0 top-1/2 -translate-y-1/2 w-px h-7 bg-border hidden md:block"></div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bg-white border-b border-border px-4 md:px-8 sticky top-[78px] z-50 shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
  },
})
export class FormProgressComponent {
  readonly currentStep = input.required<number>();
  readonly highestStep = input.required<number>();
  readonly goToStep = output<number>();
  protected readonly steps = STEPS;

  private isActive(id: number) {
    return this.currentStep() === id;
  }

  private isDone(id: number) {
    return id <= this.highestStep() && id !== this.currentStep();
  }

  protected itemClass(id: number): string {
    const isClickable = this.isDone(id) || this.isActive(id);
    // Locked / not-yet-reached tabs aren't clickable — show a disabled cursor.
    let itemClass = `flex-1 min-w-[140px] md:min-w-0 flex items-center gap-2.5 p-[14px_12px] ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'} border-b-[3px] border-transparent transition-all duration-200 relative`;
    if (this.isActive(id)) itemClass += ' !border-navy';
    if (this.isDone(id)) itemClass += ' !border-gold';
    return itemClass;
  }

  protected numClass(id: number): string {
    let numClass =
      'w-[26px] h-[26px] rounded-full border-2 border-border flex items-center justify-center text-[12px] font-semibold text-text-muted shrink-0 transition-all duration-200';
    if (this.isActive(id)) numClass += ' !border-navy !bg-navy !text-white';
    if (this.isDone(id)) numClass += ' !border-gold !bg-gold !text-white';
    return numClass;
  }

  protected labelClass(id: number): string {
    let labelClass =
      'text-[12px] font-medium text-text-muted leading-[1.3] transition-colors duration-200 whitespace-pre-line';
    if (this.isActive(id)) labelClass += ' !text-navy';
    if (this.isDone(id)) labelClass += ' !text-gold';
    return labelClass;
  }

  protected onClick(id: number): void {
    if (this.isDone(id) || this.isActive(id)) {
      this.goToStep.emit(id);
    }
  }
}
