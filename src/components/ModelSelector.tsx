import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import huggingFaceService, { ModelInfo, ModelType } from '../lib/huggingFaceService';

interface ModelSelectorProps {
  onSelectModel: (model: ModelInfo) => void;
  selectedModelId?: string;
  userPreference?: {
    style?: 'realistic' | 'artistic' | 'stylized';
    quality?: 'fast' | 'balanced' | 'high';
    specialization?: string;
  };
  className?: string;
}

/**
 * Model selector component for choosing AI models
 * Displays available models with descriptions and recommendations
 */
const ModelSelector: React.FC<ModelSelectorProps> = ({
  onSelectModel,
  selectedModelId,
  userPreference,
  className
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(selectedModelId);
  const [loading, setLoading] = useState(true);
  const [recommendationShown, setRecommendationShown] = useState(false);

  // Load models
  useEffect(() => {
    // Get models from HuggingFace service
    const availableModels = huggingFaceService.RECOMMENDED_MODELS;
    setModels(availableModels);
    setLoading(false);

    // If there's a user preference, show recommendation
    if (userPreference && !selectedModelId && !recommendationShown) {
      const recommendedModel = huggingFaceService.getRecommendedModel(userPreference);
      setSelectedModel(recommendedModel.id);
      onSelectModel(recommendedModel);
      setRecommendationShown(true);
    }
  }, [userPreference, onSelectModel, selectedModelId, recommendationShown]);

  // Handle model selection
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      onSelectModel(model);
    }
  };

  // Get model by ID
  const getModelById = (modelId: string): ModelInfo | undefined => {
    return models.find(model => model.id === modelId);
  };

  // Format model size for display
  const formatModelSize = (size: 'small' | 'medium' | 'large'): string => {
    switch (size) {
      case 'small':
        return 'Small (Fast)';
      case 'medium':
        return 'Medium (Balanced)';
      case 'large':
        return 'Large (High Quality)';
      default:
        return size;
    }
  };

  // Generate recommendation badge if model is recommended based on user preference
  const getRecommendationBadge = (model: ModelInfo): React.ReactNode => {
    if (!userPreference) return null;
    
    const recommendedModel = huggingFaceService.getRecommendedModel(userPreference);
    
    if (model.id === recommendedModel.id) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 ml-2">
          Recommended
        </span>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Select AI Model</CardTitle>
        <CardDescription>
          Choose the model that best fits your needs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedModel}
          onValueChange={handleModelChange}
          className="space-y-4"
        >
          {models.map(model => (
            <div key={model.id} className="flex items-start space-x-2">
              <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
              <div className="grid gap-1.5 leading-none">
                <div className="flex items-center">
                  <Label htmlFor={model.id} className="font-medium">
                    {model.name}
                    {getRecommendationBadge(model)}
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoCircledIcon className="h-4 w-4 ml-2 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent className="w-80 p-4">
                        <div className="space-y-2">
                          <p className="font-semibold">{model.name}</p>
                          <p>{model.description}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                            <div>
                              <span className="font-medium">Size:</span>{' '}
                              {formatModelSize(model.size)}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>{' '}
                              {model.type}
                            </div>
                            {model.specialization && (
                              <div>
                                <span className="font-medium">Specialization:</span>{' '}
                                {model.specialization}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Free Tier:</span>{' '}
                              {model.freeTier ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-sm text-gray-500 flex flex-wrap items-center gap-1">
                  {model.recommendedFor?.map((tag, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        {selectedModel && (
          <div>
            <p>Current selection: <span className="font-medium">{getModelById(selectedModel)?.name}</span></p>
            {getModelById(selectedModel)?.inferenceTime === 'slow' && (
              <p className="mt-1 text-amber-600">
                Note: This model may take longer to generate images
              </p>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ModelSelector;
