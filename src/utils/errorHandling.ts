/**
 * Error Handling Utilities
 * 
 * This module provides utilities for handling common errors in the application,
 * with a focus on Firebase-related errors.
 */

/**
 * Check if an error is a Firebase permission denied error
 */
export const isFirebasePermissionError = (error: unknown): boolean => {
  if (!error) return false;
  
  // Convert to string to safely check the error message
  const errorString = String(error);
  const errorMessage = error instanceof Error ? error.message : errorString;
  
  // Check for common Firebase permission error messages
  const permissionDeniedPatterns = [
    /permission[ _]denied/i,
    /insufficient[ _]permissions/i,
    /missing or insufficient permissions/i,
    /not authorized/i,
    /PERMISSION_DENIED/i,
    /FirebaseError: [a-z-]+ permission_denied/i,
  ];
  
  return permissionDeniedPatterns.some(pattern => pattern.test(errorMessage));
};

/**
 * Check if an error is a CORS-related error
 */
export const isCorsError = (error: unknown): boolean => {
  if (!error) return false;
  
  // Convert to string to safely check the error message
  const errorString = String(error);
  const errorMessage = error instanceof Error ? error.message : errorString;
  
  // Check for common CORS error messages
  const corsErrorPatterns = [
    /cors/i,
    /cross[- ]origin/i,
    /same[- ]origin policy/i,
    /access[- ]control[- ]allow[- ]origin/i,
    /origin is not allowed/i,
  ];
  
  return corsErrorPatterns.some(pattern => pattern.test(errorMessage));
};

/**
 * Get a user-friendly message from an error
 */
export const getUserFriendlyErrorMessage = (error: unknown): string => {
  if (!error) return 'An unknown error occurred';
  
  // Handle CORS errors
  if (isCorsError(error)) {
    return 'Cannot load resources from Firebase Storage. Please set up Firebase Storage for this project.';
  }
  
  // Handle permission errors
  if (isFirebasePermissionError(error)) {
    return 'You don\'t have permission to access this data. Please check your account permissions.';
  }
  
  // Handle network errors
  if (
    error instanceof Error && 
    (error.message.includes('network') || error.message.includes('connection'))
  ) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  // Default to the actual error message or a generic message
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }
  
  return 'An unexpected error occurred';
};

/**
 * Log an error to the console with additional context
 */
export const logError = (
  error: unknown, 
  context: string = 'Error', 
  additionalInfo: Record<string, unknown> = {}
): void => {
  console.error(`[${context}]`, {
    error,
    ...(error instanceof Error ? { 
      message: error.message,
      stack: error.stack,
    } : {}),
    ...additionalInfo,
  });
};

/**
 * Log a permission error and provide guidance
 */
export const logPermissionError = (
  error: unknown, 
  collection: string,
  operation: 'read' | 'write'
): void => {
  logError(error, 'Permission Error', {
    collection,
    operation,
    isPermissionError: isFirebasePermissionError(error),
    timestamp: new Date().toISOString(),
  });
  
  console.warn(
    `[Permission Error] ${operation === 'read' ? 'Reading from' : 'Writing to'} ` +
    `the ${collection} collection failed due to insufficient permissions. ` +
    'Check your Firestore security rules and authentication state.'
  );
};

/**
 * Log a CORS error and provide guidance on fixing it
 */
export const logCorsError = (
  error: unknown,
  url?: string
): void => {
  logError(error, 'CORS Error', {
    url,
    isCorsError: isCorsError(error),
    timestamp: new Date().toISOString(),
  });
  
  console.warn(
    `[CORS Error] Failed to load a resource due to Cross-Origin Resource Sharing (CORS) restrictions. ` +
    `This typically happens when Firebase Storage is not properly configured. ` +
    `URL: ${url || 'unknown'}`
  );
  
  console.info(
    `To fix CORS issues, you need to:\n` +
    `1. Make sure Firebase Storage is set up in the Firebase Console\n` +
    `2. Configure CORS on your Firebase Storage bucket\n` +
    `3. Deploy proper Storage security rules`
  );
}; 