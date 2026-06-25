import React, { useEffect } from 'react';
import { useFormContext, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { Card } from '../../ui/Card';
import { Input, TextArea } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { MultiSelect } from '../../ui/MultiSelect';
import { ApplicationData } from '../../../lib/schemas/application.schema';
import { FIXED_EXPERTISE_AREAS } from '../../../lib/constants/expertise';
import { FAFICS_COMMITTEES, COMMITTEE_OTHER, COMPETENCIES, MAX_COMPETENCIES } from '../../../lib/constants/work';

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step4SelfAssessment({ onNext, onBack }: StepProps) {
  const { register, control, setValue, formState: { errors }, trigger, getValues } = useFormContext<ApplicationData>();
  
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "expertise",
  });

  const expertiseWatch = useWatch({
    control,
    name: "expertise",
  });

  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Reconcile any saved expertise with the canonical fixed areas so the
    // matrix is ALWAYS rendered in full (per the form structure), with saved
    // levels/preferences overlaid by areaKey and custom "Other" rows kept last.
    const current = getValues('expertise') || [];
    const savedByKey = new Map(
      current.filter((e: any) => !e.isCustom).map((e: any) => [e.areaKey, e]),
    );
    const fixedRows = FIXED_EXPERTISE_AREAS.map((area, index) => {
      const saved = savedByKey.get(area.key);
      return saved
        ? { ...saved, areaLabel: area.label, isCustom: false, sortOrder: index + 1 }
        : {
            areaKey: area.key,
            areaLabel: area.label,
            isPreferred: false,
            isCustom: false,
            sortOrder: index + 1,
          };
    });
    const customRows = current
      .filter((e: any) => e.isCustom)
      .map((e: any, k: number) => ({ ...e, sortOrder: fixedRows.length + k + 1 }));
    replace([...fixedRows, ...customRows]);
  }, [replace, getValues]);

  const handleNext = async () => {
    const isValid = await trigger('expertise');
    if (isValid) onNext();
  };

  const selectedPreferencesCount = expertiseWatch?.filter(e => e.isPreferred)?.length || 0;
  const maxReached = selectedPreferencesCount >= 3;

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="mb-7">
        <h2 className="font-serif text-[22px] font-bold text-navy mb-1">Self-Assessment on Expertise</h2>
        <p className="text-[13.5px] text-text-mid leading-relaxed">
          Rate your level in each area and tick your <strong>top 3 preferred areas</strong> where you wish to support FAFICS. If your area of expertise is not listed below, use the <strong>"+ Add Other Area"</strong> button at the bottom of the table to add it.
        </p>
      </div>

      {errors.expertise?.root?.message && (
        <p className="text-danger text-sm mb-3">{errors.expertise.root.message}</p>
      )}

      <Card title="Expertise Level & Preference">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b-2 border-border text-left bg-off-white" style={{ width: '42%' }}>Area of Expertise / Knowledge</th>
                <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b-2 border-border text-center bg-navy-light" colSpan={3}>Level of Expertise</th>
                <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b-2 border-border text-center bg-off-white" style={{ width: '100px' }}>
                  Preferred<br/>
                  <small className="font-normal normal-case tracking-normal">(Top 3 ✓)</small>
                </th>
              </tr>
              <tr>
                <th className="bg-off-white"></th>
                <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b border-border text-center bg-navy-light" style={{ width: '90px' }}>Average</th>
                <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b border-border text-center bg-navy-light" style={{ width: '90px' }}>Advanced</th>
                <th className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted px-3 py-2.5 border-b border-border text-center bg-navy-light" style={{ width: '90px' }}>Expert</th>
                <th className="bg-off-white border-b border-border"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="hover:bg-navy-light transition-colors border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5 align-middle text-[13.5px] font-medium text-text">
                    {!field.isCustom ? (
                      field.areaLabel
                    ) : (
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Other Area Name" 
                          className="w-full !h-8 !text-[13px]" 
                          hasError={!!errors.expertise?.[index]?.areaLabel}
                          {...register(`expertise.${index}.areaLabel`)} 
                        />
                        <Button type="button" variant="remove" className="!mt-0 shrink-0" onClick={() => remove(index)}>×</Button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-center">
                    <input type="radio" className="w-[17px] h-[17px] accent-navy cursor-pointer" value="average" {...register(`expertise.${index}.expertiseLevel`)} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-center">
                    <input type="radio" className="w-[17px] h-[17px] accent-navy cursor-pointer" value="advanced" {...register(`expertise.${index}.expertiseLevel`)} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-center">
                    <input type="radio" className="w-[17px] h-[17px] accent-navy cursor-pointer" value="expert" {...register(`expertise.${index}.expertiseLevel`)} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-center">
                    <input 
                      type="checkbox" 
                      className="w-[17px] h-[17px] accent-gold cursor-pointer" 
                      disabled={maxReached && !expertiseWatch?.[index]?.isPreferred}
                      {...register(`expertise.${index}.isPreferred`)} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {maxReached && (
          <div className="mt-4 px-3 py-2 bg-gold-light border border-gold rounded-lg text-[13px] text-navy font-medium">
            You have selected your top 3 preferred areas.
          </div>
        )}

        <div className="mt-4">
          <Button
            type="button"
            variant="add"
            onClick={() => append({
              areaKey: `custom_${fields.length}`,
              areaLabel: '',
              isPreferred: false,
              isCustom: true,
              sortOrder: fields.length + 1
            })}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Other Area
          </Button>
        </div>
      </Card>

      <Card title="Competencies — Top 5 Core Strengths">
        <p className="text-[13px] text-text-mid leading-relaxed mb-4">
          Select up to <strong>five</strong> competencies that represent your core strengths.
        </p>
        <Controller
          control={control}
          name="competencies"
          render={({ field }) => (
            <MultiSelect
              options={COMPETENCIES}
              value={field.value ?? []}
              onChange={field.onChange}
              max={MAX_COMPETENCIES}
              placeholder="Select your core strengths…"
            />
          )}
        />
      </Card>

      <Card title="Position / Committee Preference (Optional)">
        <p className="text-[13px] text-text-mid leading-relaxed mb-4">
          If you wish to be considered for a particular FAFICS position or standing committee, indicate your preference(s) below and briefly describe the rationale and what you can offer. This helps committee chairs identify suitable members from the pool.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-[5px]">
            <label className="text-[12px] font-semibold text-text tracking-[0.02em] uppercase">
              Preferred Position(s) / Committee(s)
            </label>
            <Controller
              control={control}
              name="preferredCommittees"
              render={({ field }) => {
                const selected = field.value ?? [];
                const showOther = selected.includes(COMMITTEE_OTHER);
                return (
                  <div className="flex flex-col gap-1.5">
                    <MultiSelect
                      options={FAFICS_COMMITTEES}
                      value={selected}
                      onChange={(vals) => {
                        field.onChange(vals);
                        // Clear the companion free text when "Other" is removed.
                        if (!vals.includes(COMMITTEE_OTHER)) {
                          setValue('preferredCommitteesOther', '');
                        }
                      }}
                      placeholder="Select committee(s)…"
                    />
                    {showOther && (
                      <Input
                        placeholder="Please specify other position / committee…"
                        {...register('preferredCommitteesOther')}
                      />
                    )}
                  </div>
                );
              }}
            />
          </div>
          <div className="flex flex-col gap-[5px]">
            <label className="text-[12px] font-semibold text-text tracking-[0.02em] uppercase">
              Rationale / What You Offer
            </label>
            <TextArea
              placeholder="Briefly explain why you are interested and what relevant skills or experience you bring…"
              {...register('positionPreferenceRationale')}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-between items-center pt-5 border-t border-border mt-2">
        <Button variant="ghost" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Button>
        <Button variant="primary" onClick={handleNext}>
          Next: Consent & Submit
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Button>
      </div>
    </div>
  );
}
