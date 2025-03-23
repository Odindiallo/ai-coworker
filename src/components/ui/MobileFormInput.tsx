import React, { useState, useRef, useEffect } from 'react';

interface MobileFormInputProps {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  className?: string;
  inputMode?: 'text' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  disabled?: boolean;
  maxLength?: number;
  pattern?: string;
  hint?: string;
}

/**
 * Mobile-optimized form input component that handles various input types
 * with appropriate keyboard layouts and validation feedback
 */
const MobileFormInput: React.FC<MobileFormInputProps> = ({
  id,
  name,
  label,
  type,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  autoComplete,
  className = '',
  inputMode,
  disabled = false,
  maxLength,
  pattern,
  hint
}) => {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine the appropriate inputMode if not explicitly set
  const determineInputMode = (): React.InputHTMLAttributes<HTMLInputElement>['inputMode'] => {
    if (inputMode) return inputMode;
    
    switch (type) {
      case 'tel':
        return 'tel';
      case 'number':
        return 'decimal';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'search':
        return 'search';
      default:
        return 'text';
    }
  };

  // Scroll into view when focused on mobile
  useEffect(() => {
    if (focused && inputRef.current) {
      // Delay slightly to allow keyboard to appear
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    setTouched(true);
    
    // Remove keyboard class
    document.body.classList.remove('keyboard-open');
    
    if (onBlur) onBlur(e);
  };

  // Determine additional input attributes based on type
  const getTypeSpecificProps = () => {
    const props: Record<string, any> = {
      inputMode: determineInputMode()
    };
    
    // Add type-specific attributes
    switch (type) {
      case 'email':
        props.autoCapitalize = 'off';
        props.autoCorrect = 'off';
        break;
      case 'password':
        props.autoCapitalize = 'off';
        props.autoCorrect = 'off';
        props.spellCheck = false;
        break;
      case 'tel':
        props.autoCapitalize = 'off';
        break;
      case 'url':
        props.autoCapitalize = 'off';
        props.autoCorrect = 'off';
        break;
    }
    
    return props;
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={id}
        className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'} mb-1`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          pattern={pattern}
          autoComplete={autoComplete}
          className={`w-full px-4 py-2 text-base border rounded-md focus:outline-none focus:ring-2 transition-colors ${
            error
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...getTypeSpecificProps()}
        />
        
        {/* Clear button for search inputs */}
        {type === 'search' && value && (
          <button
            type="button"
            onClick={() => {
              const event = {
                target: { value: '', name },
              } as React.ChangeEvent<HTMLInputElement>;
              onChange(event);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
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

export default MobileFormInput;
