import { useState, useEffect } from 'react';
import useBattery from '../../hooks/useBattery';
import BatteryStatus from '../ui/BatteryStatus';

interface PromptFormProps {
  onSubmit: (prompt: string, settings: GenerationSettings) => void;
  isLoading: boolean;
}

export interface GenerationSettings {
  negativePrompt: string;
  guidanceScale: number;
  numInferenceSteps: number;
  useLowMemoryMode: boolean;
}

function PromptForm({ onSubmit, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [numInferenceSteps, setNumInferenceSteps] = useState(50);
  const [useLowMemoryMode, setUseLowMemoryMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { imageGenerationSettings, shouldShowWarning, isBatteryLow, optimizationLevel } = useBattery();
  
  // Apply battery optimization settings
  useEffect(() => {
    // Only override if the user hasn't manually changed settings
    if (!showAdvanced) {
      setNumInferenceSteps(imageGenerationSettings.inferenceSteps);
      setUseLowMemoryMode(imageGenerationSettings.useLowMemoryMode);
    }
  }, [imageGenerationSettings, showAdvanced]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) return;
    
    // Submit the prompt and settings
    onSubmit(prompt, {
      negativePrompt,
      guidanceScale,
      numInferenceSteps,
      useLowMemoryMode
    });
  };
  
  return (
    <div className="space-y-4">
      {/* Show battery status if battery is low or if user has opened advanced settings */}
      {(shouldShowWarning || showAdvanced) && (
        <div className="mb-4">
          <BatteryStatus 
            showControls={showAdvanced} 
            compact={!showAdvanced}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Describe what you want to generate
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: A photo of [your actor name] wearing a business suit in an office setting, professional lighting"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-base"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Be as specific as possible. Include details like setting, outfit, pose, lighting, and style.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors touch-target min-h-[44px] flex items-center"
        >
          {showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}
        </button>
        
        {showAdvanced && (
          <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
            <div>
              <label htmlFor="negativePrompt" className="block text-sm font-medium text-gray-700 mb-1">
                Negative Prompt
              </label>
              <textarea
                id="negativePrompt"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Elements you want to avoid (e.g., blurry, bad lighting, deformed face)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Specify elements you don't want in the image
              </p>
            </div>
            
            <div>
              <label htmlFor="guidanceScale" className="block text-sm font-medium text-gray-700 mb-1">
                Guidance Scale: {guidanceScale}
              </label>
              <input
                id="guidanceScale"
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={guidanceScale}
                onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-target"
              />
              <p className="mt-1 text-xs text-gray-500">
                Higher values make the image follow your prompt more closely (7-8 is recommended)
              </p>
            </div>
            
            <div>
              <label htmlFor="numInferenceSteps" className="block text-sm font-medium text-gray-700 mb-1">
                Inference Steps: {numInferenceSteps}
              </label>
              <input
                id="numInferenceSteps"
                type="range"
                min="20"
                max="100"
                step="1"
                value={numInferenceSteps}
                onChange={(e) => setNumInferenceSteps(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer touch-target"
              />
              <p className="mt-1 text-xs text-gray-500">
                Higher values produce more detailed images but take longer (30-50 is recommended)
                {isBatteryLow && !isCharging && (
                  <span className="text-amber-600 ml-1">
                    Lower steps are recommended when battery is low
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                id="lowMemoryMode"
                type="checkbox"
                checked={useLowMemoryMode}
                onChange={(e) => setUseLowMemoryMode(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded touch-target"
              />
              <label htmlFor="lowMemoryMode" className="ml-2 block text-sm text-gray-700">
                Use low memory mode (faster but slightly lower quality)
              </label>
            </div>
            
            <div className="text-sm text-gray-600 p-3 border border-gray-200 rounded bg-white">
              <strong>Current Optimization Level:</strong> {optimizationLevel}
              <p className="text-xs mt-1">
                {optimizationLevel === 'high' && 'Maximum battery saving mode - image quality may be reduced.'}
                {optimizationLevel === 'medium' && 'Balanced mode - reasonable quality with good battery life.'}
                {optimizationLevel === 'low' && 'Quality-focused mode with some battery optimization.'}
                {optimizationLevel === 'none' && 'Maximum quality mode with no battery optimizations.'}
              </p>
            </div>
          </div>
        )}
        
        <div>
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full touch-target flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              'Generate Image'
            )}
          </button>
        </div>
      </form>
      
      <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
        <h3 className="text-sm font-medium text-blue-800">Tips for best results</h3>
        <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc pl-5">
          <li>Be specific and detailed in your prompt</li>
          <li>Include style (photorealistic, digital art, etc.)</li>
          <li>Mention camera details for photos (portrait lens, studio lighting)</li>
          <li>For artistic styles, reference specific artists or art movements</li>
          <li>Use negative prompts to avoid unwanted elements</li>
        </ul>
      </div>
    </div>
  );
}

export default PromptForm;