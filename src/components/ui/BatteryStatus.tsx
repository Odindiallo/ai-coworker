import React from 'react';
import useBattery from '../../hooks/useBattery';
import { OptimizationLevel } from '../../lib/batteryOptimizer';

interface BatteryStatusProps {
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * BatteryStatus component displays the current battery status and 
 * allows users to adjust optimization settings
 */
const BatteryStatus: React.FC<BatteryStatusProps> = ({
  showControls = false,
  compact = false,
  className = ''
}) => {
  const {
    isSupported,
    isCharging,
    batteryLevelPercentage,
    optimizationLevel,
    isBatteryLow,
    setOptimizationLevel,
    warningMessage
  } = useBattery();

  if (!isSupported) {
    if (compact) return null;
    
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        Battery status not available on this device
      </div>
    );
  }

  // Determine battery indicator color
  const getBatteryColor = () => {
    if (isCharging) return 'text-green-500';
    if (batteryLevelPercentage === null) return 'text-gray-500';
    
    if (batteryLevelPercentage <= 15) return 'text-red-500';
    if (batteryLevelPercentage <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Determine battery icon based on level and charging state
  const getBatteryIcon = () => {
    if (batteryLevelPercentage === null) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      );
    }

    // Calculate how much of the battery to fill
    const fillWidth = Math.max(0, Math.min(100, batteryLevelPercentage));
    
    return (
      <div className="relative h-4 w-6">
        {/* Battery outline */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="2" y="7" width="16" height="10" rx="2" strokeWidth="2" />
          <path d="M20 11h2v2h-2v-2z" strokeWidth="2" />
        </svg>
        
        {/* Battery fill */}
        <div 
          className={`absolute top-1/2 left-[3px] transform -translate-y-1/2 h-2 rounded-sm transition-all duration-300 ease-in-out ${getBatteryColor()}`}
          style={{ 
            width: `${(fillWidth * 13) / 100}px`, 
            backgroundColor: 'currentColor'
          }}
        />
        
        {/* Charging indicator */}
        {isCharging && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`flex items-center ${getBatteryColor()}`}>
          {getBatteryIcon()}
          <span className="ml-1 text-xs">{batteryLevelPercentage}%</span>
          {isCharging && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-2 rounded-md ${isBatteryLow ? 'bg-red-50' : 'bg-gray-50'} ${className}`}>
      <div className="flex items-center mb-2">
        <div className={`flex items-center ${getBatteryColor()}`}>
          {getBatteryIcon()}
          <span className="ml-1 text-sm font-medium">
            {batteryLevelPercentage !== null ? `${batteryLevelPercentage}%` : 'Unknown'}
            {isCharging && ' (Charging)'}
          </span>
        </div>
        
        {warningMessage && (
          <p className="text-xs ml-2 text-gray-600">{warningMessage}</p>
        )}
      </div>
      
      {showControls && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Power Optimization</label>
          <select
            value={optimizationLevel}
            onChange={(e) => setOptimizationLevel(e.target.value as OptimizationLevel)}
            className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md"
          >
            <option value={OptimizationLevel.HIGH}>Maximum (Battery Saver)</option>
            <option value={OptimizationLevel.MEDIUM}>Balanced</option>
            <option value={OptimizationLevel.LOW}>Minimal</option>
            <option value={OptimizationLevel.NONE}>None (Best Quality)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {optimizationLevel === OptimizationLevel.HIGH && 'Maximizes battery life, may reduce quality'}
            {optimizationLevel === OptimizationLevel.MEDIUM && 'Balances battery life and quality'}
            {optimizationLevel === OptimizationLevel.LOW && 'Prioritizes quality with some battery optimizations'}
            {optimizationLevel === OptimizationLevel.NONE && 'No battery optimizations, maximizes quality'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BatteryStatus;
