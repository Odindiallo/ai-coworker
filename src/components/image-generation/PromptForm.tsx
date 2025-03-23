import React, { useState } from 'react';
import MobileTextArea from '../ui/MobileTextArea';
import HapticButton from '../ui/HapticButton';
import { triggerHapticFeedback } from '../../lib/hapticFeedback';

interface PromptFormProps {
  onSubmit: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  suggestedPrompts?: string[];
}

/**
 * A mobile-optimized form for entering text prompts to generate images
 */
const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  isGenerating,
  suggestedPrompts = []
}) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate prompt
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image');
      triggerHapticFeedback('ERROR');
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    try {
      // Provide haptic feedback for submission
      triggerHapticFeedback('BUTTON_PRESS');
      
      // Submit the prompt
      await onSubmit(prompt);
      
      // Clear the prompt after successful submission
      // Wait a bit so the user can see what they submitted
      setTimeout(() => {
        setPrompt('');
      }, 1000);
      
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again.');
      triggerHapticFeedback('ERROR');
    }
  };
  
  // Handle prompt change
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    
    // Clear error if user starts typing
    if (error) {
      setError(null);
    }
  };
  
  // Use a suggested prompt
  const handleUseSuggestedPrompt = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
    triggerHapticFeedback('SELECTION');
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit}>
        <MobileTextArea
          id="image-prompt"
          name="prompt"
          label="What would you like to generate?"
          value={prompt}
          onChange={handlePromptChange}
          placeholder="Describe the image you want to create..."
          required
          error={error || undefined}
          rows={3}
          autoGrow
          maxLength={500}
          hint="Be specific about settings, clothing, expressions, and background for best results."
        />
        
        {/* Character counter */}
        <div className="flex justify-end mb-3">
          <span className={`text-xs ${prompt.length > 400 ? 'text-amber-500' : 'text-gray-500'}`}>
            {prompt.length}/500
          </span>
        </div>
        
        {/* Suggested prompts */}
        {suggestedPrompts.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">Try one of these prompts:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((suggestedPrompt, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleUseSuggestedPrompt(suggestedPrompt)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm rounded-full text-gray-800 transition-colors touch-target min-h-[44px]"
                >
                  {suggestedPrompt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Submit button */}
        <div className="flex justify-center">
          <HapticButton
            type="submit"
            disabled={isGenerating}
            loading={isGenerating}
            variant="primary"
            fullWidth
            feedbackType="SUCCESS"
            size="lg"
            className="touch-target"
          >
            {isGenerating ? 'Generating...' : 'Generate Image'}
          </HapticButton>
        </div>
      </form>
    </div>
  );
};

export default PromptForm;
