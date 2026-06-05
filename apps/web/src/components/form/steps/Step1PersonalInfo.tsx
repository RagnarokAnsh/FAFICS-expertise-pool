import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Card } from '../../ui/Card';
import { Field, Input, Select } from '../../ui/Field';
import { SearchableSelect, SearchableOption } from '../../ui/SearchableSelect';
import { PhoneInput } from '../../ui/PhoneInput';
import { Button } from '../../ui/Button';
import { ApplicationData } from '../../../lib/schemas/application.schema';
import { COUNTRY_DATA, NATIONALITIES, flagEmoji } from '../../../lib/constants/countries';

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

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

export function Step1PersonalInfo({ onNext }: StepProps) {
  const { register, control, formState: { errors }, trigger } = useFormContext<ApplicationData>();

  // Calendar bounds: applicants must be at least 18, and no older than 120.
  const now = new Date();
  const maxDob = fmtDate(new Date(now.getFullYear() - 18, now.getMonth(), now.getDate()));
  const minDob = fmtDate(new Date(now.getFullYear() - 120, now.getMonth(), now.getDate()));
  const todayStr = fmtDate(now);

  const handleNext = async () => {
    // Validate Step 1 fields before proceeding
    const isValid = await trigger(['personal', 'association']);
    if (isValid) {
      onNext();
    }
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="mb-7">
        <h2 className="font-serif text-[22px] font-bold text-navy mb-1">Personal Information</h2>
        <p className="text-[13.5px] text-text-mid leading-relaxed">
          Fields marked <span className="text-gold">*</span> are mandatory.
        </p>
      </div>

      <div className="bg-gold-light border-[1.5px] border-gold rounded-theme px-[26px] py-[22px] mb-7 mt-7">
        <p className="text-[13.5px] text-text leading-[1.8] mb-2.5">
          <strong>FAFICS and the Expertise Pool</strong>
        </p>
        <p className="text-[13.5px] text-text leading-[1.8] mb-2.5">
          Members of FAFICS Associations can participate in the work of FAFICS through service in:
        </p>
        <ul className="list-disc pl-5 mb-2.5 text-[13.5px] text-text leading-[1.8]">
          <li>The elected positions of President, Vice-President, Secretary, Treasurer.</li>
          <li>FAFICS Standing Committees in the areas of Pensions, After Service Health and Life Insurance, Communications and Membership, including serving as Chairs/Co-Chairs of these Committees, who are nominated by the President and appointed by the Council; on the United Nations Pension Board as part of the FAFICS delegation or on one of the Pension Board’s subsidiary bodies/working groups.</li>
        </ul>
        <p className="text-[13.5px] text-text leading-[1.8] mb-2.5">
          The FAFICS Rules of Procedure adopted by the FAFICS Council, established an Expertise Pool to serve as a repository of Association members interested in serving in these positions.
        </p>
        <p className="text-[13.5px] text-text leading-[1.8] mb-2.5">
          Selection for non-elected positions is managed through the Expertise Pool. If you would wish to serve in a non-elected position, please complete and submit the Expertise Pool Form through your Local Association President or designated official within your Association, for inclusion in the Expertise Pool.
        </p>
        <p className="text-[13.5px] text-text leading-[1.8] mb-2.5">
          Individuals may remain in the Expertise Pool for a period of three years, after which they will be contacted to ascertain their continued interest and availability to serve in FAFICS.
        </p>
        <p className="text-[13.5px] text-text leading-[1.8] mb-0">
          <strong>Mandatory:</strong> Before you complete the Expertise Pool Form, please visit <a href="https://fafics.org" target="_blank" rel="noreferrer" className="text-navy-mid font-semibold">FAFICS.ORG</a> to fully acquaint yourself with FAFICS.
        </p>
      </div>

      <Card title="Personal Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="First Name" required error={errors.personal?.firstName?.message}>
            <Input placeholder="e.g. John" hasError={!!errors.personal?.firstName} {...register('personal.firstName')} />
          </Field>
          <Field label="Middle Name" error={errors.personal?.middleName?.message}>
            <Input placeholder="e.g. Michael" hasError={!!errors.personal?.middleName} {...register('personal.middleName')} />
          </Field>
          <Field label="Last Name" required error={errors.personal?.lastName?.message}>
            <Input placeholder="e.g. Doe" hasError={!!errors.personal?.lastName} {...register('personal.lastName')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3.5">
          <Field label="Date of Birth" required hint="Must be 18 years or older" error={errors.personal?.dateOfBirth?.message}>
            <Input type="date" min={minDob} max={maxDob} hasError={!!errors.personal?.dateOfBirth} {...register('personal.dateOfBirth')} />
          </Field>
          <Field label="Nationality" required error={errors.personal?.nationality?.message}>
            <Controller
              control={control}
              name="personal.nationality"
              render={({ field }) => (
                <SearchableSelect
                  options={NATIONALITY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Select nationality…"
                  hasError={!!errors.personal?.nationality}
                />
              )}
            />
          </Field>
          <Field label="Second Nationality" hint="(if any)" error={errors.personal?.secondNationality?.message}>
            <Controller
              control={control}
              name="personal.secondNationality"
              render={({ field }) => (
                <SearchableSelect
                  options={NATIONALITY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="None / not applicable"
                  hasError={!!errors.personal?.secondNationality}
                />
              )}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3.5">
          <Field label="Gender" required error={errors.personal?.gender?.message}>
            <Select hasError={!!errors.personal?.gender} {...register('personal.gender')}>
              <option value="">Select…</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Non-binary / Third gender">Non-binary / Third gender</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </Select>
          </Field>
          <Field label="Phone Number" required hint="Select country code, then enter number" error={errors.personal?.phone?.message}>
            <Controller
              control={control}
              name="personal.phone"
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  hasError={!!errors.personal?.phone}
                />
              )}
            />
          </Field>
          <Field label="Mobile No (WhatsApp)" hint="Optional" error={errors.personal?.whatsapp?.message}>
            <Controller
              control={control}
              name="personal.whatsapp"
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  hasError={!!errors.personal?.whatsapp}
                />
              )}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
          <Field label="Email Address" required error={errors.personal?.email?.message}>
            <Input type="email" placeholder="name@example.com" hasError={!!errors.personal?.email} {...register('personal.email')} />
          </Field>
          <Field label="Date of Separation from UN Service" required error={errors.personal?.separationDate?.message}>
            <Input type="date" min={minDob} max={todayStr} hasError={!!errors.personal?.separationDate} {...register('personal.separationDate')} />
          </Field>
        </div>
      </Card>

      <Card title="Member Association Details">
        <p className="text-[12.5px] text-text-muted mb-3.5 leading-relaxed">
          Your application will be routed to the President of your Local Association for endorsement. Please ensure these details are accurate — the President's email is required for notification.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Member Association" required error={errors.association?.associationName?.message}>
            <Input placeholder="e.g. AFICS-NY, USA" hasError={!!errors.association?.associationName} {...register('association.associationName')} />
          </Field>
          <Field label="Country" required error={errors.association?.associationCountry?.message}>
            <Controller
              control={control}
              name="association.associationCountry"
              render={({ field }) => (
                <SearchableSelect
                  options={COUNTRY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Select country…"
                  hasError={!!errors.association?.associationCountry}
                />
              )}
            />
          </Field>
          <Field label="General Email of Association" error={errors.association?.associationGeneralEmail?.message}>
            <Input type="email" placeholder="info@association.org" hasError={!!errors.association?.associationGeneralEmail} {...register('association.associationGeneralEmail')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
          <Field label="Email of Association President" required hint="Used to route your application for endorsement" error={errors.association?.presidentEmail?.message}>
            <Input type="email" placeholder="president@association.org" hasError={!!errors.association?.presidentEmail} {...register('association.presidentEmail')} />
          </Field>
          <Field label="Phone of Association President" required hint="Select country code, then enter number" error={errors.association?.presidentPhone?.message}>
            <Controller
              control={control}
              name="association.presidentPhone"
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  hasError={!!errors.association?.presidentPhone}
                />
              )}
            />
          </Field>
        </div>

        <div className="flex items-center gap-2.5 mt-5 mb-3">
          <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap">Other Association Membership (optional)</span>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Associate Member in other Association" error={errors.association?.associateMemberName?.message}>
            <Input placeholder="e.g. AFICS Geneva" hasError={!!errors.association?.associateMemberName} {...register('association.associateMemberName')} />
          </Field>
          <Field label="Country of other Association" error={errors.association?.associateMemberCountry?.message}>
            <Controller
              control={control}
              name="association.associateMemberCountry"
              render={({ field }) => (
                <SearchableSelect
                  options={COUNTRY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Select country…"
                  hasError={!!errors.association?.associateMemberCountry}
                />
              )}
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-5 border-t border-border mt-2">
        <span></span>
        <Button variant="primary" onClick={handleNext}>
          Next: Education & Languages
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Button>
      </div>
    </div>
  );
}
