import React, { useState, useRef, useEffect } from 'react';

interface MobileTextAreaProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  hint?: string;
  autoGrow?: boolean;
}

/**
 * Mobile-optimized textarea component with auto-growing capability
 * and keyboard awareness
 */
const MobileTextArea: React.FC<MobileTextAreaProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  className = '',
  disabled = false,
  maxLength,
  rows = 3,
  hint,
  autoGrow = false
}) => {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState<number | undefined>(undefined);

  // Auto-grow functionality
  useEffect(() => {
    if (autoGrow && textareaRef.current) {
      // Reset height to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Get the new scrollHeight and set it
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
      setTextareaHeight(scrollHeight);
    }
  }, [value, autoGrow]);

  // Scroll into view when focused on mobile
  useEffect(() => {
    if (focused && textareaRef.current) {
      // Delay slightly to allow keyboard to appear
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [focused]);

  // Handle focus events
  const handleFocus = () => {
    setFocused(true);
    
    // Add class to body to adjust layout for keyboard
    document.body.classList.add('keyboard-open');
  };

  // Handle blur events
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setFocused(false);
    setTouched(true);
    
    // Remove keyboard class
    document.body.classList.remove('keyboard-open');
    
    if (onBlur) onBlur(e);
  };
  
  // Character count and limit display
  const characterCount = value.length;
  const showCharacterCount = maxLength !== undefined;

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <label 
          htmlFor={id}
          className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {/* Character counter */}
        {showCharacterCount && (
          <span 
            className={`text-xs ${
              characterCount > (maxLength! * 0.9) 
                ? characterCount >= maxLength! 
                  ? 'text-red-500' 
                  : 'text-amber-500' 
                : 'text-gray-500'
            }`}
          >
            {characterCount}/{maxLength}
          </span>
        )}
      </div>
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          rows={rows}
          style={{ height: autoGrow ? textareaHeight : undefined }}
          className={`w-full px-4 py-2 text-base border rounded-md focus:outline-none focus:ring-2 transition-colors ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''} 
          ${autoGrow ? 'overflow-hidden resize-none' : 'resize-y'}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-600" id={`${id}-error`}>
          {error}
        </p>
      )}
      
      {/* Hint text */}
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default MobileTextArea;
