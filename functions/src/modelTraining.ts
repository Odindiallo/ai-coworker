import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Constants for Hugging Face API
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models';

// Initialize Firestore if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Hugging Face token from environment variables
const huggingFaceToken = functions.config().huggingface?.token || process.env.HUGGINGFACE_TOKEN;

/**
 * Interface for training request data
 */
interface TrainingRequest {
  actorId: string;
  userId: string;
  baseModelId: string;
  imageUrls: string[];
  instanceName: string;
  trainingSteps?: number;
  trainingBatchSize?: number;
  learningRate?: number;
}

/**
 * Interface for training job data stored in Firestore
 */
interface TrainingJob {
  userId: string;
  actorId: string;
  status: 'pending' | 'preparing' | 'training' | 'completed' | 'failed';
  baseModelId: string;
  startTime: admin.firestore.Timestamp;
  endTime?: admin.firestore.Timestamp;
  progress?: number;
  trainedModelId?: string;
  error?: string;
  imageCount: number;
  instanceName: string;
  trainingSteps: number;
  trainingBatchSize: number;
  learningRate: number;
  jobId?: string;
}

/**
 * Firebase Function to initiate actor model training
 */
export const initiateModelTraining = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes (max is 9 minutes for HTTP functions)
    memory: '1GB'
  })
  .https.onCall(async (data: TrainingRequest, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to initiate model training'
      );
    }
    
    // Validate request
    if (
      !data.actorId ||
      !data.userId ||
      !data.baseModelId ||
      !Array.isArray(data.imageUrls) ||
      data.imageUrls.length < 5 || // Minimum 5 images required
      !data.instanceName
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid training request. Ensure actorId, userId, baseModelId, instanceName are provided and imageUrls contains at least 5 images.'
      );
    }
    
    // Verify that user ID matches authenticated user
    if (data.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User ID in request does not match authenticated user'
      );
    }
    
    try {
      // Verify actor exists and belongs to the user
      const actorDoc = await admin.firestore()
        .collection('actors')
        .doc(data.actorId)
        .get();
      
      if (!actorDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Actor not found'
        );
      }
      
      const actorData = actorDoc.data() || {};
      if (actorData.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Actor does not belong to the authenticated user'
        );
      }
      
      // Create training job document
      const trainingJob: TrainingJob = {
        userId: data.userId,
        actorId: data.actorId,
        status: 'pending',
        baseModelId: data.baseModelId,
        startTime: admin.firestore.Timestamp.now(),
        imageCount: data.imageUrls.length,
        instanceName: data.instanceName,
        trainingSteps: data.trainingSteps || 1500,
        trainingBatchSize: data.trainingBatchSize || 4,
        learningRate: data.learningRate || 1e-6
      };
      
      // Create training job in Firestore
      const trainingJobRef = await admin.firestore()
        .collection('training_jobs')
        .add(trainingJob);
      
      // Update actor document with training status
      await admin.firestore()
        .collection('actors')
        .doc(data.actorId)
        .update({
          modelStatus: 'training',
          trainingJobId: trainingJobRef.id,
          trainingStartTime: admin.firestore.Timestamp.now()
        });
      
      // Start the training process asynchronously
      processTrainingJob(trainingJobRef.id, data).catch(error => {
        console.error('Error processing training job:', error);
      });
      
      // Return job ID to client
      return {
        success: true,
        jobId: trainingJobRef.id,
        message: 'Training job initiated successfully'
      };
    } catch (error: any) {
      console.error('Error initiating model training:', error);
      
      throw new functions.https.HttpsError(
        'internal',
        'Failed to initiate model training',
        error
      );
    }
  });

/**
 * Process a training job (download images, create training dataset, submit to Hugging Face)
 */
async function processTrainingJob(jobId: string, data: TrainingRequest): Promise<void> {
  const db = admin.firestore();
  const jobRef = db.collection('training_jobs').doc(jobId);
  
  try {
    // Update job status to preparing
    await jobRef.update({
      status: 'preparing',
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    // Prepare training data
    const trainingData = await prepareTrainingData(data.imageUrls, data.instanceName);
    
    // Update job status to training
    await jobRef.update({
      status: 'training',
      progress: 0,
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    // Submit training job to Hugging Face (or simulated for this implementation)
    const huggingFaceJobId = await submitTrainingJob(
      data.baseModelId,
      trainingData,
      {
        steps: data.trainingSteps || 1500,
        batchSize: data.trainingBatchSize || 4,
        learningRate: data.learningRate || 1e-6,
        instanceName: data.instanceName
      }
    );
    
    // Update job with Hugging Face job ID
    await jobRef.update({
      jobId: huggingFaceJobId,
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    // Set up progress monitoring
    await monitorTrainingProgress(jobId, huggingFaceJobId);
  } catch (error: any) {
    console.error('Error processing training job:', error);
    
    // Update job status to failed
    await jobRef.update({
      status: 'failed',
      error: error.message || 'Unknown error occurred during training',
      endTime: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    // Update actor document with training status
    const job = (await jobRef.get()).data() as TrainingJob;
    await db
      .collection('actors')
      .doc(job.actorId)
      .update({
        modelStatus: 'failed',
        modelError: error.message || 'Unknown error occurred during training'
      });
  }
}

/**
 * Prepare training data by downloading images and creating captions
 */
async function prepareTrainingData(
  imageUrls: string[],
  instanceName: string
): Promise<Array<{ imagePath: string; caption: string }>> {
  const trainingData: Array<{ imagePath: string; caption: string }> = [];
  const tempDir = os.tmpdir();
  
  // Process each image URL
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const imageUrl = imageUrls[i];
      
      // Download image
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imagePath = path.join(tempDir, `${instanceName}_${i}.jpg`);
      
      // Save image to temp directory
      fs.writeFileSync(imagePath, Buffer.from(response.data));
      
      // Create caption
      const caption = `a photo of ${instanceName}, person`;
      
      // Add to training data
      trainingData.push({ imagePath, caption });
    } catch (error: any) {
      console.error(`Error downloading image ${i}:`, error);
      // Continue with other images
    }
  }
  
  // Check if we have enough images
  if (trainingData.length < 3) {
    throw new Error('Failed to download enough training images. At least 3 are required.');
  }
  
  return trainingData;
}

/**
 * Submit a training job to Hugging Face
 * Note: This is a simplified implementation. In a real-world scenario,
 * you would interact with the Hugging Face API or a custom backend.
 */
async function submitTrainingJob(
  baseModelId: string,
  trainingData: Array<{ imagePath: string; caption: string }>,
  options: {
    steps: number;
    batchSize: number;
    learningRate: number;
    instanceName: string;
  }
): Promise<string> {
  // For this implementation, we'll simulate a successful submission
  // In a real implementation, you would:
  // 1. Upload images to Hugging Face or prepare a dataset
  // 2. Submit a fine-tuning job via API
  // 3. Get a job ID for tracking
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a mock job ID
  const jobId = `hf_ft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return jobId;
}

/**
 * Monitor training progress
 * In a real implementation, this would poll the Hugging Face API
 * or use webhooks to update the job status
 */
async function monitorTrainingProgress(jobId: string, huggingFaceJobId: string): Promise<void> {
  const db = admin.firestore();
  const jobRef = db.collection('training_jobs').doc(jobId);
  
  // For this implementation, we'll simulate progress updates
  // In a real implementation, you would poll the Hugging Face API
  
  try {
    // Simulate training steps
    const totalSteps = 10;
    for (let step = 1; step <= totalSteps; step++) {
      // Simulate training time (faster for the demo)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update progress
      const progress = Math.floor((step / totalSteps) * 100);
      await jobRef.update({
        progress,
        updatedAt: admin.firestore.Timestamp.now()
      });
    }
    
    // Generate trained model ID
    const job = (await jobRef.get()).data() as TrainingJob;
    const trainedModelId = `user/${job.userId}/models/${job.instanceName}`;
    
    // Update job status to completed
    await jobRef.update({
      status: 'completed',
      progress: 100,
      trainedModelId,
      endTime: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    // Update actor document with trained model ID
    await db
      .collection('actors')
      .doc(job.actorId)
      .update({
        modelStatus: 'completed',
        modelId: trainedModelId,
        trainingCompletedAt: admin.firestore.Timestamp.now()
      });
  } catch (error: any) {
    console.error('Error monitoring training progress:', error);
    
    // Update job status to failed
    await jobRef.update({
      status: 'failed',
      error: error.message || 'Unknown error occurred while monitoring training',
      endTime: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    // Update actor document with training status
    const job = (await jobRef.get()).data() as TrainingJob;
    await db
      .collection('actors')
      .doc(job.actorId)
      .update({
        modelStatus: 'failed',
        modelError: error.message || 'Unknown error occurred while monitoring training'
      });
  }
}

/**
 * Firebase Function to check model training status
 */
export const getModelTrainingStatus = functions.https.onCall(
  async (data: { jobId: string }, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to check training status'
      );
    }
    
    // Validate request
    if (!data.jobId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Job ID is required'
      );
    }
    
    try {
      // Get job document
      const jobDoc = await admin.firestore()
        .collection('training_jobs')
        .doc(data.jobId)
        .get();
      
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Training job not found'
        );
      }
      
      const jobData = jobDoc.data() as TrainingJob;
      
      // Verify that job belongs to the user
      if (jobData.userId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Training job does not belong to the authenticated user'
        );
      }
      
      // Return job status
      return {
        status: jobData.status,
        progress: jobData.progress || 0,
        trainedModelId: jobData.trainedModelId,
        error: jobData.error,
        startTime: jobData.startTime.toDate(),
        endTime: jobData.endTime ? jobData.endTime.toDate() : null
      };
    } catch (error: any) {
      console.error('Error checking training status:', error);
      
      throw new functions.https.HttpsError(
        'internal',
        'Failed to check training status',
        error
      );
    }
  }
);

/**
 * Firebase Function to generate image using a trained model
 */
export const generateImage = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '2GB'
  })
  .https.onCall(async (data: {
    modelId: string,
    prompt: string,
    negativePrompt?: string,
    width?: number,
    height?: number,
    numInferenceSteps?: number,
    guidanceScale?: number,
    seed?: number
  }, context) => {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate images'
      );
    }
    
    // Validate request
    if (!data.modelId || !data.prompt) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Model ID and prompt are required'
      );
    }
    
    // Check if model belongs to user (if it's a custom trained model)
    if (data.modelId.startsWith(`user/${context.auth.uid}/models/`)) {
      // It's a user model, we've confirmed it belongs to them
    } else if (data.modelId.startsWith('user/')) {
      // It's another user's model, reject
      throw new functions.https.HttpsError(
        'permission-denied',
        'Cannot use another user\'s custom model'
      );
    }
    // Else it's a public model, which is allowed
    
    try {
      // Set default options if not provided
      const defaultOptions = {
        width: 512,
        height: 512,
        numInferenceSteps: 50,
        guidanceScale: 7.5
      };
      
      const options = { ...defaultOptions, ...data };
      
      // Make API request to Hugging Face
      const response = await axios.post(
        `${HUGGING_FACE_API_URL}/${data.modelId}`,
        {
          inputs: data.prompt,
          parameters: {
            negative_prompt: data.negativePrompt || '',
            width: options.width,
            height: options.height,
            num_inference_steps: options.numInferenceSteps,
            guidance_scale: options.guidanceScale,
            seed: options.seed
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${huggingFaceToken}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );
      
      // Get the image data
      const imageBuffer = Buffer.from(response.data);
      
      // Upload image to Firebase Storage
      const fileName = `generated/${context.auth.uid}/${Date.now()}.jpg`;
      const bucket = admin.storage().bucket();
      const file = bucket.file(fileName);
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            prompt: data.prompt,
            negativePrompt: data.negativePrompt || '',
            modelId: data.modelId,
            width: options.width.toString(),
            height: options.height.toString(),
            steps: options.numInferenceSteps.toString(),
            guidanceScale: options.guidanceScale.toString(),
            seed: options.seed ? options.seed.toString() : 'random'
          }
        }
      });
      
      // Get download URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Far future expiration
      });
      
      // Store generation info in Firestore
      const generationDoc = await admin.firestore()
        .collection('generations')
        .add({
          userId: context.auth.uid,
          modelId: data.modelId,
          prompt: data.prompt,
          negativePrompt: data.negativePrompt || '',
          imageUrl: url,
          createdAt: admin.firestore.Timestamp.now(),
          width: options.width,
          height: options.height,
          steps: options.numInferenceSteps,
          guidanceScale: options.guidanceScale,
          seed: options.seed || null,
          storagePath: fileName
        });
      
      // Return the image URL and generation ID
      return {
        success: true,
        imageUrl: url,
        generationId: generationDoc.id
      };
    } catch (error) {
      console.error('Error generating image:', error);
      
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate image',
        error
      );
    }
  });
