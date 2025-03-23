/**
 * Bundle Optimizer Utility
 * 
 * This utility helps optimize JS bundles for mobile devices with CPU limitations.
 * It provides functions for code splitting, lazy loading, and runtime optimizations.
 */

import { useEffect, useState } from 'react';

// Detect device performance capabilities
export function detectDeviceCapabilities() {
  // CPU cores - approximation based on available hardware concurrency
  const cpuCores = navigator.hardwareConcurrency || 2;
  
  // Memory - rough approximation using performance API if available
  let deviceMemory = 4; // default assumption (4GB)
  if ('deviceMemory' in navigator) {
    deviceMemory = (navigator as any).deviceMemory;
  }
  
  // Check for battery API
  const hasBatteryAPI = 'getBattery' in navigator;
  
  // Check for battery-saving modes by looking at CPU cores
  // Most devices reduce CPU cores when in battery-saving mode
  const possibleBatterySavingMode = cpuCores < 4;
  
  // Check for device with reduced capabilities
  const isLowPowerDevice = cpuCores <= 2 || deviceMemory <= 2;
  
  return {
    cpuCores,
    deviceMemory,
    hasBatteryAPI,
    possibleBatterySavingMode,
    isLowPowerDevice
  };
}

// Determine appropriate bundle optimization settings
export function getOptimizationSettings() {
  const capabilities = detectDeviceCapabilities();
  const isLowPowerDevice = capabilities.isLowPowerDevice;
  
  return {
    // For low-power devices, use more aggressive code splitting
    // and reduce unnecessary calculations
    enableLazyLoading: true,
    chunkSize: isLowPowerDevice ? 'small' : 'medium',
    minifyInlineScripts: isLowPowerDevice,
    disableAnimations: isLowPowerDevice,
    reduceRenderQuality: isLowPowerDevice,
    enableWebWorkers: !isLowPowerDevice,
    enableServiceWorker: true,
    prefetchThreshold: isLowPowerDevice ? 0.9 : 0.7, // Higher threshold = less prefetching
    limitConcurrentRequests: isLowPowerDevice ? 2 : 4
  };
}

// Hook to get device performance grade (Low, Medium, High)
export function useDevicePerformance() {
  const [performanceGrade, setPerformanceGrade] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Run a simple benchmark to measure device capabilities
    const runBenchmark = async () => {
      setIsLoading(true);
      
      try {
        // Simple computation benchmark - matrix operations
        const startTime = performance.now();
        
        // Create a large matrix and perform operations on it
        const matrixSize = 500;
        const matrix: number[][] = [];
        
        for (let i = 0; i < matrixSize; i++) {
          matrix[i] = [];
          for (let j = 0; j < matrixSize; j++) {
            matrix[i][j] = Math.random();
          }
        }
        
        // Perform matrix operations (transpose)
        const transposed: number[][] = [];
        for (let i = 0; i < matrixSize; i++) {
          transposed[i] = [];
          for (let j = 0; j < matrixSize; j++) {
            transposed[i][j] = matrix[j][i];
          }
        }
        
        const endTime = performance.now();
        const benchmarkTime = endTime - startTime;
        
        // Determine performance grade based on benchmark time
        if (benchmarkTime < 300) {
          setPerformanceGrade('High');
        } else if (benchmarkTime < 1000) {
          setPerformanceGrade('Medium');
        } else {
          setPerformanceGrade('Low');
        }
      } catch (e) {
        // If benchmark fails, fall back to hardware detection
        const capabilities = detectDeviceCapabilities();
        
        if (capabilities.isLowPowerDevice) {
          setPerformanceGrade('Low');
        } else if (capabilities.cpuCores >= 6 && capabilities.deviceMemory >= 6) {
          setPerformanceGrade('High');
        } else {
          setPerformanceGrade('Medium');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    // Run the benchmark
    runBenchmark();
  }, []);
  
  return { performanceGrade, isLoading };
}

// Function to determine if heavy calculations should run on the client
export function shouldRunHeavyCalculations() {
  const capabilities = detectDeviceCapabilities();
  
  // Only run heavy calculations if device has enough CPU cores
  // and is not in battery saving mode
  return capabilities.cpuCores >= 4 && !capabilities.possibleBatterySavingMode;
}

// Function to setup dynamic imports for route-based code splitting
export function setupDynamicImports(routes: string[]) {
  const imports: Record<string, () => Promise<any>> = {};
  
  for (const route of routes) {
    // Create dynamic import functions for each route
    imports[route] = () => import(`../pages/${route}`);
  }
  
  return imports;
}

// Custom hook to determine if the device is in a power-saving mode
export function usePowerSavingMode() {
  const [isPowerSaving, setIsPowerSaving] = useState(false);
  
  useEffect(() => {
    // Check if battery API is available
    if ('getBattery' in navigator) {
      const checkBatteryStatus = async () => {
        try {
          const battery: any = await (navigator as any).getBattery();
          
          // Function to update power saving status
          const updatePowerStatus = () => {
            // Consider power saving mode if:
            // 1. Battery level is below 20%
            // 2. Device is discharging
            setIsPowerSaving(
              (battery.level < 0.2 && !battery.charging) || 
              ('powerSavingMode' in battery && battery.powerSavingMode)
            );
          };
          
          // Initial check
          updatePowerStatus();
          
          // Listen for battery status changes
          battery.addEventListener('levelchange', updatePowerStatus);
          battery.addEventListener('chargingchange', updatePowerStatus);
          
          return () => {
            battery.removeEventListener('levelchange', updatePowerStatus);
            battery.removeEventListener('chargingchange', updatePowerStatus);
          };
        } catch (error) {
          console.error('Could not access battery status:', error);
        }
      };
      
      checkBatteryStatus();
    } else {
      // Fallback for devices without Battery API
      const capabilities = detectDeviceCapabilities();
      setIsPowerSaving(capabilities.possibleBatterySavingMode);
    }
  }, []);
  
  return isPowerSaving;
}

// Function to schedule low-priority calculations during idle time
export function scheduleIdleTask(
  task: () => void, 
  options: { timeout?: number } = {}
) {
  if ('requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(task, options);
  } else {
    // Fallback for browsers without requestIdleCallback
    const timeout = options.timeout || 50;
    return setTimeout(task, timeout);
  }
}

// Function to cancel a scheduled idle task
export function cancelIdleTask(id: number) {
  if ('cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

// Export a default object with all functions
export default {
  detectDeviceCapabilities,
  getOptimizationSettings,
  useDevicePerformance,
  shouldRunHeavyCalculations,
  setupDynamicImports,
  usePowerSavingMode,
  scheduleIdleTask,
  cancelIdleTask
};
