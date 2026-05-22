import React, { useEffect } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { ApplicationData } from '../../../lib/schemas/application.schema';
import { FIXED_EXPERTISE_AREAS } from '../../../lib/constants/expertise';

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step4SelfAssessment({ onNext, onBack }: StepProps) {
  const { register, control, formState: { errors }, trigger, getValues } = useFormContext<ApplicationData>();
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "expertise",
  });

  const expertiseWatch = useWatch({
    control,
    name: "expertise",
  });

  const initialized = React.useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const currentExpertise = getValues('expertise');
      if (!currentExpertise || currentExpertise.length === 0) {
        const fixedFields = FIXED_EXPERTISE_AREAS.map((area, index) => ({
          areaKey: area.key,
          areaLabel: area.label,
          isPreferred: false,
          isCustom: false,
          sortOrder: index + 1,
        }));
        append(fixedFields);
      }
    }
  }, [append, getValues]);

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
