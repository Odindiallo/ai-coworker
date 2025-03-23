import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface OptionGroup {
  label: string;
  options: Option[];
}

interface MobileSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  options: Option[] | OptionGroup[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
  disabled?: boolean;
  hint?: string;
}

/**
 * Mobile-optimized select component with improved touch interactions
 * and keyboard handling
 */
const MobileSelect: React.FC<MobileSelectProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  required = false,
  error,
  className = '',
  disabled = false,
  hint
}) => {
  const [touched, setTouched] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  
  // Helper function to check if options is OptionGroup[]
  const isOptionGroup = (opt: Option[] | OptionGroup[]): opt is OptionGroup[] => {
    return opt.length > 0 && 'options' in opt[0];
  };

  // Handle blur events
  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setTouched(true);
    if (onBlur) onBlur(e);
  };

  // Focus the select element when tapped on the label
  const handleLabelClick = () => {
    selectRef.current?.focus();
  };

  // Add vibration feedback when selecting an option (if supported)
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Vibrate if supported (10ms)
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onChange(e);
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={id}
        className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'} mb-1 cursor-pointer`}
        onClick={handleLabelClick}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <select
          ref={selectRef}
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          className={`appearance-none w-full px-4 py-2 text-base border rounded-md focus:outline-none focus:ring-2 transition-colors pr-10 ${
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
          } ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {isOptionGroup(options) ? (
            // Render option groups
            options.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option 
                    key={option.value} 
                    value={option.value} 
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))
          ) : (
            // Render flat options
            options.map((option) => (
              <option 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))
          )}
        </select>
        
        {/* Custom dropdown indicator */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
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

export default MobileSelect;
