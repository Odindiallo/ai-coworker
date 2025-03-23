import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderSrc?: string;
  threshold?: number;
  rootMargin?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onClick?: () => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * LazyImage component that only loads images when they enter the viewport
 * Uses IntersectionObserver API for efficient lazy loading
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholderSrc,
  threshold = 0.1,
  rootMargin = '200px 0px',
  objectFit = 'cover',
  onClick,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Set up intersection observer to detect when image enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);
  
  // Handle image load event
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };
  
  // Handle image error event
  const handleError = () => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    if (onError) onError(error);
  };
  
  // Determine object-fit style
  const objectFitStyle = objectFit ? { objectFit } : {};
  
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Placeholder while loading */}
      {placeholderSrc && !isLoaded && !hasError && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full blur-sm transition-opacity duration-500"
          style={{ 
            ...objectFitStyle,
            opacity: isLoaded ? 0 : 0.6 
          }}
        />
      )}
      
      {/* Actual image - only loads src when in viewport */}
      <img
        ref={imgRef}
        src={isInView ? src : ''}
        data-src={src}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          onClick ? 'cursor-pointer' : '',
          hasError ? 'hidden' : ''
        )}
        style={objectFitStyle}
      />
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center p-4">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
            <p className="text-sm">Image failed to load</p>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {!isLoaded && !hasError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
