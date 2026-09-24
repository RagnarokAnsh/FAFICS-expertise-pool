import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplicationFormComponent } from '../../components/form/application-form';

/** app/apply/page.tsx */
@Component({
  selector: 'app-apply-page',
  imports: [ApplicationFormComponent],
  template: `
    <div class="min-h-screen bg-off-white">
      <app-application-form />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ApplyPage {}
