import { useState, useEffect } from 'react';

type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
  effectiveConnectionType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  isSlowConnection: boolean;
  hasConnectionChanged: boolean;
}

/**
 * Hook to monitor network status and connection quality
 * Helps optimize image loading strategies based on user's connection
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionType, setConnectionType] = useState<ConnectionType>('unknown');
  const [effectiveConnectionType, setEffectiveConnectionType] = useState<'slow-2g' | '2g' | '3g' | '4g' | undefined>(undefined);
  const [downlink, setDownlink] = useState<number | undefined>(undefined);
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(false);
  const [hasConnectionChanged, setHasConnectionChanged] = useState<boolean>(false);

  useEffect(() => {
    // Handler for online status
    const handleOnline = () => {
      setHasConnectionChanged(true);
      setIsOnline(true);
    };

    // Handler for offline status
    const handleOffline = () => {
      setHasConnectionChanged(true);
      setIsOnline(false);
    };

    // Handler for connection change
    const handleConnectionChange = () => {
      setHasConnectionChanged(true);
      updateConnectionInfo();
    };

    // Update connection information
    const updateConnectionInfo = () => {
      // Check for Navigator Network Information API support
      const connection = (navigator as any).connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;

      if (connection) {
        // Get connection type
        setConnectionType(connection.type || 'unknown');
        
        // Get effective connection type (4g, 3g, etc.)
        setEffectiveConnectionType(connection.effectiveType);
        
        // Get downlink speed in Mbps
        setDownlink(connection.downlink);
        
        // Determine if connection is slow based on effective type
        const isConnectionSlow = connection.effectiveType === 'slow-2g' || 
                                connection.effectiveType === '2g' || 
                                (connection.effectiveType === '3g' && connection.downlink < 1.5) ||
                                connection.saveData === true;
        
        setIsSlowConnection(isConnectionSlow);
      } else {
        // Set defaults if the API is not supported
        setConnectionType('unknown');
        setEffectiveConnectionType(undefined);
        setDownlink(undefined);
        setIsSlowConnection(false);
      }
    };

    // Initial update
    updateConnectionInfo();

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Add connection change listener if supported
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
                       
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return {
    isOnline,
    connectionType,
    effectiveConnectionType,
    downlink,
    isSlowConnection,
    hasConnectionChanged
  };
};
