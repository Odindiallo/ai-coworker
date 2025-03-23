import { useState, useEffect } from 'react';
import BatteryOptimizer, { OptimizationLevel } from '../lib/batteryOptimizer';

interface BatteryStatus {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

interface UseBatteryResult {
  batteryStatus: BatteryStatus | null;
  isSupported: boolean;
  isCharging: boolean | null;
  batteryLevel: number | null;  // 0 to 1
  batteryLevelPercentage: number | null;  // 0 to 100
  isBatteryLow: boolean;
  optimizationLevel: OptimizationLevel;
  warningMessage: string | null;
  shouldShowWarning: boolean;
  imageUploadSettings: {
    maxConcurrentUploads: number;
    compressImages: boolean;
    maxImageSize: number;
    useWebP: boolean;
  };
  imageGenerationSettings: {
    maxConcurrentGenerations: number;
    inferenceSteps: number;
    useLowMemoryMode: boolean;
  };
  setOptimizationLevel: (level: OptimizationLevel) => void;
}

/**
 * Custom hook for accessing battery status and optimization settings in React components
 * @returns Battery status and optimization settings
 */
export function useBattery(): UseBatteryResult {
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [optimizationLevel, setOptimizationLevel] = useState<OptimizationLevel>(
    BatteryOptimizer.getOptimizationLevel()
  );
  
  // Monitor battery status changes
  useEffect(() => {
    const handleBatteryStatusChange = (status: BatteryStatus | null) => {
      setBatteryStatus(status);
      // Update optimization level state when it changes internally
      setOptimizationLevel(BatteryOptimizer.getOptimizationLevel());
    };
    
    // Register listener
    BatteryOptimizer.addStatusListener(handleBatteryStatusChange);
    
    // Set initial values
    setBatteryStatus(BatteryOptimizer.getBatteryStatus());
    
    // Cleanup
    return () => {
      BatteryOptimizer.removeStatusListener(handleBatteryStatusChange);
    };
  }, []);
  
  // Handler for manually changing optimization level
  const handleSetOptimizationLevel = (level: OptimizationLevel) => {
    BatteryOptimizer.setOptimizationLevel(level);
    setOptimizationLevel(level);
  };
  
  // Calculate battery level percentage (0-100) if available
  const batteryLevelPercentage = batteryStatus?.level != null
    ? Math.round(batteryStatus.level * 100)
    : null;
  
  return {
    batteryStatus,
    isSupported: BatteryOptimizer.isBatterySupported(),
    isCharging: batteryStatus?.charging ?? null,
    batteryLevel: batteryStatus?.level ?? null,
    batteryLevelPercentage,
    isBatteryLow: BatteryOptimizer.isBatteryLow(),
    optimizationLevel,
    warningMessage: BatteryOptimizer.getBatteryWarningMessage(),
    shouldShowWarning: BatteryOptimizer.shouldShowBatteryWarning(),
    imageUploadSettings: BatteryOptimizer.getImageUploadSettings(),
    imageGenerationSettings: BatteryOptimizer.getImageGenerationSettings(),
    setOptimizationLevel: handleSetOptimizationLevel
  };
}

export default useBattery;
