import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormStore } from '../../../core/form/form-store';
import { ControllerDirective, RegisterDirective } from '../../../core/form/register.directive';
import { ToastService } from '../../../core/toast.service';
import { COUNTRY_DATA, NATIONALITIES, flagEmoji } from '../../../lib/constants/countries';
import { PRESIDENT_EMAIL_MESSAGE, emailsMatchPresident } from '../../../lib/schemas/application.schema';
import { STEP_ERROR_MESSAGE, focusFirstInvalid } from '../../../lib/utils/focus-first-invalid';
import { ButtonComponent } from '../../ui/button';
import { CardComponent } from '../../ui/card';
import { FieldComponent, InputDirective, SelectDirective } from '../../ui/field';
import { PhoneInputComponent } from '../../ui/phone-input';
import { SearchableOption, SearchableSelectComponent } from '../../ui/searchable-select';

/** Country options carry a flag prefix and search by name + ISO code. */
const COUNTRY_OPTIONS: SearchableOption[] = COUNTRY_DATA.map((c) => ({
  value: c.name,
  label: c.name,
  prefix: flagEmoji(c.code),
  keywords: c.code,
}));

const NATIONALITY_OPTIONS: SearchableOption[] = NATIONALITIES.map((n) => ({
  value: n,
  label: n,
}));

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** components/form/steps/Step1PersonalInfo.tsx */
@Component({
  selector: 'div[appStep1PersonalInfo]',
  imports: [
    CardComponent,
    FieldComponent,
    InputDirective,
    SelectDirective,
    SearchableSelectComponent,
    PhoneInputComponent,
    ButtonComponent,
    RegisterDirective,
    ControllerDirective,
  ],
  template: `
    <div class="mb-7">
      <h2 class="font-serif text-[22px] font-bold text-navy mb-1">Personal Information</h2>
      <p class="text-[13.5px] text-text-mid leading-relaxed">
        Fields marked <span class="text-gold">*</span> are mandatory.
      </p>
    </div>

    <div class="bg-gold-light border-[1.5px] border-gold rounded-theme px-[26px] py-[22px] mb-7 mt-7">
      <p class="text-[13.5px] text-text leading-[1.8] mb-2.5">
        <strong>The FAFICS Expertise Pool</strong>
      </p>
      <p class="text-[13.5px] text-text leading-[1.8] mb-2.5">
        All former International Civil Servants who are Members of FAFICS Association can volunteer to participate in the
        work of FAFICS through service to:
      </p>
      <ul class="list-disc pl-5 mb-2.5 text-[13.5px] text-text leading-[1.8]">
        <li>
          FAFICS Standing Committees in the areas of Pensions, After Service Health and Life Insurance, Communications and
          Membership, including serving as Chairs/Co-Chairs of these Committees, who are nominated by the President and
          appointed by the Council; on the United Nations Pension Board as part of the FAFICS delegation or on one of the
          Pension Board’s subsidiary bodies/working groups.
        </li>
      </ul>
      <p class="text-[13.5px] text-text leading-[1.8] mb-2.5">
        The FAFICS Rules of Procedure adopted by the FAFICS Council, established an Expertise Pool to serve as a
        repository of Association members interested in serving in these positions.
      </p>
      <p class="text-[13.5px] text-text leading-[1.8] mb-2.5">
        Selection for these non-elected positions is managed through the Expertise Pool. If you would wish to serve in a
        non-elected position, please complete and submit the Expertise Pool Form through your Local Association
        President or designated official within your Association, for inclusion in the Expertise Pool.
      </p>
      <p class="text-[13.5px] text-text leading-[1.8] mb-2.5">
        Individuals may remain in the Expertise Pool for a period of three years, after which they will be contacted to
        ascertain their continued interest and availability to serve in FAFICS.
      </p>
      <p class="text-[13.5px] text-text leading-[1.8] mb-0">
        <strong>Mandatory:</strong> Before you complete the Expertise Pool Form, please visit
        <a href="https://fafics.org" target="_blank" rel="noreferrer" class="text-navy-mid font-semibold">FAFICS.ORG</a> to
        fully acquaint yourself with FAFICS.
      </p>
    </div>

    <div appCard heading="Personal Information">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div appField label="First Name" required [error]="form.error('personal.firstName')?.message">
          <input appInput appRegister="personal.firstName" placeholder="e.g. John" [hasError]="!!form.error('personal.firstName')" />
        </div>
        <div appField label="Middle Name" [error]="form.error('personal.middleName')?.message">
          <input appInput appRegister="personal.middleName" placeholder="e.g. Michael" [hasError]="!!form.error('personal.middleName')" />
        </div>
        <div appField label="Last Name" required [error]="form.error('personal.lastName')?.message">
          <input appInput appRegister="personal.lastName" placeholder="e.g. Doe" [hasError]="!!form.error('personal.lastName')" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3.5">
        <div
          appField
          label="Date of Birth"
          required
          hint="Must be 18 years or older"
          [error]="form.error('personal.dateOfBirth')?.message"
        >
          <input
            appInput
            appRegister="personal.dateOfBirth"
            type="date"
            [min]="minDob"
            [max]="maxDob"
            [hasError]="!!form.error('personal.dateOfBirth')"
          />
        </div>
        <div appField label="Nationality" required [error]="form.error('personal.nationality')?.message">
          <div
            appSearchableSelect
            appController="personal.nationality"
            [options]="nationalityOptions"
            [value]="form.value('personal.nationality')"
            (valueChange)="form.handleControllerChange('personal.nationality', $event)"
            placeholder="Select nationality…"
            [hasError]="!!form.error('personal.nationality')"
          ></div>
        </div>
        <div
          appField
          label="Second Nationality"
          hint="(if any)"
          [error]="form.error('personal.secondNationality')?.message"
        >
          <div
            appSearchableSelect
            appController="personal.secondNationality"
            [options]="nationalityOptions"
            [value]="form.value('personal.secondNationality')"
            (valueChange)="form.handleControllerChange('personal.secondNationality', $event)"
            placeholder="Select second nationality…"
            [hasError]="!!form.error('personal.secondNationality')"
          ></div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3.5">
        <div appField label="Gender" required [error]="form.error('personal.gender')?.message">
          <select appSelect appRegister="personal.gender" [hasError]="!!form.error('personal.gender')">
            <option value="">Select…</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Non-binary / Third gender">Non-binary / Third gender</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
        <div
          appField
          label="Phone Number"
          required
          hint="Select country code, then enter number"
          [error]="form.error('personal.phone')?.message"
        >
          <div
            appPhoneInput
            appController="personal.phone"
            [value]="form.value('personal.phone')"
            (valueChange)="form.handleControllerChange('personal.phone', $event)"
            [hasError]="!!form.error('personal.phone')"
          ></div>
        </div>
        <div appField label="Mobile No (WhatsApp)" hint="Optional" [error]="form.error('personal.whatsapp')?.message">
          <div
            appPhoneInput
            appController="personal.whatsapp"
            [value]="form.value('personal.whatsapp')"
            (valueChange)="form.handleControllerChange('personal.whatsapp', $event)"
            [hasError]="!!form.error('personal.whatsapp')"
          ></div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
        <div appField label="Email Address" required [error]="form.error('personal.email')?.message">
          <input
            appInput
            appRegister="personal.email"
            type="email"
            placeholder="name@example.com"
            [hasError]="!!form.error('personal.email')"
          />
        </div>
        <div
          appField
          label="Date of Separation from UN Service"
          required
          [error]="form.error('personal.separationDate')?.message"
        >
          <input
            appInput
            appRegister="personal.separationDate"
            type="date"
            [min]="minDob"
            [max]="todayStr"
            [hasError]="!!form.error('personal.separationDate')"
          />
        </div>
      </div>
    </div>

    <div appCard heading="Member Association Details">
      <p class="text-[12.5px] text-text-muted mb-3.5 leading-relaxed">
        Your application will be routed to the President of your Local Association for endorsement. Please ensure these
        details are accurate — the President's email is required for notification.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div appField label="Member Association" required [error]="form.error('association.associationName')?.message">
          <input
            appInput
            appRegister="association.associationName"
            [inputFilter]="stripDigits"
            placeholder="e.g. AFICS-NY, USA"
            [hasError]="!!form.error('association.associationName')"
          />
        </div>
        <div appField label="Country" required [error]="form.error('association.associationCountry')?.message">
          <div
            appSearchableSelect
            appController="association.associationCountry"
            [options]="countryOptions"
            [value]="form.value('association.associationCountry')"
            (valueChange)="form.handleControllerChange('association.associationCountry', $event)"
            placeholder="Select country…"
            [hasError]="!!form.error('association.associationCountry')"
          ></div>
        </div>
        <div
          appField
          label="General Email of Association"
          [error]="form.error('association.associationGeneralEmail')?.message"
        >
          <input
            appInput
            appRegister="association.associationGeneralEmail"
            type="email"
            placeholder="info@association.org"
            [hasError]="!!form.error('association.associationGeneralEmail')"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
        <div
          appField
          label="Email of Association President"
          required
          hint="Used to route your application for endorsement"
          [error]="form.error('association.presidentEmail')?.message"
        >
          <input
            appInput
            appRegister="association.presidentEmail"
            type="email"
            placeholder="president@association.org"
            [hasError]="!!form.error('association.presidentEmail')"
          />
        </div>
        <div
          appField
          label="Phone of Association President"
          hint="Optional — select country code, then enter number"
          [error]="form.error('association.presidentPhone')?.message"
        >
          <div
            appPhoneInput
            appController="association.presidentPhone"
            [value]="form.value('association.presidentPhone')"
            (valueChange)="form.handleControllerChange('association.presidentPhone', $event)"
            [hasError]="!!form.error('association.presidentPhone')"
          ></div>
        </div>
      </div>

      <div class="flex items-center gap-2.5 mt-5 mb-3">
        <span class="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap"
          >Other Association Membership (optional)</span
        >
        <div class="flex-1 h-px bg-border"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          appField
          label="Country of other Association Membership"
          [error]="form.error('association.associateMemberCountry')?.message"
        >
          <div
            appSearchableSelect
            appController="association.associateMemberCountry"
            [options]="countryOptions"
            [value]="form.value('association.associateMemberCountry')"
            (valueChange)="form.handleControllerChange('association.associateMemberCountry', $event)"
            placeholder="Select country…"
            [hasError]="!!form.error('association.associateMemberCountry')"
          ></div>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center pt-5 border-t border-border mt-2">
      <span></span>
      <button appButton variant="primary" (click)="handleNext()">
        Next: Education &amp; Languages
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-4 h-4">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'animate-[fadeIn_0.25s_ease]' },
})
export class Step1PersonalInfoComponent {
  readonly next = output<void>();

  protected readonly form = inject(FormStore);
  private readonly toast = inject(ToastService);
  protected readonly countryOptions = COUNTRY_OPTIONS;
  protected readonly nationalityOptions = NATIONALITY_OPTIONS;
  protected readonly stripDigits = (value: string) => value.replace(/\d/g, '');

  // Calendar bounds: applicants must be at least 18, and no older than 120.
  private readonly now = new Date();
  protected readonly maxDob = fmtDate(new Date(this.now.getFullYear() - 18, this.now.getMonth(), this.now.getDate()));
  protected readonly minDob = fmtDate(new Date(this.now.getFullYear() - 120, this.now.getMonth(), this.now.getDate()));
  protected readonly todayStr = fmtDate(this.now);

  protected async handleNext(): Promise<void> {
    // Validate Step 1 fields before proceeding
    const isValid = await this.form.trigger(['personal', 'association']);
    if (!isValid) {
      this.toast.showToast(STEP_ERROR_MESSAGE, 'error');
      focusFirstInvalid();
      return;
    }
    // Cross-field check: the endorsement can't be routed to the applicant
    // themselves. Checked here because the schema-level rule only runs once the
    // whole form parses (i.e. at final submit).
    const { personal, association } = this.form.getValues();
    if (emailsMatchPresident(personal?.email, association?.presidentEmail)) {
      this.form.setError('association.presidentEmail', { type: 'custom', message: PRESIDENT_EMAIL_MESSAGE });
      this.toast.showToast(PRESIDENT_EMAIL_MESSAGE, 'error');
      focusFirstInvalid();
      return;
    }
    this.next.emit();
  }
}
