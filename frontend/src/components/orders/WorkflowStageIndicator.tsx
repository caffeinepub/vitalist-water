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
      <div className="flex items-center gap-1">
        {WORKFLOW_STAGES.map((stage, idx) => (
          <div
            key={stage.key}
            className={`h-2 rounded-full transition-all ${
              idx < currentIndex
                ? 'bg-primary w-4'
                : idx === currentIndex
                ? 'bg-primary w-6'
                : 'bg-muted w-2'
            }`}
            title={stage.label}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {WORKFLOW_STAGES[currentIndex]?.label ?? status}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (WORKFLOW_STAGES.length - 1)) * 100}%` }}
        />

        {WORKFLOW_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center z-10 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-background border-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stage.step}
              </div>
              <span
                className={`text-xs mt-1 text-center leading-tight max-w-[60px] ${
                  isCurrent ? 'text-primary font-semibold' : isPending ? 'text-muted-foreground' : 'text-foreground'
                }`}
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
