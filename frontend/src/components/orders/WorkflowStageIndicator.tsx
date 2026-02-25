import React from 'react';
import { Check } from 'lucide-react';
import { WORKFLOW_STAGES, getStageIndex } from '@/utils/orderUtils';

interface WorkflowStageIndicatorProps {
  status: string;
  compact?: boolean;
}

export default function WorkflowStageIndicator({ status, compact = false }: WorkflowStageIndicatorProps) {
  const currentIndex = getStageIndex(status);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Stage:</span>
        <span className="font-medium">
          {WORKFLOW_STAGES[currentIndex]?.label ?? status}
        </span>
        <span className="text-muted-foreground text-xs">
          ({currentIndex + 1}/{WORKFLOW_STAGES.length})
        </span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="relative flex items-start min-w-max">
        {/* Progress line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border z-0" />
        {currentIndex > 0 && (
          <div
            className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all"
            style={{
              width: `${(currentIndex / (WORKFLOW_STAGES.length - 1)) * 100}%`,
            }}
          />
        )}

        {WORKFLOW_STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center z-10 flex-1">
              <div
                title={stage.label}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground'
                  }
                `}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stage.step}
              </div>
              <span
                className={`
                  mt-1 text-xs text-center max-w-16 leading-tight
                  ${isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'}
                `}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
