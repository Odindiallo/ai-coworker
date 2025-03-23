import React, { useState, useEffect } from 'react';
import { triggerHapticFeedback } from '../../lib/hapticFeedback';
import HapticButton from './HapticButton';

interface ErrorAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface MobileErrorHandlerProps {
  error: Error | string | null;
  title?: string;
  actions?: ErrorAction[];
  onDismiss?: () => void;
  autoHide?: number; // Time in ms to auto-hide the error
  showIcon?: boolean;
  fullScreen?: boolean;
  recoveryInstructions?: string;
  className?: string;
  showConnectionStatus?: boolean;
}

/**
 * Mobile-optimized error handler component
 * Provides clear instructions and recovery paths for mobile users
 */
const MobileErrorHandler: React.FC<MobileErrorHandlerProps> = ({
  error,
  title = 'Something went wrong',
  actions,
  onDismiss,
  autoHide,
  showIcon = true,
  fullScreen = false,
  recoveryInstructions,
  className = '',
  showConnectionStatus = true
}) => {
  const [visible, setVisible] = useState(!!error);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Reset visibility when error changes
  useEffect(() => {
    if (error) {
      setVisible(true);
      
      // Provide haptic feedback when an error occurs
      triggerHapticFeedback('ERROR');
    } else {
      setVisible(false);
    }
  }, [error]);
  
  // Handle auto-hide
  useEffect(() => {
    if (autoHide && error && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, autoHide);
      
      return () => clearTimeout(timer);
    }
  }, [autoHide, error, visible, onDismiss]);
  
  // Monitor online/offline status if needed
  useEffect(() => {
    if (showConnectionStatus) {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [showConnectionStatus]);
  
  // Handle dismiss
  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };
  
  // If no error or not visible, don't render
  if (!error || !visible) {
    return null;
  }
  
  // Format error message
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Check if the error is related to network connectivity
  const isNetworkError = 
    !isOnline || 
    errorMessage.toLowerCase().includes('network') || 
    errorMessage.toLowerCase().includes('internet') ||
    errorMessage.toLowerCase().includes('offline') ||
    errorMessage.toLowerCase().includes('connection');
  
  // Determine if we should show network-specific recovery instructions
  const networkRecoveryInstructions = isNetworkError 
    ? 'Please check your internet connection and try again.' 
    : null;
  
  // Combine recovery instructions
  const finalRecoveryInstructions = networkRecoveryInstructions || recoveryInstructions;
  
  // Full screen error layout
  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 ${className}`}>
        {showIcon && (
          <div className="mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">{title}</h1>
        <p className="text-gray-700 mb-4 text-center">{errorMessage}</p>
        
        {finalRecoveryInstructions && (
          <p className="text-gray-600 mb-6 text-center">{finalRecoveryInstructions}</p>
        )}
        
        {/* Connection status indicator */}
        {showConnectionStatus && (
          <div className={`flex items-center mb-6 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`h-3 w-3 rounded-full mr-2 ${isOnline ? 'bg-green-600' : 'bg-red-600'}`}></div>
            <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        )}
        
        <div className="flex flex-col space-y-3 w-full max-w-xs">
          {actions?.map((action, index) => (
            <HapticButton
              key={index}
              onClick={action.onClick}
              variant={action.primary ? 'primary' : 'outline'}
              feedbackType="BUTTON_PRESS"
              fullWidth
            >
              {action.label}
            </HapticButton>
          ))}
          
          {onDismiss && (
            <HapticButton
              onClick={handleDismiss}
              variant="ghost"
              feedbackType="BUTTON_PRESS"
              fullWidth
            >
              Dismiss
            </HapticButton>
          )}
        </div>
      </div>
    );
  }
  
  // Inline error layout
  return (
    <div 
      className={`rounded-lg bg-red-50 border-l-4 border-red-500 p-4 mb-4 ${className}`}
      role="alert"
    >
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        <div className="ml-3 flex-grow">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{errorMessage}</p>
            {finalRecoveryInstructions && (
              <p className="mt-1 text-sm text-red-600">{finalRecoveryInstructions}</p>
            )}
          </div>
          
          {actions && actions.length > 0 && (
            <div className="mt-3 flex space-x-3">
              {actions.map((action, index) => (
                <HapticButton
                  key={index}
                  onClick={action.onClick}
                  variant={action.primary ? 'primary' : 'outline'}
                  size="sm"
                  feedbackType="BUTTON_PRESS"
                >
                  {action.label}
                </HapticButton>
              ))}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="pl-3">
            <button
              onClick={handleDismiss}
              className="inline-flex text-red-500 focus:outline-none focus:text-red-600 touch-target p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileErrorHandler;
