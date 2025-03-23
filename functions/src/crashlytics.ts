import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Crashlytics
if (!admin.apps.length) {
  admin.initializeApp();
}

interface ErrorLogData {
  message: string;
  stack?: string;
  name: string;
  context: string;
  timestamp: number;
  userAgent: string;
}

/**
 * Firebase function that logs errors to Crashlytics
 * Called from the client to record errors and exceptions
 */
export const logErrorToCrashlytics = functions.https.onCall(
  async (data: ErrorLogData, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    try {
      // Parse the context if it's a string
      let parsedContext = {};
      if (data.context) {
        try {
          parsedContext = JSON.parse(data.context);
        } catch (e) {
          console.error('Failed to parse error context:', e);
          parsedContext = { rawContext: data.context };
        }
      }

      // Create a record of the error in Firestore
      const errorRecord = {
        userId: context.auth.uid,
        errorType: data.name || 'Error',
        message: data.message || 'Unknown error',
        stack: data.stack,
        context: parsedContext,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: data.userAgent
      };
      
      await admin.firestore().collection('error_logs').add(errorRecord);

      return { success: true };
    } catch (error) {
      console.error('Error logging to Crashlytics:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to log error to Crashlytics',
        error
      );
    }
  }
);
