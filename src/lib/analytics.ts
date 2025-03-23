/**
 * Analytics tracking utilities for the AI Actor Generator app.
 * This implementation uses a combination of local tracking and Firebase Analytics.
 */
import { logEvent } from 'firebase/analytics';
import { getAnalytics } from 'firebase/analytics';
import app from './firebase';

// Define types for analytics events
type EventParams = Record<string, string | number | boolean | null>;

// Get Firebase Analytics instance
let analytics: ReturnType<typeof getAnalytics> | null = null;

// Initialize analytics safely (handling SSR and blocked analytics scenarios)
try {
  // Only initialize in browser environment, not during SSR
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized successfully');
  }
} catch (error) {
  console.warn('Failed to initialize Firebase Analytics:', error);
}

/**
 * Tracks an analytics event with Firebase Analytics and logs to console in development
 */
export function trackAnalyticsEvent(
  eventName: string,
  eventParams?: EventParams
): void {
  try {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] Event: ${eventName}`, eventParams);
    }

    // Track with Firebase Analytics if available
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    }

    // Store in local storage for debugging/fallback
    const recentEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    recentEvents.push({
      event: eventName,
      params: eventParams,
      timestamp: new Date().toISOString()
    });
    
    // Keep only the 20 most recent events
    if (recentEvents.length > 20) {
      recentEvents.shift();
    }
    
    localStorage.setItem('analytics_events', JSON.stringify(recentEvents));
  } catch (error) {
    console.error('Error tracking analytics event:', error);
  }
}

/**
 * Track a conversion funnel step
 */
export function trackFunnelStep(
  funnelName: string,
  stepName: string,
  stepNumber: number,
  userId: string,
  additionalParams?: EventParams
): void {
  trackAnalyticsEvent('funnel_step', {
    funnel_name: funnelName,
    step_name: stepName,
    step_number: stepNumber,
    user_id: userId,
    ...additionalParams
  });
}

/**
 * Track a completed funnel conversion
 */
export function trackFunnelCompletion(
  funnelName: string,
  totalSteps: number,
  timeSpentSeconds: number,
  userId: string,
  additionalParams?: EventParams
): void {
  trackAnalyticsEvent('funnel_complete', {
    funnel_name: funnelName,
    total_steps: totalSteps,
    time_spent_seconds: timeSpentSeconds,
    user_id: userId,
    ...additionalParams
  });
}

/**
 * Track when a user abandons a funnel
 */
export function trackFunnelAbandonment(
  funnelName: string,
  lastStepName: string,
  lastStepNumber: number,
  userId: string,
  additionalParams?: EventParams
): void {
  trackAnalyticsEvent('funnel_abandon', {
    funnel_name: funnelName,
    last_step_name: lastStepName,
    last_step_number: lastStepNumber,
    user_id: userId,
    ...additionalParams
  });
}

/**
 * Predefined funnel names for consistent tracking
 */
export const FUNNELS = {
  REGISTRATION: 'user_registration',
  ACTOR_CREATION: 'actor_creation',
  IMAGE_GENERATION: 'image_generation',
  ONBOARDING: 'user_onboarding'
};

// Define type for stored analytics events
interface StoredAnalyticsEvent {
  event: string;
  params?: EventParams;
  timestamp: string;
}

/**
 * Get stored analytics events (useful for debugging)
 */
export function getStoredAnalyticsEvents(): StoredAnalyticsEvent[] {
  try {
    return JSON.parse(localStorage.getItem('analytics_events') || '[]');
  } catch (error) {
    console.error('Error retrieving stored analytics events:', error);
    return [];
  }
}

/**
 * Clear stored analytics events
 */
export function clearStoredAnalyticsEvents(): void {
  localStorage.removeItem('analytics_events');
} 