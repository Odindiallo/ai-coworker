import { useState, useEffect } from 'react';
import performanceMonitor from '../lib/performanceMonitor';

/**
 * Hook for monitoring performance within React components
 * Provides access to performance metrics and monitoring utilities
 * 
 * @returns Performance metrics and utility functions
 */
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  
  useEffect(() => {
    // Subscribe to metric updates
    const unsubscribe = performanceMonitor.onMetricsUpdate(updatedMetrics => {
      setMetrics(updatedMetrics);
    });
    
    // Run performance check after 5 seconds
    const timeoutId = setTimeout(() => {
      performanceMonitor.checkPerformanceIssues();
    }, 5000);
    
    // Clean up on unmount
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);
  
  /**
   * Start monitoring image load time
   * 
   * @param imageId Unique identifier for the image
   */
  const startImageLoad = (imageId: string) => {
    performanceMonitor.startImageLoad(imageId);
  };
  
  /**
   * End monitoring image load time
   * 
   * @param imageId Unique identifier for the image
   */
  const endImageLoad = (imageId: string) => {
    performanceMonitor.endImageLoad(imageId);
  };
  
  /**
   * Check for performance issues
   */
  const checkPerformanceIssues = () => {
    performanceMonitor.checkPerformanceIssues();
  };
  
  /**
   * Generate performance report
   * 
   * @returns Performance report string
   */
  const generateReport = () => {
    return performanceMonitor.generateReport();
  };
  
  return {
    metrics,
    startImageLoad,
    endImageLoad,
    checkPerformanceIssues,
    generateReport
  };
};
