/**
 * Firebase Permission Test Utilities
 * 
 * This module provides functions to test Firebase Firestore and Storage permissions
 * and helps diagnose permission issues in the application.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, firestore, storage } from '../lib/firebase';
import { User } from 'firebase/auth';

export interface PermissionTestResult {
  success: boolean;
  collection: string;
  operation: string;
  errorMessage?: string;
  details?: unknown;
}

/**
 * Tests read permission for a specific Firestore collection
 */
export const testCollectionReadPermission = async (
  collectionName: string,
  userId?: string
): Promise<PermissionTestResult> => {
  try {
    // If userId is provided, try to query documents for that user
    if (userId) {
      const q = query(
        collection(firestore, collectionName),
        where('userId', '==', userId)
      );
      await getDocs(q);
    } else {
      // Otherwise just try to get all documents in the collection
      await getDocs(collection(firestore, collectionName));
    }
    
    return {
      success: true,
      collection: collectionName,
      operation: 'read'
    };
  } catch (err) {
    const error = err as Error;
    return {
      success: false,
      collection: collectionName,
      operation: 'read',
      errorMessage: error.message,
      details: error
    };
  }
};

/**
 * Tests write permission for a specific Firestore collection
 */
export const testCollectionWritePermission = async (
  collectionName: string,
  userId: string,
  testDocId: string = 'permission_test_doc'
): Promise<PermissionTestResult> => {
  const testDocRef = doc(firestore, collectionName, testDocId);
  
  try {
    // Try to write a test document
    await setDoc(testDocRef, {
      userId,
      testField: 'test_value',
      createdAt: new Date()
    });
    
    // If successful, delete the test document
    await deleteDoc(testDocRef);
    
    return {
      success: true,
      collection: collectionName,
      operation: 'write'
    };
  } catch (err) {
    const error = err as Error;
    // Try to clean up if possible, but don't error if cleanup fails
    try {
      await deleteDoc(testDocRef);
    } catch (cleanupError) {
      console.warn('Failed to clean up test document', cleanupError);
    }
    
    return {
      success: false,
      collection: collectionName,
      operation: 'write',
      errorMessage: error.message,
      details: error
    };
  }
};

/**
 * Tests storage permissions
 */
export const testStoragePermission = async (
  userId: string,
  testPath: string = `test/${userId}/test-file.txt`
): Promise<PermissionTestResult> => {
  const testFileRef = ref(storage, testPath);
  
  try {
    // Try to upload a small test file
    await uploadString(testFileRef, 'Test content for permission check');
    
    // Try to get download URL
    await getDownloadURL(testFileRef);
    
    // Clean up
    await deleteObject(testFileRef);
    
    return {
      success: true,
      collection: 'storage',
      operation: 'read/write'
    };
  } catch (err) {
    const error = err as Error;
    // Try to clean up if possible
    try {
      await deleteObject(testFileRef);
    } catch (cleanupError) {
      console.warn('Failed to clean up test file', cleanupError);
    }
    
    return {
      success: false,
      collection: 'storage',
      operation: 'read/write',
      errorMessage: error.message,
      details: error
    };
  }
};

/**
 * Run a complete permissions test suite
 */
export const runPermissionTestSuite = async (currentUser: User): Promise<{
  results: PermissionTestResult[],
  passed: boolean,
  summary: string
}> => {
  if (!currentUser) {
    return {
      results: [],
      passed: false,
      summary: 'Cannot run permission tests - no authenticated user'
    };
  }
  
  const userId = currentUser.uid;
  const results: PermissionTestResult[] = [];
  
  // Test collections
  const collectionsToTest = [
    'users',
    'actors',
    'user_activity',
    'user_stats'
  ];
  
  // Run read tests
  for (const collectionName of collectionsToTest) {
    results.push(await testCollectionReadPermission(collectionName, userId));
  }
  
  // Run write tests for collections that should be writable by users
  results.push(await testCollectionWritePermission('users', userId));
  results.push(await testCollectionWritePermission('actors', userId));
  
  // Test storage permissions
  results.push(await testStoragePermission(userId));
  
  // Check if all tests passed
  const passed = results.every(result => result.success);
  
  // Generate summary
  const failedTests = results.filter(result => !result.success);
  let summary = passed 
    ? 'All permission tests passed successfully!'
    : `${failedTests.length} permission tests failed:`;
    
  if (!passed) {
    failedTests.forEach(test => {
      summary += `\n- ${test.collection} (${test.operation}): ${test.errorMessage}`;
    });
  }
  
  return {
    results,
    passed,
    summary
  };
};

/**
 * Create a simple display for permission test results
 */
export const formatTestResults = (results: PermissionTestResult[]): string => {
  let output = 'Firebase Permission Test Results:\n\n';
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    output += `${status} | ${result.collection} | ${result.operation}\n`;
    
    if (!result.success && result.errorMessage) {
      output += `  └─ Error: ${result.errorMessage}\n`;
    }
  });
  
  const passCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  output += '\nSummary: ';
  output += `${passCount} passed, ${failCount} failed`;
  
  return output;
};

/**
 * Check environment variables and configuration
 */
export const checkFirebaseEnvironment = (): {valid: boolean; issues: string[]} => {
  const issues: string[] = [];
  
  const requiredEnvVars = [
    { vite: 'VITE_FIREBASE_API_KEY', react: 'REACT_APP_FIREBASE_API_KEY' },
    { vite: 'VITE_FIREBASE_AUTH_DOMAIN', react: 'REACT_APP_FIREBASE_AUTH_DOMAIN' },
    { vite: 'VITE_FIREBASE_PROJECT_ID', react: 'REACT_APP_FIREBASE_PROJECT_ID' },
    { vite: 'VITE_FIREBASE_STORAGE_BUCKET', react: 'REACT_APP_FIREBASE_STORAGE_BUCKET' },
    { vite: 'VITE_FIREBASE_MESSAGING_SENDER_ID', react: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID' },
    { vite: 'VITE_FIREBASE_APP_ID', react: 'REACT_APP_FIREBASE_APP_ID' }
  ];
  
  for (const envVar of requiredEnvVars) {
    const hasVite = Boolean(import.meta.env[envVar.vite]);
    const hasReact = Boolean(process.env && process.env[envVar.react]);
    
    if (!hasVite && !hasReact) {
      issues.push(`Missing environment variable: ${envVar.vite} or ${envVar.react}`);
    }
  }
  
  // Check if Firebase is initialized
  if (!auth || !firestore || !storage) {
    issues.push('Firebase services are not properly initialized');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

export default {
  testCollectionReadPermission,
  testCollectionWritePermission,
  testStoragePermission,
  runPermissionTestSuite,
  formatTestResults,
  checkFirebaseEnvironment
}; 