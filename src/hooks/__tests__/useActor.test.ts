import { renderHook, waitFor } from '@testing-library/react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import useActor from '../useActor';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock React's useState
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useEffect: jest.fn((fn) => fn()),
}));

describe('useActor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('returns loading state initially', () => {
    // Mock implementation for getDoc that never resolves
    (getDoc as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    
    const { result } = renderHook(() => useActor('test-actor-id'));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.actor).toBeNull();
    expect(result.current.error).toBeNull();
  });
  
  test('returns actor data when loaded successfully', async () => {
    // Mock successful document fetch
    (getFirestore as jest.Mock).mockReturnValueOnce('firestore-instance');
    (doc as jest.Mock).mockReturnValueOnce('actor-doc-ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: jest.fn(() => true),
      data: jest.fn(() => ({
        name: 'Test Actor',
        gender: 'male',
        modelStatus: 'completed',
        createdAt: '2023-01-01T00:00:00.000Z',
      })),
      id: 'test-actor-id',
    });
    
    const { result } = renderHook(() => useActor('test-actor-id'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.actor).toEqual({
        id: 'test-actor-id',
        name: 'Test Actor',
        gender: 'male',
        modelStatus: 'completed',
        createdAt: '2023-01-01T00:00:00.000Z',
      });
      expect(result.current.error).toBeNull();
    });
  });
  
  test('returns error when document fetch fails', async () => {
    // Mock failed document fetch
    (getFirestore as jest.Mock).mockReturnValueOnce('firestore-instance');
    (doc as jest.Mock).mockReturnValueOnce('actor-doc-ref');
    (getDoc as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch actor'));
    
    const { result } = renderHook(() => useActor('test-actor-id'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.actor).toBeNull();
      expect(result.current.error).toEqual(new Error('Failed to fetch actor'));
    });
  });
  
  test('returns not found error when document does not exist', async () => {
    // Mock document not found
    (getFirestore as jest.Mock).mockReturnValueOnce('firestore-instance');
    (doc as jest.Mock).mockReturnValueOnce('actor-doc-ref');
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: jest.fn(() => false),
    });
    
    const { result } = renderHook(() => useActor('test-actor-id'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.actor).toBeNull();
      expect(result.current.error).toEqual(new Error('Actor not found'));
    });
  });
});
