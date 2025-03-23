import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { functions, firestore } from './firebase';

interface TrainingResult {
  jobId: string;
  actorId: string;
  modelId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTimeRemaining?: number;
}

/**
 * Checks if the device is currently online
 * @returns boolean indicating online status
 */
const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Initiates the training process for an AI actor
 * @param actorId The ID of the actor to train
 * @returns A promise resolving to the training job details
 */
export async function initiateTraining(actorId: string): Promise<TrainingResult> {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot start training while offline. Please connect to the internet and try again.');
  }
  
  try {
    // Use simulation for local development
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      console.log('Using simulated training for development');
      const trainingResult = await simulateTraining(actorId);
      return trainingResult;
    }
    
    // Call Firebase Function to initiate training
    const trainModelFn = httpsCallable(functions, 'trainModel');
    const result = await trainModelFn({ actorId });
    
    // Update actor in Firestore with training status
    const trainingResult = result.data as TrainingResult;
    
    // Update the actor document with training job info
    await updateDoc(doc(firestore, 'actors', actorId), {
      modelStatus: 'training',
      trainingJobId: trainingResult.jobId,
      modelId: trainingResult.modelId
    });
    
    return trainingResult;
  } catch (error: any) {
    console.error('Error initiating training:', error);
    
    // Provide more user-friendly error messages
    if (error.code === 'functions/unavailable') {
      throw new Error('Training service is currently unavailable. Please try again later.');
    } else if (error.code === 'functions/resource-exhausted') {
      throw new Error('Training capacity reached. Please try again later when system resources are available.');
    } else if (error.code === 'functions/invalid-argument') {
      throw new Error('Invalid actor data. Please ensure you have uploaded enough clear images.');
    } else if (!isOnline()) {
      throw new Error('Connection lost during training request. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'Failed to start training. Please try again later.');
    }
  }
}

/**
 * Retries a failed training job
 * @param actorId The ID of the actor to retry training for
 * @param jobId The original job ID that failed
 * @returns A promise resolving to the new training job details
 */
export async function retryTraining(actorId: string, jobId: string): Promise<TrainingResult> {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot retry training while offline. Please connect to the internet and try again.');
  }
  
  try {
    // Use simulation for local development
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      console.log('Using simulated training for retry');
      const trainingResult = await simulateTraining(actorId);
      return trainingResult;
    }
    
    // Call Firebase Function to retry training
    const retryTrainingFn = httpsCallable(functions, 'retryTraining');
    const result = await retryTrainingFn({ actorId, jobId });
    
    // Update actor in Firestore with new training status
    const trainingResult = result.data as TrainingResult;
    
    // Update the actor document with new training job info
    await updateDoc(doc(firestore, 'actors', actorId), {
      modelStatus: 'training',
      trainingJobId: trainingResult.jobId,
      modelId: trainingResult.modelId
    });
    
    return trainingResult;
  } catch (error: any) {
    console.error('Error retrying training:', error);
    
    if (!isOnline()) {
      throw new Error('Connection lost during retry request. Please check your internet connection.');
    } else {
      throw new Error(error.message || 'Failed to retry training. Please try again later.');
    }
  }
}

/**
 * Checks the current status of a training job
 * Note: This is for direct status checks. For real-time updates,
 * use Firestore listeners on the training job document instead.
 * 
 * @param jobId The ID of the training job to check
 * @returns A promise resolving to the current job status
 */
export async function checkTrainingStatus(jobId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  estimatedTimeRemaining?: number;
}> {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot check training status while offline. Please connect to the internet and try again.');
  }
  
  try {
    // Use simulation for local development
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      console.log('Using simulated status check');
      // Create a simulated status
      const progress = Math.floor(Math.random() * 100);
      return {
        status: progress < 100 ? 'processing' : 'completed',
        progress,
        estimatedTimeRemaining: progress < 100 ? (100 - progress) * 9 : 0
      };
    }
    
    const checkStatusFn = httpsCallable(functions, 'checkTrainingStatus');
    const result = await checkStatusFn({ jobId });
    return result.data as {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      error?: string;
      estimatedTimeRemaining?: number;
    };
  } catch (error: any) {
    console.error('Error checking training status:', error);
    
    if (!isOnline()) {
      throw new Error('Connection lost while checking status. Please check your internet connection.');
    }
    
    throw new Error(error.message || 'Failed to check training status. Please try again later.');
  }
}

/**
 * Cancels an ongoing training job
 * @param jobId The ID of the training job to cancel
 * @param actorId The ID of the actor
 * @returns A promise resolving to the updated job status
 */
export async function cancelTraining(jobId: string, actorId: string): Promise<{ success: boolean }> {
  // Check if online first
  if (!isOnline()) {
    throw new Error('Cannot cancel training while offline. Please connect to the internet and try again.');
  }
  
  try {
    // Use simulation for local development
    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
      console.log('Using simulated cancel');
      
      // Update actor document in Firestore
      await updateDoc(doc(firestore, 'actors', actorId), {
        modelStatus: 'pending',
        trainingJobId: null
      });
      
      return { success: true };
    }
    
    const cancelTrainingFn = httpsCallable(functions, 'cancelTraining');
    const result = await cancelTrainingFn({ jobId });
    
    // Update actor document in Firestore
    await updateDoc(doc(firestore, 'actors', actorId), {
      modelStatus: 'pending',
      trainingJobId: null
    });
    
    return result.data as { success: boolean };
  } catch (error: any) {
    console.error('Error canceling training:', error);
    
    if (!isOnline()) {
      throw new Error('Connection lost while canceling training. Please check your internet connection.');
    }
    
    throw new Error(error.message || 'Failed to cancel training. Please try again later.');
  }
}

/**
 * Estimates the training time based on the number of images
 * This is just a rough estimate for user feedback
 * 
 * @param imageCount Number of images being used for training
 * @returns Estimated training time in minutes
 */
export function estimateTrainingTime(imageCount: number): number {
  // Base time of 10 minutes + 1 minute per image
  const baseTime = 10;
  const timePerImage = 1;
  
  // Calculate estimated time in minutes
  return baseTime + (imageCount * timePerImage);
}

/**
 * Simulates the training process for development and testing
 * This is used when actual training infrastructure is not available
 * 
 * @param actorId The ID of the actor to simulate training for
 * @returns A promise resolving to a simulated training job
 */
export async function simulateTraining(actorId: string): Promise<TrainingResult> {
  return new Promise((resolve) => {
    // Create a simulated training job with random ID
    const jobId = `sim_${Math.random().toString(36).substring(2, 15)}`;
    const modelId = `model_${Math.random().toString(36).substring(2, 15)}`;
    
    console.log('Simulating training for actor:', actorId);
    console.log('Generated mock job ID:', jobId);
    
    try {
      // Update the actor document in Firestore
      updateDoc(doc(firestore, 'actors', actorId), {
        modelStatus: 'training',
        trainingJobId: jobId,
        modelId: modelId
      }).then(() => {
        console.log('Actor document updated with training status');
      }).catch(err => {
        console.error('Error updating actor document:', err);
      });
      
      // Create a training job document in Firestore
      setDoc(doc(firestore, 'trainingJobs', jobId), {
        progress: 0,
        estimatedTimeRemaining: 900,
        status: 'processing',
        createdAt: new Date(),
        updatedAt: new Date(),
        actorId: actorId,
        userId: localStorage.getItem('userId') || 'test-user'
      }).then(() => {
        console.log('Created training job document');
      }).catch(err => {
        console.error('Error creating training job document:', err);
      });
      
      const trainingResult: TrainingResult = {
        jobId,
        actorId,
        modelId,
        status: 'processing',
        estimatedTimeRemaining: 900 // 15 minutes in seconds
      };
      
      resolve(trainingResult);
      
      // Simulate training progress - shorter for development (30 seconds total)
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10; // Faster progress updates for development
        
        // Update the training job document with progress
        if (progress < 100) {
          updateDoc(doc(firestore, 'trainingJobs', jobId), {
            progress,
            estimatedTimeRemaining: Math.round(30 * (1 - progress / 100)),
            status: 'processing',
            updatedAt: new Date()
          }).then(() => {
            console.log(`Updated training progress: ${progress}%`);
          }).catch(err => {
            console.error('Error updating training progress:', err);
          });
        } else {
          // Complete the training
          clearInterval(interval);
          updateDoc(doc(firestore, 'trainingJobs', jobId), {
            progress: 100,
            estimatedTimeRemaining: 0,
            status: 'completed',
            completedAt: new Date()
          }).then(() => {
            console.log('Training completed successfully');
          }).catch(err => {
            console.error('Error marking training as complete:', err);
          });
          
          // Update the actor document
          updateDoc(doc(firestore, 'actors', actorId), {
            modelStatus: 'completed',
          }).then(() => {
            console.log('Updated actor with completed status');
          }).catch(err => {
            console.error('Error updating actor with completed status:', err);
          });
        }
      }, 3000); // Update every 3 seconds for a total of ~30 seconds
    } catch (err) {
      console.error('Error in simulated training:', err);
      // Still resolve with a result to avoid blocking UI
      resolve({
        jobId,
        actorId,
        modelId,
        status: 'processing'
      });
    }
  });
}
