import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../ui/button';
import { CardComponent } from '../ui/card';

/** components/form/TokenExpiredResume.tsx */
@Component({
  selector: 'app-token-expired-resume',
  imports: [RouterLink, CardComponent, ButtonComponent],
  template: `
    <div class="max-w-[600px] mx-auto py-12 px-4 min-h-[calc(100vh-160px)] flex flex-col justify-center">
      <div appCard heading="">
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-[#fff5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="text-[32px]">⏳</span>
          </div>
          <h2 class="font-serif text-[28px] font-bold text-navy mb-4">This editing link has expired</h2>
          <p class="text-[15px] text-text-mid mb-8">
            For security, editing links are only valid for a limited time. To continue editing your application, request a
            new link.
          </p>
          <a routerLink="/status"><button appButton variant="primary">Go to Status Page</button></a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TokenExpiredResumeComponent {}
