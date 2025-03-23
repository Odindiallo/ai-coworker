/**
 * Haptic Feedback Utility
 * 
 * This utility provides haptic feedback functions for mobile devices,
 * using the Vibration API where available and providing graceful fallbacks.
 */

// Check if vibration is supported
const hasVibrationSupport = (): boolean => {
  return 'vibrate' in navigator;
};

// Different vibration patterns
const VIBRATION_PATTERNS = {
  SUCCESS: [10],
  ERROR: [100, 50, 100],
  WARNING: [50, 30, 50],
  BUTTON_PRESS: [5],
  SELECTION: [10],
  NOTIFICATION: [20, 40, 20]
};

type FeedbackType = keyof typeof VIBRATION_PATTERNS;

/**
 * Trigger haptic feedback
 * @param type - Type of feedback to trigger
 * @returns boolean indicating whether feedback was triggered
 */
export const triggerHapticFeedback = (type: FeedbackType = 'BUTTON_PRESS'): boolean => {
  if (!hasVibrationSupport()) {
    return false;
  }
  
  try {
    navigator.vibrate(VIBRATION_PATTERNS[type]);
    return true;
  } catch (error) {
    console.warn('Failed to trigger haptic feedback:', error);
    return false;
  }
};

/**
 * Higher-order function to add haptic feedback to event handlers
 * @param handler - The original event handler
 * @param type - Type of feedback to trigger
 * @returns A new function that triggers haptic feedback and calls the original handler
 */
export function withHapticFeedback<T extends (...args: any[]) => any>(
  handler: T,
  type: FeedbackType = 'BUTTON_PRESS'
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    triggerHapticFeedback(type);
    return handler(...args);
  };
}

/**
 * React hook to create a handler with haptic feedback
 * @param handler - The original event handler
 * @param type - Type of feedback to trigger
 * @returns A new function that triggers haptic feedback and calls the original handler
 */
export function useHapticFeedback<T extends (...args: any[]) => any>(
  handler: T,
  type: FeedbackType = 'BUTTON_PRESS'
): (...args: Parameters<T>) => ReturnType<T> {
  return withHapticFeedback(handler, type);
}

/**
 * Check if the user has enabled haptic feedback
 * First checks user preferences, then falls back to device settings
 */
export const isHapticFeedbackEnabled = (): boolean => {
  // Check for user preference in localStorage
  const userPreference = localStorage.getItem('hapticFeedbackEnabled');
  
  if (userPreference !== null) {
    return userPreference === 'true';
  }
  
  // Default to true if vibration is supported
  return hasVibrationSupport();
};

/**
 * Set user preference for haptic feedback
 */
export const setHapticFeedbackEnabled = (enabled: boolean): void => {
  localStorage.setItem('hapticFeedbackEnabled', String(enabled));
};

/**
 * Create a haptic feedback button
 * Combines vibration with a CSS animation for visual feedback
 * @param element - The button element
 * @param type - Type of feedback to trigger
 */
export const makeElementHaptic = (
  element: HTMLElement,
  type: FeedbackType = 'BUTTON_PRESS'
): void => {
  if (!element) return;
  
  const originalClickHandler = element.onclick;
  
  element.onclick = (event) => {
    // Add a quick animation for visual feedback
    element.classList.add('haptic-feedback-animation');
    
    // Remove the animation class after animation completes
    setTimeout(() => {
      element.classList.remove('haptic-feedback-animation');
    }, 200);
    
    // Trigger haptic feedback
    if (isHapticFeedbackEnabled()) {
      triggerHapticFeedback(type);
    }
    
    // Call the original click handler if it exists
    if (originalClickHandler) {
      originalClickHandler.call(element, event);
    }
  };
};

// Export the module
export default {
  triggerHapticFeedback,
  withHapticFeedback,
  useHapticFeedback,
  isHapticFeedbackEnabled,
  setHapticFeedbackEnabled,
  makeElementHaptic,
  VIBRATION_PATTERNS,
  hasVibrationSupport
};
