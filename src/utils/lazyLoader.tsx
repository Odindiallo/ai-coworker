import React, { Suspense, lazy, ComponentType } from 'react';
import { usePowerSavingMode } from '../lib/bundleOptimizer';

/**
 * Enhanced lazy loading utility that optimizes component loading based on device capabilities
 * and provides fallback UI while components load
 */

// Simpler loading fallback for low-power devices
const SimpleFallback = () => (
  <div className="flex justify-center items-center p-4">
    <div className="w-6 h-6 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
  </div>
);

// Richer fallback for higher-power devices
const RichFallback = () => (
  <div className="flex flex-col items-center justify-center p-6">
    <div className="w-8 h-8 border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin mb-2"></div>
    <p className="text-gray-600 text-sm animate-pulse">Loading...</p>
  </div>
);

// Lazy load a component with optimized settings
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  preload = false,
  timeoutMs = 3000
) {
  // Create the lazy component
  const LazyComponent = lazy(importFunc);
  
  // Preload the component if requested
  if (preload) {
    importFunc();
  }
  
  // Create a wrapped component with fallback
  const WrappedComponent = (props: React.ComponentProps<T>) => {
    const isPowerSavingMode = usePowerSavingMode();
    const Fallback = isPowerSavingMode ? SimpleFallback : RichFallback;
    
    // Set up timeout to show error if loading takes too long
    const [loadingTimeout, setLoadingTimeout] = React.useState(false);
    
    React.useEffect(() => {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, timeoutMs);
      
      return () => clearTimeout(timer);
    }, []);
    
    if (loadingTimeout) {
      return (
        <div className="p-4 text-center">
          <p className="text-amber-600">
            Taking longer than expected to load...
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-gray-100 rounded-md text-sm"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    
    return (
      <Suspense fallback={<Fallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
  
  return WrappedComponent;
}

// Lazy load a page component with loading screen
export function lazyLoadPage<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  pageName: string
) {
  const LazyPage = lazy(importFunc);
  
  const PageWithLoadingState = (props: React.ComponentProps<T>) => {
    const isPowerSavingMode = usePowerSavingMode();
    
    return (
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <div className={`w-12 h-12 border-4 border-gray-200 border-t-primary-600 rounded-full ${isPowerSavingMode ? '' : 'animate-spin'} mb-4`}></div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">Loading {pageName}</h2>
            <p className="text-gray-500 text-center max-w-md">
              {isPowerSavingMode
                ? "We're optimizing this page for power saving mode."
                : "We're getting everything ready for you."}
            </p>
          </div>
        }
      >
        <LazyPage {...props} />
      </Suspense>
    );
  };
  
  return PageWithLoadingState;
}

// Lazy load modules that depend on device capabilities
export function lazyLoadFeature<T extends ComponentType<any>>(
  importFuncHigh: () => Promise<{ default: T }>,
  importFuncLow: () => Promise<{ default: T }>
) {
  // This component will load either the high-performance or low-performance
  // version of a feature based on device capabilities
  return (props: React.ComponentProps<T>) => {
    const isPowerSavingMode = usePowerSavingMode();
    const importFunc = isPowerSavingMode ? importFuncLow : importFuncHigh;
    const LazyFeature = lazy(importFunc);
    
    return (
      <Suspense fallback={<SimpleFallback />}>
        <LazyFeature {...props} />
      </Suspense>
    );
  };
}

export default {
  lazyLoad,
  lazyLoadPage,
  lazyLoadFeature
};
