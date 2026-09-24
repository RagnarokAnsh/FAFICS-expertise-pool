import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../components/ui/button';
import { CardComponent } from '../../components/ui/card';

/** app/apply/resume/[token]/error.tsx */
@Component({
  selector: 'app-resume-error',
  imports: [RouterLink, CardComponent, ButtonComponent],
  template: `
    <div class="max-w-[600px] mx-auto py-12 px-4">
      <div appCard heading="">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-[32px]">⏳</span>
          </div>
          <h2 class="font-serif text-[28px] font-bold text-navy mb-4">This editing link is invalid or has expired.</h2>
          <p class="text-[15px] text-text-mid mb-8">
            Editing links are valid for 3 hours and can only be used once. To continue editing your application, request
            a new link.
          </p>
          <a routerLink="/status"><button appButton variant="primary">Request a new link →</button></a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ResumeErrorComponent {}
