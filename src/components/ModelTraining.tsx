import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { useToast } from './ui/use-toast';
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ModelSelector from './ModelSelector';
import { ModelInfo } from '../lib/huggingFaceService';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

interface ModelTrainingProps {
  actorId: string;
  actorName: string;
  imageUrls: string[];
  onTrainingComplete?: (modelId: string) => void;
  className?: string;
}

interface TrainingStatus {
  status: 'pending' | 'preparing' | 'training' | 'completed' | 'failed';
  progress?: number;
  trainedModelId?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Component for initiating and monitoring model training
 */
const ModelTraining: React.FC<ModelTrainingProps> = ({
  actorId,
  actorName,
  imageUrls,
  onTrainingComplete,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [instanceName, setInstanceName] = useState(actorName.toLowerCase().replace(/\s+/g, '_'));
  const [trainingSteps, setTrainingSteps] = useState(1500);
  const [advancedSettings, setAdvancedSettings] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);

  // Check if the actor already has a training job
  useEffect(() => {
    const checkExistingTraining = async () => {
      if (!user || !actorId) return;
      
      try {
        const actorDoc = await getDoc(doc(firestore, 'actors', actorId));
        if (actorDoc.exists()) {
          const actorData = actorDoc.data();
          
          // Check if the actor has a training job
          if (actorData.trainingJobId) {
            setJobId(actorData.trainingJobId);
            
            // Set up listener for job updates
            const unsubscribe = onSnapshot(
              doc(firestore, 'training_jobs', actorData.trainingJobId),
              (doc) => {
                if (doc.exists()) {
                  const jobData = doc.data();
                  setTrainingStatus({
                    status: jobData.status,
                    progress: jobData.progress || 0,
                    trainedModelId: jobData.trainedModelId,
                    error: jobData.error,
                    startTime: jobData.startTime?.toDate(),
                    endTime: jobData.endTime?.toDate()
                  });
                  
                  // If training completed, call the callback
                  if (jobData.status === 'completed' && jobData.trainedModelId && onTrainingComplete) {
                    onTrainingComplete(jobData.trainedModelId);
                  }
                }
              }
            );
            
            return () => unsubscribe();
          }
        }
      } catch (error) {
        console.error('Error checking existing training:', error);
      }
    };
    
    checkExistingTraining();
  }, [user, actorId, onTrainingComplete]);

  // Handle model selection
  const handleModelSelect = (model: ModelInfo) => {
    setSelectedModel(model);
  };

  // Start training process
  const handleStartTraining = async () => {
    if (!user || !selectedModel || !instanceName || instanceName.trim() === '') {
      toast({
        title: 'Missing Information',
        description: 'Please select a model and provide an instance name.',
        variant: 'destructive'
      });
      return;
    }
    
    if (imageUrls.length < 5) {
      toast({
        title: 'Not Enough Images',
        description: 'At least 5 images are required for training. Please upload more images.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsInitiating(true);
      
      // Call Firebase Function to initiate training
      const initiateModelTraining = httpsCallable(functions, 'initiateModelTraining');
      const result = await initiateModelTraining({
        actorId,
        userId: user.uid,
        baseModelId: selectedModel.id,
        imageUrls,
        instanceName: instanceName.trim(),
        trainingSteps,
        trainingBatchSize: 4, // Default value
        learningRate: 1e-6 // Default value
      });
      
      // @ts-ignore - result.data has the structure we expect
      const { success, jobId, message } = result.data;
      
      if (success && jobId) {
        setJobId(jobId);
        setTrainingStatus({
          status: 'pending',
          progress: 0
        });
        
        // Update actor document with training status
        await updateDoc(doc(firestore, 'actors', actorId), {
          modelStatus: 'training',
          trainingJobId: jobId,
          trainingStartTime: serverTimestamp()
        });
        
        // Show success toast
        toast({
          title: 'Training Started',
          description: 'Your AI actor model training has been initiated.',
          variant: 'default'
        });
      } else {
        throw new Error(message || 'Failed to start training');
      }
    } catch (error) {
      console.error('Error starting training:', error);
      
      toast({
        title: 'Training Failed',
        description: error.message || 'There was an error starting the training process.',
        variant: 'destructive'
      });
    } finally {
      setIsInitiating(false);
    }
  };

  // Get status indicator based on current training status
  const getStatusIndicator = () => {
    if (!trainingStatus) return null;
    
    const { status } = trainingStatus;
    
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center text-amber-600">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Initializing
          </div>
        );
      case 'preparing':
        return (
          <div className="flex items-center text-blue-600">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Preparing Data
          </div>
        );
      case 'training':
        return (
          <div className="flex items-center text-blue-600">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Training in Progress
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5 mr-2" />
            Training Complete
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            Training Failed
          </div>
        );
      default:
        return null;
    }
  };

  // Format time duration
  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return 'Unknown';
    
    const end = endTime || new Date();
    const diffMs = end.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Train AI Model</CardTitle>
        <CardDescription>
          Fine-tune a model to generate images of this actor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!trainingStatus || trainingStatus.status === 'failed' ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instanceName">Actor Name for Model</Label>
                <Input
                  id="instanceName"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="E.g., john_doe"
                  disabled={isInitiating}
                />
                <p className="text-xs text-gray-500">
                  This name will be used to identify your actor in prompts
                </p>
              </div>
              
              <ModelSelector 
                onSelectModel={handleModelSelect}
                userPreference={{ style: 'realistic', quality: 'balanced' }}
              />
              
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="advanced-settings">Advanced Settings</Label>
                  <Switch
                    id="advanced-settings"
                    checked={advancedSettings}
                    onCheckedChange={setAdvancedSettings}
                    disabled={isInitiating}
                  />
                </div>
              </div>
              
              {advancedSettings && (
                <div className="space-y-4 pt-2">
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="training-steps">Training Steps: {trainingSteps}</Label>
                      <span className="text-sm text-gray-500">
                        {trainingSteps < 1000 ? 'Fast' : trainingSteps > 2000 ? 'High Quality' : 'Balanced'}
                      </span>
                    </div>
                    <Slider
                      id="training-steps"
                      min={500}
                      max={3000}
                      step={100}
                      value={[trainingSteps]}
                      onValueChange={(value) => setTrainingSteps(value[0])}
                      disabled={isInitiating}
                    />
                    <p className="text-xs text-gray-500">
                      More steps give better results but take longer to train
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {imageUrls.length < 5 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Not Enough Images</AlertTitle>
                <AlertDescription>
                  You need at least 5 images to train a model. Currently you have {imageUrls.length} images.
                </AlertDescription>
              </Alert>
            )}
            
            {trainingStatus?.status === 'failed' && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Previous Training Failed</AlertTitle>
                <AlertDescription>
                  {trainingStatus.error || 'The previous training attempt failed. You can try again.'}
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Training Status</h3>
                {getStatusIndicator()}
              </div>
              
              {trainingStatus.status === 'training' && (
                <>
                  <Progress value={trainingStatus.progress} className="h-2" />
                  <p className="text-sm text-gray-600">
                    {trainingStatus.progress}% complete
                  </p>
                </>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Base Model</p>
                <p className="font-medium">{trainingStatus.baseModelId || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-500">Instance Name</p>
                <p className="font-medium">{instanceName}</p>
              </div>
              <div>
                <p className="text-gray-500">Training Images</p>
                <p className="font-medium">{imageUrls.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-medium">
                  {formatDuration(trainingStatus.startTime, trainingStatus.endTime)}
                </p>
              </div>
            </div>
            
            {trainingStatus.status === 'completed' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Training Complete</AlertTitle>
                <AlertDescription>
                  Your AI actor model has been successfully trained and is ready to use.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!trainingStatus || trainingStatus.status === 'failed' ? (
          <Button 
            onClick={handleStartTraining} 
            disabled={isInitiating || !selectedModel || imageUrls.length < 5}
          >
            {isInitiating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Initiating...
              </>
            ) : (
              'Start Training'
            )}
          </Button>
        ) : trainingStatus.status === 'completed' ? (
          <Button 
            onClick={() => onTrainingComplete && onTrainingComplete(trainingStatus.trainedModelId)}
            variant="outline"
          >
            Continue to Image Generation
          </Button>
        ) : (
          <Button disabled>Training in Progress</Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ModelTraining;
