import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Card } from '../../ui/Card';
import { Input, Select, TextArea } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { DynamicRowList } from '../../ui/DynamicRowList';
import { MultiSelect } from '../../ui/MultiSelect';
import { ApplicationData } from '../../../lib/schemas/application.schema';
import { UN_AGENCIES, UN_GRADES, FAFICS_ROLES, FAFICS_COMMITTEES, COMMITTEE_OTHER, AREAS_OF_EXPERTISE } from '../../../lib/constants/work';

// FAFICS "Area of Contribution" stores multiple committees as a delimited
// string in the existing single column. '; ' is safe — committee names contain
// no semicolons.
const COMMITTEE_SEP = '; ';

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

const DURATIONS = [
  { value: 0.5, label: '< 1 year' },
  { value: 1.0, label: '1 year' },
  { value: 2.0, label: '2 years' },
  { value: 5.0, label: '3-5 years' },
  { value: 10.0, label: '6-10 years' },
  { value: 20.0, label: '11-20 years' },
  { value: 99.0, label: '20+ years' },
];

export function Step3WorkExperience({ onNext, onBack }: StepProps) {
  const { register, control, setValue, formState: { errors }, trigger } = useFormContext<ApplicationData>();
  
  const { fields: unFields, append: appendUn, remove: removeUn } = useFieldArray({ control, name: "unExperiences" });
  const { fields: nonUnFields, append: appendNonUn, remove: removeNonUn } = useFieldArray({ control, name: "nonUnExperiences" });
  const { fields: faficsFields, append: appendFafics, remove: removeFafics } = useFieldArray({ control, name: "faficsExperiences" });
  const { fields: localFields, append: appendLocal, remove: removeLocal } = useFieldArray({ control, name: "localExperiences" });

  React.useEffect(() => {
    if (unFields.length === 0) appendUn({ agency: '', positionTitle: '', grade: '', areaOfExpertise: '', sortOrder: 1 });
  }, []);

  const handleNext = async () => {
    const isValid = await trigger(['unExperiences', 'nonUnExperiences', 'faficsExperiences', 'localExperiences', 'unExperienceSummary', 'nonUnExperienceSummary', 'faficsExperienceSummary', 'localExperienceSummary']);
    if (isValid) onNext();
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="mb-7">
        <h2 className="font-serif text-[22px] font-bold text-navy mb-1">Work Experience</h2>
        <p className="text-[13.5px] text-text-mid leading-relaxed">
          List your last 2–3 positions for each category. Use <strong>+ Add Position</strong> to add rows.
        </p>
      </div>

      <Card title="A — United Nations Experience">
        {errors.unExperiences?.root?.message && (
          <p className="text-danger text-sm mb-3">{errors.unExperiences.root.message}</p>
        )}
        <div className="hidden lg:grid gap-2.5 pb-1 px-11" style={{ gridTemplateColumns: '1.2fr 1.4fr 80px 1fr 100px' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Agency</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Position Held</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Grade</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Expertise</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Years</span>
        </div>
        
        <DynamicRowList
          items={unFields}
          onAdd={() => appendUn({ agency: '', positionTitle: '', sortOrder: unFields.length + 1 })}
          addLabel="Add Position"
          renderRow={(field, index, _onRemove) => (
            <>
              <Select hasError={!!errors.unExperiences?.[index]?.agency} {...register(`unExperiences.${index}.agency`)}>
                <option value="" hidden>Agency...</option>
                {UN_AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
              <Input placeholder="Position Title" hasError={!!errors.unExperiences?.[index]?.positionTitle} {...register(`unExperiences.${index}.positionTitle`)} />
              <Select hasError={!!errors.unExperiences?.[index]?.grade} {...register(`unExperiences.${index}.grade`)}>
                <option value="" hidden>Grade</option>
                {UN_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
              <Select hasError={!!errors.unExperiences?.[index]?.areaOfExpertise} {...register(`unExperiences.${index}.areaOfExpertise`)}>
                <option value="" hidden>Area...</option>
                {AREAS_OF_EXPERTISE.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
              <div className="flex gap-2">
                <Select className="flex-1" hasError={!!errors.unExperiences?.[index]?.durationYears} {...register(`unExperiences.${index}.durationYears`, { setValueAs: (v: string) => v === '' ? undefined : parseFloat(v) })}>
                  <option value="" hidden>Years</option>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                {unFields.length > 1 && <Button type="button" variant="remove" onClick={() => removeUn(index)}>×</Button>}
              </div>
            </>
          )}
        />
        <div className="mt-4">
          <div className="flex items-center gap-2.5 my-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap">Summary of proven UN experience & achievements</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <TextArea placeholder="Briefly describe your key achievements and contributions in UN organizations (bullet points preferred)…" {...register('unExperienceSummary')} />
        </div>
      </Card>

      <Card title="B — Non-UN Experience">
        <div className="hidden lg:grid gap-2.5 pb-1 px-11" style={{ gridTemplateColumns: '1.2fr 1.4fr 1fr 100px' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Organization</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Position Held</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Expertise</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Years</span>
        </div>
        
        <DynamicRowList
          items={nonUnFields}
          onAdd={() => appendNonUn({ organization: '', positionTitle: '', sortOrder: nonUnFields.length + 1 })}
          addLabel="Add Position"
          renderRow={(field, index, _onRemove) => (
            <>
              <Input placeholder="Organization" {...register(`nonUnExperiences.${index}.organization`)} />
              <Input placeholder="Position Title" {...register(`nonUnExperiences.${index}.positionTitle`)} />
              <Select {...register(`nonUnExperiences.${index}.areaOfExpertise`)}>
                <option value="" hidden>Area...</option>
                {AREAS_OF_EXPERTISE.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
              <div className="flex gap-2">
                <Select className="flex-1" {...register(`nonUnExperiences.${index}.durationYears`, { setValueAs: (v: string) => v === '' ? undefined : parseFloat(v) })}>
                  <option value="" hidden>Years</option>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                <Button type="button" variant="remove" onClick={() => removeNonUn(index)}>×</Button>
              </div>
            </>
          )}
        />
        <div className="mt-4">
          <div className="flex items-center gap-2.5 my-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap">Summary of non-UN experience & achievements</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <TextArea placeholder="Briefly describe your key contributions outside the UN system…" {...register('nonUnExperienceSummary')} />
        </div>
      </Card>

      <Card title="C — FAFICS Experience">
        <div className="hidden lg:grid gap-2.5 pb-1 px-11" style={{ gridTemplateColumns: '1.5fr 1fr 120px' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Position Held</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Contribution</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Duration (years)</span>
        </div>
        
        <DynamicRowList
          items={faficsFields}
          onAdd={() => appendFafics({ positionHeld: '', sortOrder: faficsFields.length + 1 })}
          addLabel="Add Position"
          renderRow={(field, index, _onRemove) => (
            <>
              <Select {...register(`faficsExperiences.${index}.positionHeld`)}>
                <option value="" hidden>Position...</option>
                {FAFICS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
              <Controller
                control={control}
                name={`faficsExperiences.${index}.areaOfContribution`}
                render={({ field }) => {
                  const selected = field.value ? field.value.split(COMMITTEE_SEP).filter(Boolean) : [];
                  const showOther = selected.includes(COMMITTEE_OTHER);
                  return (
                    <div className="flex flex-col gap-1.5">
                      <MultiSelect
                        options={FAFICS_COMMITTEES}
                        value={selected}
                        onChange={(vals) => {
                          field.onChange(vals.join(COMMITTEE_SEP));
                          // Clear the companion free text when "Other" is removed
                          // so a stale value can't linger and re-surface on review.
                          if (!vals.includes(COMMITTEE_OTHER)) {
                            setValue(`faficsExperiences.${index}.areaOfContributionOther`, '');
                          }
                        }}
                        placeholder="Committee(s)…"
                      />
                      {showOther && (
                        <Input
                          placeholder="Please specify other committee / contribution…"
                          {...register(`faficsExperiences.${index}.areaOfContributionOther`)}
                        />
                      )}
                    </div>
                  );
                }}
              />
              <div className="flex gap-2">
                <Select className="flex-1" {...register(`faficsExperiences.${index}.durationYears`, { setValueAs: (v: string) => v === '' ? undefined : parseFloat(v) })}>
                  <option value="" hidden>Years</option>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                <Button type="button" variant="remove" onClick={() => removeFafics(index)}>×</Button>
              </div>
            </>
          )}
        />
        <div className="mt-4">
          <div className="flex items-center gap-2.5 my-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap">Summary of FAFICS contributions & achievements</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <TextArea placeholder="Describe your key contributions to FAFICS…" {...register('faficsExperienceSummary')} />
        </div>
      </Card>

      <Card title="D — Local Association Experience">
        <div className="hidden lg:grid gap-2.5 pb-1 px-11" style={{ gridTemplateColumns: '1.5fr 1fr 120px' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Position Held</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Area of Contribution</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Duration (years)</span>
        </div>
        
        <DynamicRowList
          items={localFields}
          onAdd={() => appendLocal({ positionHeld: '', sortOrder: localFields.length + 1 })}
          addLabel="Add Position"
          renderRow={(field, index, _onRemove) => (
            <>
              <Input placeholder="Position Held" {...register(`localExperiences.${index}.positionHeld`)} />
              <Select {...register(`localExperiences.${index}.areaOfContribution`)}>
                <option value="" hidden>Area...</option>
                {AREAS_OF_EXPERTISE.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
              <div className="flex gap-2">
                <Select className="flex-1" {...register(`localExperiences.${index}.durationYears`, { setValueAs: (v: string) => v === '' ? undefined : parseFloat(v) })}>
                  <option value="" hidden>Years</option>
                  {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
                <Button type="button" variant="remove" onClick={() => removeLocal(index)}>×</Button>
              </div>
            </>
          )}
        />
        <div className="mt-4">
          <div className="flex items-center gap-2.5 my-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-navy-mid whitespace-nowrap">Summary of local association contributions</span>
            <div className="flex-1 h-px bg-border"></div>
          </div>
          <TextArea placeholder="Describe your key contributions to your local association…" {...register('localExperienceSummary')} />
        </div>
      </Card>

      <div className="flex justify-between items-center pt-5 border-t border-border mt-2">
        <Button variant="ghost" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Button>
        <Button variant="primary" onClick={handleNext}>
          Next: Self Assessment
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Button>
      </div>
    </div>
  );
}
