interface NetworkCondition {
  online: boolean;
  connectionType?: string;
  downlinkMbps?: number;
  rttMs?: number;
}

interface NetworkHandlers {
  onlineHandler: EventListener;
  offlineHandler: EventListener;
  connectionChangeHandler?: EventListener;
}

/**
 * Detects the current network condition
 * @returns An object with online status and connection information
 */
export const detectNetworkCondition = (): NetworkCondition => {
  const online = navigator.onLine;
  
  // If offline, return simple status
  if (!online) {
    return { online: false, connectionType: 'offline' };
  }
  
  // Check navigator.connection if available (Chrome, Edge, Opera)
  const connection = (navigator as any).connection;
  if (connection) {
    return {
      online: true,
      connectionType: connection.effectiveType || 'unknown',
      downlinkMbps: connection.downlink,
      rttMs: connection.rtt
    };
  }
  
  // Default for browsers that don't support Connection API
  return {
    online: true,
    connectionType: 'unknown'
  };
};

/**
 * Checks if the device is online
 * @returns True if online, false if offline
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Gets the effective connection type (4g, 3g, 2g, slow-2g)
 * @returns Connection type string or "unknown" if not available
 */
export const getEffectiveConnectionType = (): string => {
  const connection = (navigator as any).connection;
  return connection?.effectiveType || 'unknown';
};

/**
 * Gets the estimated downlink speed in Mbps
 * @returns Downlink speed or null if not available
 */
export const getDownlinkSpeed = (): number | null => {
  const connection = (navigator as any).connection;
  return connection?.downlink || null;
};

/**
 * Determines if high quality images should be used based on network conditions
 * @param overrideQuality Optional user preference to override automatic detection
 * @returns True if high quality images should be used
 */
export const shouldUseHighQualityImages = (overrideQuality?: boolean | null): boolean => {
  // If user has explicitly set a preference, respect it
  if (overrideQuality !== undefined && overrideQuality !== null) {
    return overrideQuality;
  }
  
  // Check if there's a stored preference
  try {
    const storedPreference = localStorage.getItem('useHighQualityImages');
    if (storedPreference !== null) {
      return storedPreference === 'true';
    }
  } catch (error) {
    // Local storage might be unavailable in some contexts
    console.warn('Could not access localStorage:', error);
  }
  
  // If offline, use low quality
  if (!navigator.onLine) {
    return false;
  }
  
  // Check connection quality
  const connection = (navigator as any).connection;
  if (connection) {
    // Use high quality for 4g connections or if downlink is above 2 Mbps
    if (connection.effectiveType === '4g' || connection.downlink > 2) {
      return true;
    }
    return false;
  }
  
  // Default to high quality if connection API is not available
  return true;
};

/**
 * Registers event listeners for network changes
 * @param callback Function to call when network status changes
 * @returns Handlers object for unregistering
 */
export const registerNetworkListeners = (callback: (condition: Partial<NetworkCondition>) => void): NetworkHandlers => {
  const onlineHandler = () => callback({ online: true });
  const offlineHandler = () => callback({ online: false });
  
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);
  
  let connectionChangeHandler: EventListener | undefined;
  
  // Add listener for connection change if available
  const connection = (navigator as any).connection;
  if (connection) {
    connectionChangeHandler = () => callback(detectNetworkCondition());
    connection.addEventListener('change', connectionChangeHandler);
  }
  
  return {
    onlineHandler,
    offlineHandler,
    connectionChangeHandler
  };
};

/**
 * Unregisters network event listeners
 * @param handlers Object containing handlers to remove
 */
export const unregisterNetworkListeners = (handlers: NetworkHandlers): void => {
  window.removeEventListener('online', handlers.onlineHandler);
  window.removeEventListener('offline', handlers.offlineHandler);
  
  // Remove connection change handler if it exists
  if (handlers.connectionChangeHandler) {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.removeEventListener('change', handlers.connectionChangeHandler);
    }
  }
};
