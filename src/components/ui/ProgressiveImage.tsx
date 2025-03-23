import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ProgressiveImageProps {
  lowQualitySrc: string;
  highQualitySrc: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  imageClassName?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  priority?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onClick?: () => void;
}

/**
 * ProgressiveImage component that shows a low-quality image while the high-quality one loads
 * This creates a progressive loading effect similar to Medium/Facebook
 */
const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  lowQualitySrc,
  highQualitySrc,
  alt,
  width,
  height,
  className = '',
  imageClassName = '',
  onLoad,
  onError,
  priority = false,
  objectFit = 'cover',
  onClick
}) => {
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Preload high-quality image if priority is true
  useEffect(() => {
    if (priority && highQualitySrc) {
      const img = new Image();
      img.src = highQualitySrc;
    }
  }, [priority, highQualitySrc]);
  
  // Handle high-quality image load
  const handleHighQualityLoad = () => {
    setHighQualityLoaded(true);
    if (onLoad) onLoad();
  };
  
  // Handle low-quality image load
  const handleLowQualityLoad = () => {
    setLowQualityLoaded(true);
  };
  
  // Handle image error
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${highQualitySrc}`);
    if (onError) onError(error);
  };
  
  // Generate object-fit style
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
      {/* Low-quality image (blurry placeholder) */}
      {lowQualitySrc && !hasError && (
        <img
          src={lowQualitySrc}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          onLoad={handleLowQualityLoad}
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-300',
            highQualityLoaded ? 'opacity-0' : 'opacity-100',
            lowQualityLoaded ? 'blur-sm' : 'blur-none'
          )}
          style={objectFitStyle}
        />
      )}
      
      {/* High-quality image */}
      {!hasError && (
        <img
          src={highQualitySrc}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleHighQualityLoad}
          onError={handleError}
          onClick={onClick}
          className={cn(
            'w-full h-full transition-opacity duration-500',
            highQualityLoaded ? 'opacity-100' : 'opacity-0',
            onClick ? 'cursor-pointer' : '',
            imageClassName
          )}
          style={objectFitStyle}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
      
      {/* Error state */}
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
      
      {/* Loading state when nothing is loaded yet */}
      {!lowQualityLoaded && !highQualityLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;
