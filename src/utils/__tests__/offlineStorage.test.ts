import {
  initOfflineStorage,
  saveToOfflineStorage,
  getFromOfflineStorage,
  removeFromOfflineStorage,
  clearOfflineStorage,
  getOfflinePendingOperations,
  addOfflinePendingOperation,
  removeOfflinePendingOperation,
  syncOfflinePendingOperations
} from '../offlineStorage';

describe('Offline Storage Utility Functions', () => {
  // Mock IndexedDB
  let mockDb;
  let mockTransaction;
  let mockObjectStore;
  let mockRequest;
  
  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    mockObjectStore = {
      put: jest.fn().mockReturnValue({ result: 'success' }),
      get: jest.fn().mockReturnValue({ result: 'test-data' }),
      delete: jest.fn().mockReturnValue({ result: undefined }),
      clear: jest.fn().mockReturnValue({ result: undefined }),
      getAll: jest.fn().mockReturnValue({ result: [{ id: 1, operation: 'PUT' }] })
    };
    
    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore)
    };
    
    mockDb = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
      close: jest.fn()
    };
    
    mockRequest = {
      result: mockDb,
      addEventListener: jest.fn((event, handler) => {
        if (event === 'success') {
          handler({ target: { result: mockDb } });
        }
      })
    };
    
    // Mock indexedDB
    global.indexedDB = {
      open: jest.fn().mockReturnValue(mockRequest),
      deleteDatabase: jest.fn()
    };
    
    // Mock IDBRequest events
    const originalAddEventListener = mockRequest.addEventListener;
    mockRequest.addEventListener = jest.fn((event, handler) => {
      if (event === 'success') {
        setTimeout(() => handler({ target: mockRequest }), 0);
      }
      return originalAddEventListener(event, handler);
    });
    
    mockRequest.transaction = {
      oncomplete: null
    };
    
    // Initialize storage
    initOfflineStorage();
  });
  
  // Cleanup after tests
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('initOfflineStorage', () => {
    test('should initialize the database properly', () => {
      expect(global.indexedDB.open).toHaveBeenCalledWith('aiActorGeneratorDB', expect.any(Number));
    });
    
    test('should create object stores on upgrade needed', () => {
      // Mock upgradeneeded event
      const mockUpgradeEvent = { target: { result: { createObjectStore: jest.fn() } } };
      const upgradeHandler = mockRequest.addEventListener.mock.calls.find(call => call[0] === 'upgradeneeded')?.[1];
      
      // Call the upgradeneeded handler
      if (upgradeHandler) {
        upgradeHandler(mockUpgradeEvent);
      }
      
      // Should create necessary object stores
      expect(mockUpgradeEvent.target.result.createObjectStore).toHaveBeenCalledWith('cachedData', { keyPath: 'key' });
      expect(mockUpgradeEvent.target.result.createObjectStore).toHaveBeenCalledWith('pendingOperations', { keyPath: 'id', autoIncrement: true });
    });
  });
  
  describe('saveToOfflineStorage', () => {
    test('should save data to IndexedDB', async () => {
      const testData = { name: 'Test Actor', status: 'pending' };
      
      await saveToOfflineStorage('actors/123', testData);
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('cachedData', 'readwrite');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('cachedData');
      
      // Should put the data
      expect(mockObjectStore.put).toHaveBeenCalledWith({
        key: 'actors/123',
        data: testData,
        timestamp: expect.any(Number)
      });
    });
    
    test('should handle errors when saving data', async () => {
      // Mock error
      mockObjectStore.put = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onerror?.({ target: { error: new Error('Storage error') } });
        }, 0);
        return request;
      });
      
      // Should reject with error
      await expect(saveToOfflineStorage('actors/123', { name: 'Test' })).rejects.toThrow('Storage error');
    });
  });
  
  describe('getFromOfflineStorage', () => {
    test('should retrieve data from IndexedDB', async () => {
      // Mock successful retrieval
      mockObjectStore.get = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ 
            target: { 
              result: { 
                key: 'actors/123', 
                data: { name: 'Test Actor' }, 
                timestamp: Date.now() 
              } 
            } 
          });
        }, 0);
        return request;
      });
      
      const result = await getFromOfflineStorage('actors/123');
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('cachedData', 'readonly');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('cachedData');
      
      // Should get the data
      expect(mockObjectStore.get).toHaveBeenCalledWith('actors/123');
      
      // Should return the data
      expect(result).toEqual({ name: 'Test Actor' });
    });
    
    test('should return null for non-existent data', async () => {
      // Mock not found
      mockObjectStore.get = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ target: { result: undefined } });
        }, 0);
        return request;
      });
      
      const result = await getFromOfflineStorage('non-existent');
      
      expect(result).toBeNull();
    });
    
    test('should handle errors when retrieving data', async () => {
      // Mock error
      mockObjectStore.get = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onerror?.({ target: { error: new Error('Retrieval error') } });
        }, 0);
        return request;
      });
      
      // Should reject with error
      await expect(getFromOfflineStorage('actors/123')).rejects.toThrow('Retrieval error');
    });
  });
  
  describe('removeFromOfflineStorage', () => {
    test('should remove data from IndexedDB', async () => {
      await removeFromOfflineStorage('actors/123');
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('cachedData', 'readwrite');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('cachedData');
      
      // Should delete the data
      expect(mockObjectStore.delete).toHaveBeenCalledWith('actors/123');
    });
    
    test('should handle errors when removing data', async () => {
      // Mock error
      mockObjectStore.delete = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onerror?.({ target: { error: new Error('Deletion error') } });
        }, 0);
        return request;
      });
      
      // Should reject with error
      await expect(removeFromOfflineStorage('actors/123')).rejects.toThrow('Deletion error');
    });
  });
  
  describe('clearOfflineStorage', () => {
    test('should clear all data from IndexedDB', async () => {
      await clearOfflineStorage();
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('cachedData', 'readwrite');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('cachedData');
      
      // Should clear the data
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });
    
    test('should handle errors when clearing data', async () => {
      // Mock error
      mockObjectStore.clear = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onerror?.({ target: { error: new Error('Clear error') } });
        }, 0);
        return request;
      });
      
      // Should reject with error
      await expect(clearOfflineStorage()).rejects.toThrow('Clear error');
    });
  });
  
  describe('Offline Pending Operations', () => {
    test('should add pending operations', async () => {
      const operation = {
        type: 'UPDATE',
        path: 'actors/123',
        data: { name: 'Updated Actor' }
      };
      
      await addOfflinePendingOperation(operation);
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('pendingOperations', 'readwrite');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingOperations');
      
      // Should put the operation
      expect(mockObjectStore.put).toHaveBeenCalledWith({
        type: 'UPDATE',
        path: 'actors/123',
        data: { name: 'Updated Actor' },
        timestamp: expect.any(Number)
      });
    });
    
    test('should get all pending operations', async () => {
      // Mock successful retrieval of pending operations
      mockObjectStore.getAll = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ 
            target: { 
              result: [
                { id: 1, type: 'UPDATE', path: 'actors/123', data: { name: 'Updated Actor' } },
                { id: 2, type: 'DELETE', path: 'actors/456' }
              ] 
            } 
          });
        }, 0);
        return request;
      });
      
      const operations = await getOfflinePendingOperations();
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('pendingOperations', 'readonly');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingOperations');
      
      // Should get all operations
      expect(mockObjectStore.getAll).toHaveBeenCalled();
      
      // Should return the operations
      expect(operations).toEqual([
        { id: 1, type: 'UPDATE', path: 'actors/123', data: { name: 'Updated Actor' } },
        { id: 2, type: 'DELETE', path: 'actors/456' }
      ]);
    });
    
    test('should remove pending operations', async () => {
      await removeOfflinePendingOperation(1);
      
      // Should start a transaction
      expect(mockDb.transaction).toHaveBeenCalledWith('pendingOperations', 'readwrite');
      
      // Should get the object store
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('pendingOperations');
      
      // Should delete the operation
      expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
    });
    
    test('should sync pending operations when online', async () => {
      // Mock Firebase functions
      const mockFirebaseUpdate = jest.fn().mockResolvedValue({ success: true });
      const mockFirebaseDelete = jest.fn().mockResolvedValue({ success: true });
      
      // Mock the firebaseService
      const mockFirebaseService = {
        updateDocument: mockFirebaseUpdate,
        deleteDocument: mockFirebaseDelete
      };
      
      // Mock successful retrieval of pending operations
      mockObjectStore.getAll = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ 
            target: { 
              result: [
                { id: 1, type: 'UPDATE', path: 'actors/123', data: { name: 'Updated Actor' } },
                { id: 2, type: 'DELETE', path: 'actors/456' }
              ] 
            } 
          });
        }, 0);
        return request;
      });
      
      // Mock successful deletion of pending operation
      mockObjectStore.delete = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ target: { result: undefined } });
        }, 0);
        return request;
      });
      
      // Call sync function
      const results = await syncOfflinePendingOperations(mockFirebaseService);
      
      // Should get all pending operations
      expect(mockObjectStore.getAll).toHaveBeenCalled();
      
      // Should process update operation
      expect(mockFirebaseUpdate).toHaveBeenCalledWith('actors/123', { name: 'Updated Actor' });
      
      // Should process delete operation
      expect(mockFirebaseDelete).toHaveBeenCalledWith('actors/456');
      
      // Should delete successful operations
      expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
      expect(mockObjectStore.delete).toHaveBeenCalledWith(2);
      
      // Should return results
      expect(results).toEqual({
        total: 2,
        successful: 2,
        failed: 0
      });
    });
    
    test('should handle errors during sync', async () => {
      // Mock Firebase functions with one success and one failure
      const mockFirebaseUpdate = jest.fn().mockResolvedValue({ success: true });
      const mockFirebaseDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
      
      // Mock the firebaseService
      const mockFirebaseService = {
        updateDocument: mockFirebaseUpdate,
        deleteDocument: mockFirebaseDelete
      };
      
      // Mock successful retrieval of pending operations
      mockObjectStore.getAll = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ 
            target: { 
              result: [
                { id: 1, type: 'UPDATE', path: 'actors/123', data: { name: 'Updated Actor' } },
                { id: 2, type: 'DELETE', path: 'actors/456' }
              ] 
            } 
          });
        }, 0);
        return request;
      });
      
      // Mock successful deletion of pending operation
      mockObjectStore.delete = jest.fn().mockImplementation(() => {
        const request = {};
        setTimeout(() => {
          request.onsuccess?.({ target: { result: undefined } });
        }, 0);
        return request;
      });
      
      // Call sync function
      const results = await syncOfflinePendingOperations(mockFirebaseService);
      
      // Should get all pending operations
      expect(mockObjectStore.getAll).toHaveBeenCalled();
      
      // Should process update operation
      expect(mockFirebaseUpdate).toHaveBeenCalledWith('actors/123', { name: 'Updated Actor' });
      
      // Should process delete operation
      expect(mockFirebaseDelete).toHaveBeenCalledWith('actors/456');
      
      // Should delete only successful operations
      expect(mockObjectStore.delete).toHaveBeenCalledWith(1);
      expect(mockObjectStore.delete).not.toHaveBeenCalledWith(2);
      
      // Should return results with the failure
      expect(results).toEqual({
        total: 2,
        successful: 1,
        failed: 1,
        errors: [expect.objectContaining({ id: 2, error: expect.any(Error) })]
      });
    });
  });
});
