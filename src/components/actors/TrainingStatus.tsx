import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

interface TrainingStatusProps {
  actorId: string;
  trainingJobId: string;
  initialStatus?: 'pending' | 'training' | 'completed' | 'failed';
  onComplete?: () => void;
}

interface TrainingJob {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: any;
  startedAt?: any;
  completedAt?: any;
  estimatedTimeRemaining?: number;
}

function TrainingStatus({ 
  actorId, 
  trainingJobId, 
  initialStatus = 'pending',
  onComplete 
}: TrainingStatusProps) {
  const [jobStatus, setJobStatus] = useState<TrainingJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle simulated training status updates for development mode
  useEffect(() => {
    console.log('TrainingStatus component initialized:', { 
      actorId, 
      trainingJobId, 
      initialStatus,
      isDevelopment
    });
    
    // Initialize with the initial status
    setJobStatus({
      status: initialStatus === 'training' ? 'processing' : initialStatus,
      progress: initialStatus === 'completed' ? 100 : 0,
      createdAt: new Date(),
      estimatedTimeRemaining: initialStatus === 'processing' || initialStatus === 'training' ? 900 : 0
    });

    // Skip if offline
    if (!isOnline) {
      console.log('Device is offline, skipping subscription');
      return;
    }

    // Development mode with simulated updates
    if (isDevelopment && (initialStatus === 'training' || initialStatus === 'processing')) {
      console.log('Setting up simulated training progress in development mode');
      
      let progress = 10; // Start at 10%
      const interval = setInterval(() => {
        progress += 10;
        console.log(`Simulated training progress: ${progress}%`);
        
        if (progress >= 100) {
          // Complete the training
          clearInterval(interval);
          
          setJobStatus({
            status: 'completed',
            progress: 100,
            createdAt: new Date(Date.now() - 60000),
            completedAt: new Date(),
            estimatedTimeRemaining: 0
          });
          
          // Call the completion callback
          if (onComplete) {
            console.log('Calling onComplete callback');
            onComplete();
          }
        } else {
          // Update progress
          setJobStatus({
            status: 'processing',
            progress,
            createdAt: new Date(Date.now() - 60000),
            updatedAt: new Date(),
            estimatedTimeRemaining: Math.round((100 - progress) * 3) // 3 seconds per 1%
          });
        }
      }, 3000); // Update every 3 seconds
      
      return () => {
        console.log('Cleaning up simulated training interval');
        clearInterval(interval);
      };
    }
    
    // Try to set up real-time updates from Firestore
    try {
      console.log(`Setting up Firestore listener for trainingJob: ${trainingJobId}`);
      
      const unsubscribe = onSnapshot(
        doc(firestore, 'trainingJobs', trainingJobId),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as TrainingJob;
            console.log('Received training job update:', data);
            setJobStatus(data);
            
            // Call onComplete callback when training is completed
            if (data.status === 'completed' && onComplete) {
              console.log('Training completed, calling onComplete callback');
              onComplete();
            }
          } else {
            console.warn('Training job document does not exist');
            setError('Training job not found');
            
            // In development, fall back to simulation if the document doesn't exist
            if (isDevelopment) {
              console.log('Development mode: Using simulated progress since document does not exist');
              setJobStatus({
                status: 'processing',
                progress: 20,
                createdAt: new Date(Date.now() - 60000),
                estimatedTimeRemaining: 240
              });
            }
          }
        },
        (err) => {
          console.error('Error in Firestore listener:', err);
          setError('Failed to get training status updates');
          
          // In development mode, fall back to simulation on error
          if (isDevelopment) {
            console.log('Development mode: Falling back to simulated progress due to Firestore error');
            setJobStatus({
              status: 'processing',
              progress: 20,
              createdAt: new Date(Date.now() - 60000),
              estimatedTimeRemaining: 240
            });
          }
        }
      );
      
      return () => {
        console.log('Cleaning up Firestore listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('Exception setting up Firestore listener:', err);
      setError('Failed to monitor training progress');
      
      // In development mode, use simulated progress on error
      if (isDevelopment) {
        console.log('Development mode: Using simulated progress due to exception');
        setJobStatus({
          status: 'processing',
          progress: 15,
          createdAt: new Date(Date.now() - 60000),
          estimatedTimeRemaining: 255
        });
      }
      
      return undefined;
    }
  }, [actorId, trainingJobId, initialStatus, isOnline, onComplete, isDevelopment]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (!seconds) return '';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            {!isOnline && (
              <p className="text-sm text-red-700 mt-2">
                You are currently offline. Reconnect to see the latest status.
              </p>
            )}
            {isDevelopment && (
              <p className="text-sm text-blue-700 mt-2">
                Development mode: Training will be simulated for testing purposes.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!jobStatus) {
    return (
      <div className="animate-pulse p-4 rounded-md bg-gray-50">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-2 bg-gray-200 rounded-full w-full"></div>
      </div>
    );
  }

  const getStatusColors = () => {
    switch (jobStatus.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-400';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-400';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-400';
    }
  };

  const getStatusText = () => {
    switch (jobStatus.status) {
      case 'completed':
        return 'Training completed successfully';
      case 'processing':
        return `Training in progress`;
      case 'failed':
        return 'Training failed';
      default:
        return 'Training pending - waiting to start';
    }
  };

  const getStatusIcon = () => {
    switch (jobStatus.status) {
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'failed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className={`rounded-lg border-l-4 ${getStatusColors()} p-4 space-y-3`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">{getStatusText()}</h3>
          {isDevelopment && (
            <p className="text-xs text-blue-600">(Development mode: Training is simulated)</p>
          )}
        </div>
      </div>
      
      {/* Progress information */}
      {jobStatus.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Progress</span>
            <span>{jobStatus.progress}%</span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${jobStatus.progress}%` }}
            ></div>
          </div>
          
          {/* Estimated time remaining */}
          {jobStatus.estimatedTimeRemaining && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Estimated time remaining:</span>
              <span>{formatTimeRemaining(jobStatus.estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Offline warning */}
      {!isOnline && (
        <div className="text-xs text-yellow-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          You're offline. Status updates will resume when you reconnect.
        </div>
      )}
      
      {/* Error message */}
      {jobStatus.status === 'failed' && jobStatus.error && (
        <div className="text-sm text-red-700">
          <p className="font-medium">Error details:</p>
          <p>{jobStatus.error}</p>
          <p className="mt-2">Please contact support if this issue persists.</p>
        </div>
      )}
      
      {/* Success message */}
      {jobStatus.status === 'completed' && (
        <div className="flex items-center mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-green-700">
            Your AI actor is ready! You can now generate images.
          </p>
        </div>
      )}
    </div>
  );
}

export default TrainingStatus;