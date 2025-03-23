const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Firebase function that initiates the training process for an AI actor.
 * 
 * This function:
 * 1. Validates the request (actor exists and belongs to the requesting user)
 * 2. Creates a training job in Firestore
 * 3. Sends a request to the Colab training notebook via a webhook
 * 4. Updates the actor's status to 'training'
 */
exports.trainModel = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to train a model'
    );
  }

  const { actorId } = data;
  if (!actorId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with an "actorId" argument'
    );
  }

  try {
    // Get actor document
    const actorRef = admin.firestore().collection('actors').doc(actorId);
    const actorDoc = await actorRef.get();

    // Check if actor exists
    if (!actorDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Actor not found'
      );
    }

    const actorData = actorDoc.data();

    // Check if actor belongs to the requesting user
    if (actorData.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to train this actor'
      );
    }

    // Check if actor is already training or completed
    if (actorData.modelStatus === 'training' || actorData.modelStatus === 'completed') {
      throw new functions.https.HttpsError(
        'already-exists',
        `Actor is already ${actorData.modelStatus}`
      );
    }

    // Generate a unique modelId for this training job
    const modelId = `${context.auth.uid.substring(0, 8)}_${uuidv4().substring(0, 8)}`;

    // Create a training job document
    const jobRef = await admin.firestore().collection('trainingJobs').add({
      userId: context.auth.uid,
      actorId: actorId,
      modelId: modelId,
      status: 'pending',
      progress: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      imageRefs: actorData.imageRefs || [],
      error: null
    });

    // Update actor's status to 'training' and store jobId
    await actorRef.update({
      modelStatus: 'training',
      trainingJobId: jobRef.id,
      modelId: modelId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // In a production environment, you would send a request to a Colab notebook or training server
    // For this demo, we'll simulate it by creating a delayed function that updates the status
    
    // In a real implementation, you would use something like:
    /*
    await axios.post(functions.config().training.webhook_url, {
      jobId: jobRef.id,
      actorId: actorId,
      modelId: modelId,
      userId: context.auth.uid,
      apiKey: functions.config().training.api_key
    });
    */

    // For demonstration, we'll simulate the training with a scheduled function
    // This will be replaced with actual training in a real production environment
    functions.logger.info('Training job created', {
      jobId: jobRef.id,
      actorId: actorId,
      modelId: modelId
    });

    // Return the job ID and status
    return {
      jobId: jobRef.id,
      actorId: actorId,
      modelId: modelId,
      status: 'pending'
    };
  } catch (error) {
    functions.logger.error('Error initiating training', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error initiating training process: ' + error.message
    );
  }
});

/**
 * For demonstration purposes only - this simulates the training process
 * In a real application, this would be replaced with actual model training
 */
exports.simulateTraining = functions.firestore
  .document('trainingJobs/{jobId}')
  .onCreate(async (snapshot, context) => {
    const jobData = snapshot.data();
    const { jobId } = context.params;
    const jobRef = snapshot.ref;
    const actorRef = admin.firestore().collection('actors').doc(jobData.actorId);

    try {
      // Update job to processing
      await jobRef.update({
        status: 'processing',
        progress: 10,
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Simulate training progress updates
      // In a real scenario, this would come from your training system
      const progressSteps = [25, 50, 75, 100];
      
      for (const progress of progressSteps) {
        // Wait a bit to simulate training time (2 seconds per step for demo)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update progress
        await jobRef.update({
          progress: progress,
          status: progress === 100 ? 'completed' : 'processing'
        });
      }

      // Mark training as complete
      await jobRef.update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update actor status
      await actorRef.update({
        modelStatus: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      // Log the error
      functions.logger.error('Error in training simulation', error);

      // Mark job as failed
      await jobRef.update({
        status: 'failed',
        error: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update actor status
      await actorRef.update({
        modelStatus: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return false;
    }
  });
