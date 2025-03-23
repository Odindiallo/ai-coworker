import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerHapticFeedback } from '../../lib/hapticFeedback';
import HapticButton from '../ui/HapticButton';

interface OnboardingStep {
  title: string;
  content: React.ReactNode;
  image?: string;
  actionLabel?: string;
}

interface MobileOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  userId: string;
}

/**
 * Mobile-optimized onboarding component with simplified flow
 * Designed specifically for smaller screens and touch interaction
 */
const MobileOnboarding: React.FC<MobileOnboardingProps> = ({
  onComplete,
  onSkip,
  userId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const navigate = useNavigate();
  
  // Check if user has already seen onboarding
  useEffect(() => {
    const seenOnboarding = localStorage.getItem(`onboarding_completed_${userId}`);
    if (seenOnboarding === 'true') {
      setHasSeenOnboarding(true);
      onComplete();
    }
  }, [userId, onComplete]);
  
  // Skip onboarding if already seen
  if (hasSeenOnboarding) {
    return null;
  }
  
  // Define onboarding steps - simplified for mobile
  const steps: OnboardingStep[] = [
    {
      title: 'Create AI Actors',
      content: (
        <p className="text-center text-gray-600">
          Upload photos of yourself or someone else to create a custom AI actor that can generate new images.
        </p>
      ),
      image: '/images/onboarding/create-actor.svg',
      actionLabel: 'Next'
    },
    {
      title: 'Train Your Actor',
      content: (
        <p className="text-center text-gray-600">
          Our AI system will train on your photos and create a custom model. This takes about 15-30 minutes.
        </p>
      ),
      image: '/images/onboarding/train-actor.svg',
      actionLabel: 'Next'
    },
    {
      title: 'Generate Images',
      content: (
        <p className="text-center text-gray-600">
          Create amazing images with simple text prompts. The more specific your prompt, the better the results!
        </p>
      ),
      image: '/images/onboarding/generate-images.svg',
      actionLabel: 'Get Started'
    }
  ];
  
  // Handle next step
  const handleNext = () => {
    triggerHapticFeedback('BUTTON_PRESS');
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed
      localStorage.setItem(`onboarding_completed_${userId}`, 'true');
      onComplete();
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    triggerHapticFeedback('BUTTON_PRESS');
    
    // Mark onboarding as completed
    localStorage.setItem(`onboarding_completed_${userId}`, 'true');
    
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };
  
  // Get current step
  const currentStepData = steps[currentStep];
  
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Progress indicator */}
      <div className="flex justify-center items-center pt-6 px-4">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-10 rounded-full ${
                index === currentStep
                  ? 'bg-primary-600'
                  : index < currentStep
                  ? 'bg-primary-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Skip button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleSkip}
          className="text-gray-500 text-sm touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          Skip
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 mt-4">
        {/* Image */}
        {currentStepData.image && (
          <div className="mb-8 max-w-[250px] h-[200px] flex items-center justify-center">
            <img
              src={currentStepData.image}
              alt={currentStepData.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
        
        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
          {currentStepData.title}
        </h1>
        
        {/* Content */}
        <div className="text-center mb-8">
          {currentStepData.content}
        </div>
        
        {/* Action button */}
        <HapticButton
          onClick={handleNext}
          variant="primary"
          size="lg"
          fullWidth
          className="max-w-[250px]"
        >
          {currentStepData.actionLabel || 'Next'}
        </HapticButton>
      </div>
    </div>
  );
};

export default MobileOnboarding;
