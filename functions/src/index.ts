import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { Request, Response } from 'express';

// Initialize Firebase Admin
admin.initializeApp();

// Import function modules
import { logErrorToCrashlytics } from './crashlytics';
import { initiateModelTraining, getModelTrainingStatus, generateImage } from './modelTraining';
// Import other modules as needed

// Export all functions for deployment
export {
  logErrorToCrashlytics,
  initiateModelTraining,
  getModelTrainingStatus,
  generateImage
};

// Set up CORS middleware
const corsHandler = cors({ origin: true });

// CORS Proxy for Firebase Storage
export const corsProxy = functions.https.onRequest((request: Request, response: Response) => {
  return corsHandler(request, response, async () => {
    try {
      const { path } = request.query;
      
      if (!path || typeof path !== 'string') {
        response.status(400).send({ error: 'Missing or invalid path parameter' });
        return;
      }
      
      // Get a reference to the file in Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(path);
      
      // Check if the file exists
      const [exists] = await file.exists();
      if (!exists) {
        response.status(404).send({ error: 'File not found' });
        return;
      }
      
      // Set the appropriate Content-Type header
      const [metadata] = await file.getMetadata();
      if (metadata.contentType) {
        response.set('Content-Type', metadata.contentType);
      }
      
      // Stream the file to the response
      file.createReadStream()
        .on('error', (error: Error) => {
          console.error('Error streaming file:', error);
          response.status(500).send({ error: 'Error streaming file' });
        })
        .pipe(response);
        
    } catch (error) {
      console.error('Error in CORS proxy:', error);
      response.status(500).send({ error: 'Internal server error' });
    }
  });
});

// Function to update user stats on actor creation
export const updateUserStatsOnActorCreation = functions.firestore
  .document('actors/{actorId}')
  .onCreate(async (snap, context) => {
    const actorData = snap.data();
    const userId = actorData.userId;
    
    // Get a reference to the user stats document
    const userStatsRef = admin.firestore().collection('user_stats').doc(userId);
    
    // Update the stats using a transaction to ensure atomic update
    try {
      await admin.firestore().runTransaction(async (transaction) => {
        const userStatsDoc = await transaction.get(userStatsRef);
        
        if (!userStatsDoc.exists) {
          // Create a new stats document if it doesn't exist
          transaction.set(userStatsRef, {
            actorsCreated: 1,
            actorsLimit: 5, // Default free tier limit
            imagesGenerated: 0,
            imagesLimit: 50, // Default free tier limit
            storageUsed: 0,
            storageLimit: 500 * 1024 * 1024, // 500 MB default
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // Update existing stats document
          const currentStats = userStatsDoc.data() || {};
          transaction.update(userStatsRef, {
            actorsCreated: ((currentStats.actorsCreated || 0) + 1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      
      // Log activity
      await admin.firestore().collection('user_activity').add({
        type: 'creation',
        userId,
        actorId: context.params.actorId,
        actorName: actorData.name,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user stats:', error);
      return { error: 'Failed to update user stats' };
    }
  });

// Function to update user stats on image generation
export const updateUserStatsOnImageGeneration = functions.firestore
  .document('actors/{actorId}/generations/{generationId}')
  .onCreate(async (snap, context) => {
    const generationData = snap.data();
    const userId = generationData.userId;
    const actorId = context.params.actorId;
    
    try {
      // First get the actor data to get the name
      const actorDoc = await admin.firestore().collection('actors').doc(actorId).get();
      if (!actorDoc.exists) {
        throw new Error('Actor document not found');
      }
      const actorData = actorDoc.data() || {};
      
      // Get a reference to the user stats document
      const userStatsRef = admin.firestore().collection('user_stats').doc(userId);
      
      // Calculate image size (approximation based on URL or use actual size)
      const imageSize = generationData.imageSize || 500 * 1024; // Default 500KB if not specified
      
      // Update the stats using a transaction
      await admin.firestore().runTransaction(async (transaction) => {
        const userStatsDoc = await transaction.get(userStatsRef);
        
        if (!userStatsDoc.exists) {
          // Create a new stats document if it doesn't exist
          transaction.set(userStatsRef, {
            actorsCreated: 1,
            actorsLimit: 5,
            imagesGenerated: 1,
            imagesLimit: 50,
            storageUsed: imageSize,
            storageLimit: 500 * 1024 * 1024,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // Update existing stats document
          const currentStats = userStatsDoc.data() || {};
          transaction.update(userStatsRef, {
            imagesGenerated: ((currentStats.imagesGenerated || 0) + 1),
            storageUsed: ((currentStats.storageUsed || 0) + imageSize),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      
      // Update actor lastUsed field
      await admin.firestore().collection('actors').doc(actorId).update({
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Log activity
      await admin.firestore().collection('user_activity').add({
        type: 'generation',
        userId,
        actorId,
        actorName: actorData.name || 'Unknown Actor',
        prompt: generationData.prompt,
        imageUrl: generationData.imageUrl,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user stats on image generation:', error);
      return { error: 'Failed to update user stats' };
    }
  });

// Function to update user stats when model training completes
export const updateUserStatsOnTrainingComplete = functions.firestore
  .document('actors/{actorId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const actorId = context.params.actorId;
    
    // Only proceed if the modelStatus field changed to 'completed'
    if (
      before.modelStatus !== 'completed' &&
      after.modelStatus === 'completed' &&
      after.userId
    ) {
      try {
        // Log activity
        await admin.firestore().collection('user_activity').add({
          type: 'training',
          userId: after.userId,
          actorId,
          actorName: after.name,
          status: 'completed',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { success: true };
      } catch (error) {
        console.error('Error logging training completion:', error);
        return { error: 'Failed to log training completion' };
      }
    }
    
    return null;
  });

// Health check endpoint for monitoring
export const healthCheck = functions.https.onRequest((request, response) => {
  response.status(200).send({ status: 'ok', timestamp: Date.now() });
});

// Cleanup function to regularly check and enforce storage limits
export const enforceStorageLimits = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const usersOverLimit = await admin.firestore()
      .collection('user_stats')
      .where('storageUsed', '>', admin.firestore.FieldValue.increment(0))
      .get();
    
    const batch = admin.firestore().batch();
    
    usersOverLimit.forEach(doc => {
      const stats = doc.data();
      
      // If user is over storage limit
      if (stats.storageUsed > stats.storageLimit) {
        // Add notification for the user
        const notificationRef = admin.firestore().collection('notifications').doc();
        batch.set(notificationRef, {
          userId: doc.id,
          type: 'storage_limit',
          message: 'You have exceeded your storage limit. Please delete some images or upgrade your account.',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    // Commit all notifications
    await batch.commit();
    
    return null;
  });
