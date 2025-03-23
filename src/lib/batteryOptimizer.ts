/**
 * Battery Optimizer Utility
 * 
 * This utility provides functions to optimize battery usage on mobile devices
 * during intensive operations like image uploads and AI model training.
 */

// Interface for battery status
interface BatteryStatus {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

// Default optimization levels
export enum OptimizationLevel {
  HIGH = 'high',     // Maximum battery savings, may reduce quality
  MEDIUM = 'medium', // Balanced approach
  LOW = 'low',       // Minimal optimization, preserve quality
  NONE = 'none'      // No optimization
}

// Class to manage battery optimization
export class BatteryOptimizer {
  private static instance: BatteryOptimizer;
  private batteryStatus: BatteryStatus | null = null;
  private batterySupported: boolean = false;
  private optimizationLevel: OptimizationLevel = OptimizationLevel.MEDIUM;
  private batteryLowThreshold: number = 0.2; // 20%
  private listeners: Array<(status: BatteryStatus | null) => void> = [];
  
  // Private constructor for singleton pattern
  private constructor() {
    this.initBattery();
  }
  
  // Get singleton instance
  public static getInstance(): BatteryOptimizer {
    if (!BatteryOptimizer.instance) {
      BatteryOptimizer.instance = new BatteryOptimizer();
    }
    return BatteryOptimizer.instance;
  }
  
  // Initialize battery monitoring
  private async initBattery() {
    try {
      // Check if Battery API is supported
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        
        this.batterySupported = true;
        this.updateBatteryStatus(battery);
        
        // Add event listeners for battery status changes
        battery.addEventListener('chargingchange', () => this.updateBatteryStatus(battery));
        battery.addEventListener('levelchange', () => this.updateBatteryStatus(battery));
        battery.addEventListener('chargingtimechange', () => this.updateBatteryStatus(battery));
        battery.addEventListener('dischargingtimechange', () => this.updateBatteryStatus(battery));
      } else {
        console.log('Battery API not supported');
        this.batterySupported = false;
      }
    } catch (error) {
      console.error('Error initializing battery monitoring:', error);
      this.batterySupported = false;
    }
  }
  
  // Update the battery status
  private updateBatteryStatus(battery: any) {
    this.batteryStatus = {
      charging: battery.charging,
      level: battery.level,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    };
    
    // Automatically adjust optimization level based on battery status
    this.adjustOptimizationLevel();
    
    // Notify all listeners of the status change
    this.notifyListeners();
  }
  
  // Automatically adjust optimization level based on battery status
  private adjustOptimizationLevel() {
    if (!this.batteryStatus) return;
    
    if (this.batteryStatus.charging) {
      // If charging, we can use lower optimization
      this.optimizationLevel = OptimizationLevel.LOW;
    } else {
      // If on battery, adjust based on level
      if (this.batteryStatus.level <= this.batteryLowThreshold) {
        this.optimizationLevel = OptimizationLevel.HIGH;
      } else if (this.batteryStatus.level <= 0.5) {
        this.optimizationLevel = OptimizationLevel.MEDIUM;
      } else {
        this.optimizationLevel = OptimizationLevel.LOW;
      }
    }
  }
  
  // Notify all registered listeners about battery status changes
  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.batteryStatus);
    }
  }
  
  // Add a listener for battery status changes
  public addStatusListener(listener: (status: BatteryStatus | null) => void): void {
    this.listeners.push(listener);
    // Immediately notify with current status
    listener(this.batteryStatus);
  }
  
  // Remove a listener
  public removeStatusListener(listener: (status: BatteryStatus | null) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  // Get current battery status
  public getBatteryStatus(): BatteryStatus | null {
    return this.batteryStatus;
  }
  
  // Get battery level (0-1) or null if not supported
  public getBatteryLevel(): number | null {
    return this.batteryStatus ? this.batteryStatus.level : null;
  }
  
  // Check if the device is charging
  public isCharging(): boolean {
    return this.batteryStatus ? this.batteryStatus.charging : false;
  }
  
  // Check if battery API is supported
  public isBatterySupported(): boolean {
    return this.batterySupported;
  }
  
  // Get current optimization level
  public getOptimizationLevel(): OptimizationLevel {
    return this.optimizationLevel;
  }
  
  // Set optimization level manually (overrides automatic adjustment)
  public setOptimizationLevel(level: OptimizationLevel): void {
    this.optimizationLevel = level;
  }
  
  // Check if battery is low
  public isBatteryLow(): boolean {
    if (!this.batteryStatus) return false;
    return !this.batteryStatus.charging && this.batteryStatus.level <= this.batteryLowThreshold;
  }
  
  // Get optimization settings for image uploads
  public getImageUploadSettings(): {
    maxConcurrentUploads: number;
    compressImages: boolean;
    maxImageSize: number; // in bytes
    useWebP: boolean;
  } {
    // Default settings for when battery status is unknown
    const defaultSettings = {
      maxConcurrentUploads: 2,
      compressImages: true,
      maxImageSize: 1024 * 1024, // 1MB
      useWebP: true
    };
    
    if (!this.batterySupported) return defaultSettings;
    
    switch (this.optimizationLevel) {
      case OptimizationLevel.HIGH:
        return {
          maxConcurrentUploads: 1,
          compressImages: true,
          maxImageSize: 512 * 1024, // 512KB
          useWebP: true
        };
      case OptimizationLevel.MEDIUM:
        return {
          maxConcurrentUploads: 2,
          compressImages: true,
          maxImageSize: 1024 * 1024, // 1MB
          useWebP: true
        };
      case OptimizationLevel.LOW:
        return {
          maxConcurrentUploads: 3,
          compressImages: true,
          maxImageSize: 2 * 1024 * 1024, // 2MB
          useWebP: true
        };
      case OptimizationLevel.NONE:
        return {
          maxConcurrentUploads: 5,
          compressImages: false,
          maxImageSize: 5 * 1024 * 1024, // 5MB
          useWebP: false
        };
      default:
        return defaultSettings;
    }
  }
  
  // Get optimization settings for image generation
  public getImageGenerationSettings(): {
    maxConcurrentGenerations: number;
    inferenceSteps: number;
    useLowMemoryMode: boolean;
  } {
    // Default settings for when battery status is unknown
    const defaultSettings = {
      maxConcurrentGenerations: 1,
      inferenceSteps: 30,
      useLowMemoryMode: false
    };
    
    if (!this.batterySupported) return defaultSettings;
    
    switch (this.optimizationLevel) {
      case OptimizationLevel.HIGH:
        return {
          maxConcurrentGenerations: 1,
          inferenceSteps: 20,
          useLowMemoryMode: true
        };
      case OptimizationLevel.MEDIUM:
        return {
          maxConcurrentGenerations: 1,
          inferenceSteps: 30,
          useLowMemoryMode: false
        };
      case OptimizationLevel.LOW:
        return {
          maxConcurrentGenerations: 2,
          inferenceSteps: 40,
          useLowMemoryMode: false
        };
      case OptimizationLevel.NONE:
        return {
          maxConcurrentGenerations: 3,
          inferenceSteps: 50,
          useLowMemoryMode: false
        };
      default:
        return defaultSettings;
    }
  }

  // Show battery warning if needed
  public shouldShowBatteryWarning(): boolean {
    return this.batterySupported && this.isBatteryLow();
  }
  
  // Get battery warning message
  public getBatteryWarningMessage(): string {
    if (!this.batteryStatus) {
      return "Battery status unavailable. Consider connecting to a power source for intensive operations.";
    }
    
    const percentageLevel = Math.round(this.batteryStatus.level * 100);
    
    if (this.batteryStatus.charging) {
      return `Device is charging (${percentageLevel}%). Performance optimizations reduced.`;
    } else if (this.isBatteryLow()) {
      return `Battery is low (${percentageLevel}%). To conserve power, performance optimizations have been increased.`;
    } else {
      return `Battery level: ${percentageLevel}%. Consider connecting to a power source for intensive operations.`;
    }
  }
}

// Create a hook for use in React components
export function useBatteryOptimizer() {
  return BatteryOptimizer.getInstance();
}

// Export the singleton instance
export default BatteryOptimizer.getInstance();
