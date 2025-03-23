import {
  detectNetworkCondition,
  isOnline,
  getEffectiveConnectionType,
  getDownlinkSpeed,
  shouldUseHighQualityImages,
  registerNetworkListeners,
  unregisterNetworkListeners
} from '../networkUtils';

describe('Network Utility Functions', () => {
  // Original navigator object
  const originalNavigator = global.navigator;
  
  // Cleanup after each test
  afterEach(() => {
    global.navigator = originalNavigator;
    jest.resetAllMocks();
  });
  
  describe('detectNetworkCondition', () => {
    test('should detect offline status', () => {
      // Mock offline navigator
      global.navigator = {
        ...originalNavigator,
        onLine: false
      };
      
      const condition = detectNetworkCondition();
      expect(condition.online).toBe(false);
      expect(condition.connectionType).toBe('offline');
    });
    
    test('should detect 4G connection', () => {
      // Mock 4G navigator.connection
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50
        }
      };
      
      const condition = detectNetworkCondition();
      expect(condition.online).toBe(true);
      expect(condition.connectionType).toBe('4g');
      expect(condition.downlinkMbps).toBe(10);
      expect(condition.rttMs).toBe(50);
    });
    
    test('should detect 3G connection', () => {
      // Mock 3G navigator.connection
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: {
          effectiveType: '3g',
          downlink: 2,
          rtt: 200
        }
      };
      
      const condition = detectNetworkCondition();
      expect(condition.online).toBe(true);
      expect(condition.connectionType).toBe('3g');
      expect(condition.downlinkMbps).toBe(2);
      expect(condition.rttMs).toBe(200);
    });
    
    test('should handle missing navigator.connection', () => {
      // Mock navigator without connection object
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: undefined
      };
      
      const condition = detectNetworkCondition();
      expect(condition.online).toBe(true);
      expect(condition.connectionType).toBe('unknown');
      expect(condition.downlinkMbps).toBe(undefined);
      expect(condition.rttMs).toBe(undefined);
    });
  });
  
  describe('isOnline', () => {
    test('should return true when online', () => {
      global.navigator.onLine = true;
      expect(isOnline()).toBe(true);
    });
    
    test('should return false when offline', () => {
      global.navigator.onLine = false;
      expect(isOnline()).toBe(false);
    });
  });
  
  describe('getEffectiveConnectionType', () => {
    test('should return connection type when available', () => {
      // Mock navigator.connection
      global.navigator = {
        ...originalNavigator,
        connection: {
          effectiveType: '4g'
        }
      };
      
      expect(getEffectiveConnectionType()).toBe('4g');
    });
    
    test('should return "unknown" when connection info is not available', () => {
      // Mock navigator without connection object
      global.navigator = {
        ...originalNavigator,
        connection: undefined
      };
      
      expect(getEffectiveConnectionType()).toBe('unknown');
    });
  });
  
  describe('getDownlinkSpeed', () => {
    test('should return downlink speed when available', () => {
      // Mock navigator.connection
      global.navigator = {
        ...originalNavigator,
        connection: {
          downlink: 5.2
        }
      };
      
      expect(getDownlinkSpeed()).toBe(5.2);
    });
    
    test('should return null when downlink info is not available', () => {
      // Mock navigator without connection object
      global.navigator = {
        ...originalNavigator,
        connection: undefined
      };
      
      expect(getDownlinkSpeed()).toBeNull();
    });
  });
  
  describe('shouldUseHighQualityImages', () => {
    test('should return true for fast connections', () => {
      // Mock 4G navigator.connection
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: {
          effectiveType: '4g',
          downlink: 8
        }
      };
      
      expect(shouldUseHighQualityImages()).toBe(true);
    });
    
    test('should return false for slow connections', () => {
      // Mock slow 3G navigator.connection
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: {
          effectiveType: '3g',
          downlink: 1.5
        }
      };
      
      expect(shouldUseHighQualityImages()).toBe(false);
    });
    
    test('should return true when connection info is not available but online', () => {
      // Mock navigator without connection object
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: undefined
      };
      
      expect(shouldUseHighQualityImages()).toBe(true);
    });
    
    test('should return false when offline', () => {
      // Mock offline navigator
      global.navigator = {
        ...originalNavigator,
        onLine: false
      };
      
      expect(shouldUseHighQualityImages()).toBe(false);
    });
    
    test('should respect user preference for high quality images', () => {
      // Mock slow connection but user preference for high quality
      global.navigator = {
        ...originalNavigator,
        onLine: true,
        connection: {
          effectiveType: '3g',
          downlink: 1.5
        }
      };
      
      // Mock localStorage
      global.localStorage = {
        getItem: jest.fn().mockReturnValue('true')
      };
      
      expect(shouldUseHighQualityImages(true)).toBe(true);
    });
  });
  
  describe('registerNetworkListeners', () => {
    test('should register online and offline event listeners', () => {
      // Mock addEventListener
      global.window.addEventListener = jest.fn();
      global.window.removeEventListener = jest.fn();
      
      const mockCallback = jest.fn();
      
      // Register listeners
      registerNetworkListeners(mockCallback);
      
      // Should add event listeners for online and offline events
      expect(global.window.addEventListener).toHaveBeenCalledTimes(2);
      expect(global.window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      
      // Get the registered handlers
      const onlineHandler = global.window.addEventListener.mock.calls[0][1];
      const offlineHandler = global.window.addEventListener.mock.calls[1][1];
      
      // Call the handlers
      onlineHandler();
      expect(mockCallback).toHaveBeenCalledWith({ online: true });
      
      offlineHandler();
      expect(mockCallback).toHaveBeenCalledWith({ online: false });
    });
    
    test('should register connection change event listener when available', () => {
      // Mock addEventListener for navigator.connection
      const mockConnectionAddEventListener = jest.fn();
      
      // Mock navigator.connection
      global.navigator = {
        ...originalNavigator,
        connection: {
          addEventListener: mockConnectionAddEventListener
        }
      };
      
      global.window.addEventListener = jest.fn();
      
      const mockCallback = jest.fn();
      
      // Register listeners
      registerNetworkListeners(mockCallback);
      
      // Should add event listener for connection change
      expect(mockConnectionAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      
      // Get the registered handler
      const changeHandler = mockConnectionAddEventListener.mock.calls[0][1];
      
      // Call the handler
      changeHandler();
      expect(mockCallback).toHaveBeenCalled();
    });
  });
  
  describe('unregisterNetworkListeners', () => {
    test('should unregister online and offline event listeners', () => {
      // Mock addEventListener and removeEventListener
      global.window.addEventListener = jest.fn();
      global.window.removeEventListener = jest.fn();
      
      const mockCallback = jest.fn();
      
      // Register listeners
      const handlers = registerNetworkListeners(mockCallback);
      
      // Unregister listeners
      unregisterNetworkListeners(handlers);
      
      // Should remove event listeners for online and offline events
      expect(global.window.removeEventListener).toHaveBeenCalledTimes(2);
      expect(global.window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
    
    test('should unregister connection change event listener when available', () => {
      // Mock removeEventListener for navigator.connection
      const mockConnectionRemoveEventListener = jest.fn();
      
      // Mock navigator.connection
      global.navigator = {
        ...originalNavigator,
        connection: {
          addEventListener: jest.fn(),
          removeEventListener: mockConnectionRemoveEventListener
        }
      };
      
      global.window.addEventListener = jest.fn();
      global.window.removeEventListener = jest.fn();
      
      const mockCallback = jest.fn();
      
      // Register listeners
      const handlers = registerNetworkListeners(mockCallback);
      
      // Unregister listeners
      unregisterNetworkListeners(handlers);
      
      // Should remove event listener for connection change
      expect(mockConnectionRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
