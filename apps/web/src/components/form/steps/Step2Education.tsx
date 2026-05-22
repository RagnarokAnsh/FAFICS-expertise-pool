import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card } from '../../ui/Card';
import { Input, Select } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { DynamicRowList } from '../../ui/DynamicRowList';
import { ApplicationData } from '../../../lib/schemas/application.schema';

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

const LANGUAGES = ['Arabic', 'Chinese', 'English', 'French', 'Russian', 'Spanish'];
const PROFICIENCIES = [
  { value: 'mother_tongue', label: 'Mother tongue' },
  { value: 'proficient', label: 'Proficient' },
  { value: 'working_level', label: 'Working-level' },
  { value: 'basic', label: 'Basic' },
];

export function Step2Education({ onNext, onBack }: StepProps) {
  const { register, control, formState: { errors }, trigger } = useFormContext<ApplicationData>();
  
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control,
    name: "educations",
  });

  const { fields: langFields, append: appendLang, remove: removeLang } = useFieldArray({
    control,
    name: "languages",
  });

  // Ensure at least one row exists on mount if empty
  React.useEffect(() => {
    if (eduFields.length === 0) {
      appendEdu({ degreeName: '', institution: '', sortOrder: 1 });
    }
    if (langFields.length === 0) {
      appendLang({ language: '', proficiency: 'working_level', sortOrder: 1 });
    }
  }, []);

  const handleNext = async () => {
    const isValid = await trigger(['educations', 'languages']);
    if (isValid) {
      onNext();
    }
  };

  return (
    <div className="animate-[fadeIn_0.25s_ease]">
      <div className="mb-7">
        <h2 className="font-serif text-[22px] font-bold text-navy mb-1">Education & Languages</h2>
        <p className="text-[13.5px] text-text-mid leading-relaxed">
          List your highest academic qualifications and working languages. To add a qualification, press the <strong>+ Add Qualification</strong> button.
        </p>
      </div>

      <Card title="Educational Qualifications (Highest Degree)">
        {errors.educations?.root?.message && (
          <p className="text-danger text-sm mb-3">{errors.educations.root.message}</p>
        )}
        <div className="hidden lg:grid gap-2.5 pb-1 px-11" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Degree / Qualification</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Institution</span>
        </div>
        
        <DynamicRowList
          items={eduFields}
          onAdd={() => appendEdu({ degreeName: '', institution: '', sortOrder: eduFields.length + 1 })}
          addLabel="Add Qualification"
          renderRow={(field, index, _onRemove) => (
            <>
              <Input 
                placeholder="Degree Name" 
                hasError={!!errors.educations?.[index]?.degreeName}
                {...register(`educations.${index}.degreeName`)} 
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Institution" 
                  className="flex-1"
                  hasError={!!errors.educations?.[index]?.institution}
                  {...register(`educations.${index}.institution`)} 
                />
                {eduFields.length > 1 && (
                  <Button type="button" variant="remove" onClick={() => removeEdu(index)}>×</Button>
                )}
              </div>
            </>
          )}
        />
      </Card>

      <Card title="UN Working Languages">
        {errors.languages?.root?.message && (
          <p className="text-danger text-sm mb-3">{errors.languages.root.message}</p>
        )}
        <div className="hidden lg:grid gap-2.5 pb-1 px-11" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Language</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">Level of Proficiency</span>
        </div>
        
        <DynamicRowList
          items={langFields}
          onAdd={() => appendLang({ language: '', proficiency: 'working_level', sortOrder: langFields.length + 1 })}
          addLabel="Add Language"
          renderRow={(field, index, _onRemove) => (
            <>
              <Select 
                hasError={!!errors.languages?.[index]?.language}
                {...register(`languages.${index}.language`)}
              >
                <option value="">Select language...</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </Select>
              <div className="flex gap-2">
                <Select 
                  className="flex-1"
                  hasError={!!errors.languages?.[index]?.proficiency}
                  {...register(`languages.${index}.proficiency`)}
                >
                  <option value="">Select level...</option>
                  {PROFICIENCIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                {langFields.length > 1 && (
                  <Button type="button" variant="remove" onClick={() => removeLang(index)}>×</Button>
                )}
              </div>
            </>
          )}
        />
      </Card>

      <div className="flex justify-between items-center pt-5 border-t border-border mt-2">
        <Button variant="ghost" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Button>
        <Button variant="primary" onClick={handleNext}>
          Next: Work Experience
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Button>
      </div>
    </div>
  );
}
