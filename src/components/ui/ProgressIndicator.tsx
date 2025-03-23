import React from 'react';
import { motion } from 'framer-motion';
import { trackAnalyticsEvent } from '../../lib/analytics';

interface Step {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

interface ProgressIndicatorProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showDescriptions?: boolean;
  interactive?: boolean;
  onStepClick?: (stepId: string) => void;
  className?: string;
  funnelName?: string;
  userId?: string;
}

/**
 * A reusable progress indicator component for multi-step processes.
 * Supports both horizontal and vertical orientations, and can be interactive or display-only.
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  orientation = 'horizontal',
  showLabels = true,
  showDescriptions = false,
  interactive = false,
  onStepClick,
  className = '',
  funnelName,
  userId
}) => {
  // Handle step click
  const handleStepClick = (stepId: string) => {
    if (interactive && onStepClick) {
      onStepClick(stepId);
      
      // Track analytics if funnelName is provided
      if (funnelName && userId) {
        const stepIndex = steps.findIndex(step => step.id === stepId);
        if (stepIndex !== -1) {
          trackAnalyticsEvent('progress_step_click', {
            funnel_name: funnelName,
            step_id: stepId,
            step_number: stepIndex + 1,
            user_id: userId
          });
        }
      }
    }
  };
  
  // Render horizontal progress indicator
  if (orientation === 'horizontal') {
    return (
      <div className={`w-full ${className}`} aria-label="Progress">
        <ol 
          role="list" 
          className="flex items-center justify-between w-full"
        >
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const stepProps = interactive ? { 
              onClick: () => handleStepClick(step.id),
              role: "button",
              tabIndex: 0
            } : {};
            
            return (
              <li 
                key={step.id} 
                className={`relative flex items-center ${
                  isLast ? 'flex-1' : 'flex-1 pr-8 sm:pr-20'
                } ${interactive ? 'cursor-pointer' : ''}`}
                {...stepProps}
              >
                {/* Step connector line */}
                {!isLast && (
                  <div className="absolute top-4 left-0 w-full flex items-center" aria-hidden="true">
                    <div className={`h-0.5 w-full ${
                      step.completed ? 'bg-primary-600' : 'bg-gray-200'
                    }`} />
                  </div>
                )}
                
                {/* Step circle */}
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: step.current ? 1.1 : 1,
                    backgroundColor: step.completed 
                      ? 'var(--color-primary-600)' 
                      : step.current 
                        ? 'var(--color-primary-100)' 
                        : 'var(--color-gray-100)'
                  }}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                    step.completed ? 'bg-primary-600' : 
                    step.current ? 'bg-primary-100 border-2 border-primary-600' : 
                    'bg-gray-100 border border-gray-300'
                  }`}
                >
                  {step.completed ? (
                    <svg 
                      className="h-5 w-5 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  ) : (
                    <span className={`text-sm font-medium ${
                      step.current ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                  )}
                </motion.div>
                
                {/* Step label */}
                {showLabels && (
                  <div className="mt-2 absolute top-8 left-0 w-max -translate-x-1/3">
                    <p className={`text-xs font-medium ${
                      step.current ? 'text-primary-600' : 
                      step.completed ? 'text-gray-900' : 
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    
                    {/* Step description */}
                    {showDescriptions && step.description && (
                      <p className="text-xs text-gray-500 hidden sm:block mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  
  // Render vertical progress indicator
  return (
    <div className={`w-full ${className}`} aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const stepProps = interactive ? { 
            onClick: () => handleStepClick(step.id),
            role: "button",
            tabIndex: 0
          } : {};
          
          return (
            <li 
              key={step.id} 
              className={`relative pb-8 ${interactive ? 'cursor-pointer' : ''}`}
              {...stepProps}
            >
              {/* Connector line */}
              {!isLast && (
                <div 
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" 
                  aria-hidden="true"
                >
                  {step.completed && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      className="absolute h-full w-full bg-primary-600"
                    />
                  )}
                </div>
              )}
              
              <div className="group relative flex items-start">
                {/* Step circle */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: step.current ? 1.1 : 1,
                    backgroundColor: step.completed 
                      ? 'var(--color-primary-600)' 
                      : step.current 
                        ? 'var(--color-primary-100)' 
                        : 'var(--color-gray-100)'
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step.completed ? 'bg-primary-600' : 
                    step.current ? 'bg-primary-100 border-2 border-primary-600' : 
                    'bg-gray-100 border border-gray-300'
                  }`}
                >
                  {step.completed ? (
                    <svg 
                      className="h-5 w-5 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  ) : (
                    <span className={`text-sm font-medium ${
                      step.current ? 'text-primary-600' : 'text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                  )}
                </motion.div>
                
                {/* Step content */}
                {(showLabels || showDescriptions) && (
                  <div className="ml-4 min-w-0">
                    {showLabels && (
                      <p className={`text-sm font-medium ${
                        step.current ? 'text-primary-600' : 
                        step.completed ? 'text-gray-900' : 
                        'text-gray-500'
                      }`}>
                        {step.label}
                      </p>
                    )}
                    
                    {showDescriptions && step.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default ProgressIndicator; 