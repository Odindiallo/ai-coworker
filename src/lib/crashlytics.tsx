/**
 * Firebase Crashlytics integration for error logging and monitoring
 */
import React from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import {
  getFunctions,
  httpsCallable
} from 'firebase/functions';
import { firebaseConfig } from './firebase';

// Initialize Firebase if not already initialized
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const functions = getFunctions(app);

// Function to log errors to Firebase Crashlytics
export const logError = async (
  error: Error,
  context: Record<string, any> = {}
): Promise<void> => {
  try {
    // Log error to analytics
    logEvent(analytics, 'exception', {
      description: error.message,
      fatal: false,
      ...context
    });
    
    // Call Firebase Function to log to Crashlytics
    const logErrorToServer = httpsCallable(functions, 'logErrorToCrashlytics');
    
    await logErrorToServer({
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: JSON.stringify(context),
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error logged to Crashlytics:', error, context);
    }
  } catch (loggingError) {
    // If logging to Crashlytics fails, at least log to console
    console.error('Failed to log error to Crashlytics:', loggingError);
    console.error('Original error:', error, context);
  }
};

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logError(event.reason, {
    type: 'unhandledRejection',
    promise: event.promise.toString()
  });
});

// Log global errors
window.addEventListener('error', (event) => {
  logError(event.error, {
    type: 'globalError',
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Error boundary class for React components
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError(error, {
      type: 'reactError',
      componentStack: errorInfo.componentStack
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Return fallback UI if provided, otherwise use default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-red-50 rounded-md border border-red-200 text-red-700">
          <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
          <p>We&apos;ve been notified and will fix it as soon as possible.</p>
          <button
            onClick={(): void => this.setState({ hasError: false })}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-red-800 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default {
  logError,
  ErrorBoundary
};
