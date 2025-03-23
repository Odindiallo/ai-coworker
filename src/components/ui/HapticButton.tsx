import React from 'react';
import { triggerHapticFeedback, VIBRATION_PATTERNS } from '../../lib/hapticFeedback';
import '../../styles/hapticFeedback.css';

type ButtonType = 'button' | 'submit' | 'reset';
type FeedbackType = keyof typeof VIBRATION_PATTERNS;
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';

interface HapticButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: ButtonType;
  className?: string;
  disabled?: boolean;
  feedbackType?: FeedbackType;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
}

/**
 * A button component that provides haptic feedback on mobile devices
 * when clicked, supporting various styles and states
 */
const HapticButton: React.FC<HapticButtonProps> = ({
  children,
  onClick,
  type = 'button',
  className = '',
  disabled = false,
  feedbackType = 'BUTTON_PRESS',
  variant = 'primary',
  icon,
  loading = false,
  fullWidth = false,
  size = 'md',
  ariaLabel
}) => {
  // Handle click with haptic feedback
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      // Trigger haptic feedback
      triggerHapticFeedback(feedbackType);
      
      // Call the original onClick handler if provided
      if (onClick) {
        onClick(e);
      }
    }
  };
  
  // Generate variant-specific class names
  const getVariantClasses = (): string => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 hover:bg-primary-700 text-white border-transparent';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200';
      case 'outline':
        return 'bg-transparent hover:bg-gray-50 text-primary-600 border-primary-600';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-50 text-gray-700 border-transparent';
      case 'destructive':
        return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
      case 'link':
        return 'bg-transparent text-primary-600 hover:underline border-transparent';
      default:
        return 'bg-primary-600 hover:bg-primary-700 text-white border-transparent';
    }
  };
  
  // Generate size-specific classes
  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default: // md
        return 'px-4 py-2 text-base';
    }
  };
  
  // Combine all classes
  const buttonClasses = `
    relative
    inline-flex
    items-center
    justify-center
    font-medium
    rounded-md
    border
    transition-colors
    focus:outline-none
    focus:ring-2
    focus:ring-offset-2
    focus:ring-primary-500
    touch-target
    min-h-[44px]
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;
  
  // Determine loading spinner color based on variant
  const spinnerColor = ['primary', 'destructive'].includes(variant) ? 'text-white' : 'text-primary-600';
  
  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
    >
      {/* Loading Spinner */}
      {loading && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg
            className={`animate-spin h-5 w-5 ${spinnerColor}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      )}
      
      {/* Button Content */}
      <span className={loading ? 'invisible' : ''}>
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </span>
    </button>
  );
};

export default HapticButton;
