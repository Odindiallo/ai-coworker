import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NetworkProvider, { useNetwork } from '../NetworkContext';

// Mock network utilities
jest.mock('../../utils/networkUtils', () => ({
  detectNetworkCondition: jest.fn(() => ({
    online: true,
    connectionType: '4g',
    downlinkMbps: 10,
    rttMs: 50
  })),
  registerNetworkListeners: jest.fn((callback) => {
    // Store the callback for tests to trigger
    window.networkCallback = callback;
    return { onlineHandler: jest.fn(), offlineHandler: jest.fn(), connectionChangeHandler: jest.fn() };
  }),
  unregisterNetworkListeners: jest.fn(),
  shouldUseHighQualityImages: jest.fn(() => true)
}));

// Test component that uses the network context
const TestComponent = () => {
  const { online, connectionType, downlinkMbps, useHighQuality, setUseHighQuality } = useNetwork();
  
  return (
    <div>
      <p>Online: {online ? 'Yes' : 'No'}</p>
      <p>Connection: {connectionType}</p>
      <p>Speed: {downlinkMbps ? `${downlinkMbps} Mbps` : 'Unknown'}</p>
      <p>High Quality: {useHighQuality ? 'Yes' : 'No'}</p>
      <button onClick={() => setUseHighQuality(!useHighQuality)}>
        Toggle Quality
      </button>
    </div>
  );
};

describe('NetworkContext', () => {
  // Original window object
  const originalWindow = { ...window };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset window
    Object.assign(window, originalWindow);
  });
  
  test('should provide network state from initial detection', () => {
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Check initial network state
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    expect(screen.getByText('Connection: 4g')).toBeInTheDocument();
    expect(screen.getByText('Speed: 10 Mbps')).toBeInTheDocument();
    expect(screen.getByText('High Quality: Yes')).toBeInTheDocument();
  });
  
  test('should update network state when connection changes', () => {
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Initial state
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    
    // Simulate going offline
    act(() => {
      window.networkCallback({ online: false });
    });
    
    // Should update to offline state
    expect(screen.getByText('Online: No')).toBeInTheDocument();
    
    // Simulate connection change
    act(() => {
      window.networkCallback({
        online: true,
        connectionType: '3g',
        downlinkMbps: 2.5,
        rttMs: 150
      });
    });
    
    // Should update to new connection state
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    expect(screen.getByText('Connection: 3g')).toBeInTheDocument();
    expect(screen.getByText('Speed: 2.5 Mbps')).toBeInTheDocument();
  });
  
  test('should allow toggling high quality setting', () => {
    // Mock shouldUseHighQualityImages to return false
    const networkUtils = require('../../utils/networkUtils');
    networkUtils.shouldUseHighQualityImages.mockReturnValue(false);
    
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Initial state
    expect(screen.getByText('High Quality: No')).toBeInTheDocument();
    
    // Toggle the high quality setting
    fireEvent.click(screen.getByText('Toggle Quality'));
    
    // Should update high quality state
    expect(screen.getByText('High Quality: Yes')).toBeInTheDocument();
    
    // Toggle back
    fireEvent.click(screen.getByText('Toggle Quality'));
    
    // Should switch back
    expect(screen.getByText('High Quality: No')).toBeInTheDocument();
  });
  
  test('should register and unregister network listeners', () => {
    const { registerNetworkListeners, unregisterNetworkListeners } = require('../../utils/networkUtils');
    
    const { unmount } = render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Should register network listeners
    expect(registerNetworkListeners).toHaveBeenCalled();
    
    // Unmount the component
    unmount();
    
    // Should unregister network listeners
    expect(unregisterNetworkListeners).toHaveBeenCalled();
  });
  
  test('should read high quality preference from localStorage', () => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('true'),
        setItem: jest.fn()
      },
      writable: true
    });
    
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Should read from localStorage
    expect(window.localStorage.getItem).toHaveBeenCalledWith('useHighQualityImages');
    
    // Should respect the localStorage setting
    expect(screen.getByText('High Quality: Yes')).toBeInTheDocument();
  });
  
  test('should save high quality preference to localStorage', () => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn()
      },
      writable: true
    });
    
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Toggle the high quality setting
    fireEvent.click(screen.getByText('Toggle Quality'));
    
    // Should save to localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith('useHighQualityImages', 'false');
  });
  
  test('should handle missing localStorage', () => {
    // Mock window without localStorage
    Object.defineProperty(window, 'localStorage', {
      value: null,
      writable: true
    });
    
    // Should not throw an error
    expect(() => {
      render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );
    }).not.toThrow();
    
    // Default state should still be shown
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();
  });
  
  test('should update network state when window events fire', () => {
    // Spy on addEventListener
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    render(
      <NetworkProvider>
        <TestComponent />
      </NetworkProvider>
    );
    
    // Get the event handlers
    const onlineHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'online')?.[1];
    const offlineHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'offline')?.[1];
    
    // Trigger online event
    if (onlineHandler) {
      act(() => {
        onlineHandler();
      });
    }
    
    // Should be online
    expect(screen.getByText('Online: Yes')).toBeInTheDocument();
    
    // Trigger offline event
    if (offlineHandler) {
      act(() => {
        offlineHandler();
      });
    }
    
    // Should be offline
    expect(screen.getByText('Online: No')).toBeInTheDocument();
  });
});
