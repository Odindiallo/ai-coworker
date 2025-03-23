import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { trackAnalyticsEvent } from '../../lib/analytics';

interface OnboardingStep {
  title: string;
  content: React.ReactNode;
  image?: string;
  actionLabel?: string;
  animation?: string;
}

interface DesktopOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  userId: string;
}

/**
 * Desktop-optimized onboarding component
 * Designed for larger screens with more detailed instructions
 */
const DesktopOnboarding: React.FC<DesktopOnboardingProps> = ({
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
    } else {
      // Track onboarding started for analytics
      trackAnalyticsEvent('onboarding_started', {
        device_type: 'desktop',
        user_id: userId
      });
    }
  }, [userId, onComplete]);
  
  // Skip onboarding if already seen
  if (hasSeenOnboarding) {
    return null;
  }
  
  // Define onboarding steps for desktop - more detailed than mobile
  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to AI Actor Generator',
      content: (
        <div className="space-y-4 max-w-md">
          <p className="text-gray-600">
            Create custom AI actors from your photos and generate amazing new images.
          </p>
          <p className="text-gray-600">
            Follow this quick guide to learn how to get started and make the most of your experience.
          </p>
        </div>
      ),
      image: '/images/onboarding/welcome.svg',
      actionLabel: 'Let\'s Begin',
      animation: 'fadeIn'
    },
    {
      title: 'Upload Your Photos',
      content: (
        <div className="space-y-4 max-w-md">
          <p className="text-gray-600">
            Start by uploading 10-20 high-quality photos of your subject from different angles.
          </p>
          <ul className="text-gray-600 list-disc pl-5 space-y-2">
            <li>Use clear, well-lit photos</li>
            <li>Include different expressions and angles</li>
            <li>Avoid photos with multiple people</li>
            <li>More varied photos lead to better results</li>
          </ul>
        </div>
      ),
      image: '/images/onboarding/upload-photos.svg',
      actionLabel: 'Next',
      animation: 'slideRight'
    },
    {
      title: 'Train Your AI Actor',
      content: (
        <div className="space-y-4 max-w-md">
          <p className="text-gray-600">
            We'll use your photos to train a custom AI model that can generate new images of your subject.
          </p>
          <p className="text-gray-600">
            The training process takes about 15-30 minutes. You'll receive a notification when your actor is ready.
          </p>
          <p className="text-gray-600 font-medium">
            While training, you can explore the app and come back later.
          </p>
        </div>
      ),
      image: '/images/onboarding/train-actor.svg',
      actionLabel: 'Next',
      animation: 'slideUp'
    },
    {
      title: 'Generate Custom Images',
      content: (
        <div className="space-y-4 max-w-md">
          <p className="text-gray-600">
            Once training is complete, you can generate new images with simple text prompts.
          </p>
          <p className="text-gray-600">
            Be specific in your prompts for best results:
          </p>
          <ul className="text-gray-600 list-disc pl-5 space-y-2">
            <li>Describe the scene, clothing, or setting</li>
            <li>Mention lighting, style, and mood</li>
            <li>Add details about poses or expressions</li>
          </ul>
        </div>
      ),
      image: '/images/onboarding/generate-images.svg',
      actionLabel: 'Next',
      animation: 'zoomIn'
    },
    {
      title: 'Ready to Create?',
      content: (
        <div className="space-y-4 max-w-md">
          <p className="text-gray-600">
            You're all set! Now you can create your first AI actor and start generating amazing images.
          </p>
          <p className="text-gray-600">
            Visit the dashboard to get started, or explore the gallery for inspiration from other users.
          </p>
          <p className="text-gray-600 font-medium">
            Have fun creating!
          </p>
        </div>
      ),
      image: '/images/onboarding/ready.svg',
      actionLabel: 'Get Started',
      animation: 'pulse'
    }
  ];
  
  // Handle next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Track step completion for analytics
      trackAnalyticsEvent('onboarding_step_completed', {
        device_type: 'desktop',
        step_number: currentStep + 1,
        step_name: steps[currentStep].title,
        user_id: userId
      });
      
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed
      localStorage.setItem(`onboarding_completed_${userId}`, 'true');
      
      // Track onboarding completion for analytics
      trackAnalyticsEvent('onboarding_completed', {
        device_type: 'desktop',
        total_steps: steps.length,
        user_id: userId
      });
      
      onComplete();
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    // Track onboarding skipped for analytics
    trackAnalyticsEvent('onboarding_skipped', {
      device_type: 'desktop',
      current_step: currentStep + 1,
      total_steps: steps.length,
      user_id: userId
    });
    
    // Mark onboarding as completed
    localStorage.setItem(`onboarding_completed_${userId}`, 'true');
    
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };
  
  // Get animation variants for current step
  const getAnimationVariants = (animation: string = 'fadeIn') => {
    const variants = {
      fadeIn: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5 } }
      },
      slideRight: {
        hidden: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
      },
      slideUp: {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
      },
      zoomIn: {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
      },
      pulse: {
        hidden: { opacity: 0 },
        visible: { 
          opacity: 1, 
          transition: { 
            duration: 0.5,
            onComplete: () => {
              // Add a subtle pulse animation after appearing
              document.querySelector('.pulse-animation')?.classList.add('animate-pulse');
            }
          } 
        }
      }
    };
    
    return variants[animation as keyof typeof variants] || variants.fadeIn;
  };
  
  // Get current step
  const currentStepData = steps[currentStep];
  const animationVariants = getAnimationVariants(currentStepData.animation);
  
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      {/* Navigation/Progress */}
      <div className="flex justify-between items-center p-6 border-b border-gray-100">
        <div className="flex space-x-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 w-16 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'bg-primary-600'
                  : index < currentStep
                  ? 'bg-primary-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2 rounded-md transition-colors"
        >
          Skip
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-8 md:p-12">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            className="w-full flex flex-col md:flex-row items-center justify-center gap-12"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={animationVariants}
          >
            {/* Image */}
            {currentStepData.image && (
              <div className={`mb-8 md:mb-0 max-w-md ${currentStepData.animation === 'pulse' ? 'pulse-animation' : ''}`}>
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="max-w-full max-h-[350px] object-contain"
                />
              </div>
            )}
            
            {/* Text content */}
            <div className="max-w-lg">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {currentStepData.title}
              </h1>
              
              <div className="mb-8">
                {currentStepData.content}
              </div>
              
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition-colors"
              >
                {currentStepData.actionLabel || 'Next'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DesktopOnboarding; 