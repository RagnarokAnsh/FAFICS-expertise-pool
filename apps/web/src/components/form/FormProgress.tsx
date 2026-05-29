import React from 'react';

interface FormProgressProps {
  currentStep: number;
  highestStep: number;
  goToStep: (step: number) => void;
}

const STEPS = [
  { id: 1, label: 'Personal\nInformation' },
  { id: 2, label: 'Education &\nLanguages' },
  { id: 3, label: 'Work\nExperience' },
  { id: 4, label: 'Self\nAssessment' },
  { id: 5, label: 'Consent &\nSubmit' },
];

export function FormProgress({ currentStep, highestStep, goToStep }: FormProgressProps) {
  return (
    <div className="bg-white border-b border-border px-4 md:px-8 sticky top-[78px] z-50 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="max-w-[1020px] mx-auto flex items-stretch overflow-x-auto whitespace-nowrap pb-1 md:pb-0 justify-start md:justify-center">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isDone = step.id <= highestStep && step.id !== currentStep;
          
          let itemClass = "flex-1 min-w-[140px] md:min-w-0 flex items-center gap-2.5 p-[14px_12px] cursor-pointer border-b-[3px] border-transparent transition-all duration-200 relative";
          if (isActive) itemClass += " !border-navy";
          if (isDone) itemClass += " !border-gold";

          let numClass = "w-[26px] h-[26px] rounded-full border-2 border-border flex items-center justify-center text-[12px] font-semibold text-text-muted shrink-0 transition-all duration-200";
          if (isActive) numClass += " !border-navy !bg-navy !text-white";
          if (isDone) numClass += " !border-gold !bg-gold !text-white";

          let labelClass = "text-[12px] font-medium text-text-muted leading-[1.3] transition-colors duration-200 whitespace-pre-line";
          if (isActive) labelClass += " !text-navy";
          if (isDone) labelClass += " !text-gold";

          return (
            <div 
              key={step.id} 
              className={itemClass}
              onClick={() => {
                if (isDone || isActive) {
                  goToStep(step.id);
                }
              }}
            >
              <div className={numClass}>{step.id}</div>
              <div className={labelClass}>{step.label}</div>
              {index < STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-7 bg-border hidden md:block"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
