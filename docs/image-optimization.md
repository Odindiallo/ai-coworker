# Image Optimization Documentation

This document outlines the image optimization techniques implemented in the AI Actor Generator application to improve performance, reduce bandwidth usage, and provide a better user experience.

## Overview

Optimizing images is critical for a mobile-first application, especially one that deals with AI-generated content. Our optimization strategy encompasses:

1. **Format Optimization**: Using modern formats like WebP and AVIF where supported
2. **Size Optimization**: Serving properly sized images based on device and viewport
3. **Loading Optimization**: Using lazy loading and progressive loading techniques
4. **Caching Strategy**: Implementing effective caching for frequently accessed images
5. **Performance Monitoring**: Tracking image loading performance to identify issues

## Format Optimization

### WebP Implementation

We automatically detect browser support for WebP and serve this format when available:

```typescript
// From imageOptimizer.ts
export const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
};
```

### Format Selection Logic

The application selects the optimal image format in this priority order:
1. AVIF (best compression but limited support)
2. WebP (good compression, wide support)
3. JPEG/PNG (fallback formats)

```typescript
// From imageOptimizer.ts
export const getOptimalImageFormat = (): string => {
  if (supportsAVIF()) return '.avif';
  if (supportsWebP()) return '.webp';
  return '.jpg'; // Fallback to JPG
};
```

## Size Optimization

### Responsive Image Sizing

Images are automatically sized based on the viewport and device:

```typescript
// From responsiveUtils.ts
export const calculateResponsiveImageWidth = (
  containerWidth: number | string,
  columns: ResponsiveSizeConfig
): number => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  
  // Determine columns based on breakpoint
  let cols = columns.default;
  
  if (width >= breakpoints['2xl'] && columns['2xl']) {
    cols = columns['2xl'];
  } else if (width >= breakpoints.xl && columns.xl) {
    cols = columns.xl;
  } /* ... and so on */
  
  // Calculate width with gap adjustment
  const imageWidth = Math.floor((containerPixels / cols) - gapAdjustment);
  
  return imageWidth;
};
```

### Srcset and Sizes Implementation

We generate appropriate `srcset` and `sizes` attributes:

```typescript
// From imageOptimizer.ts
export const generateSrcSet = (
  url: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string => {
  return widths
    .map(width => `${optimizeStorageUrl(url, width)} ${width}w`)
    .join(', ');
};

export const calculateSizes = (
  mobileSizes: string = '100vw',
  tabletSizes: string = '50vw',
  desktopSizes: string = '33vw'
): string => {
  return `(max-width: 640px) ${mobileSizes}, (max-width: 1024px) ${tabletSizes}, ${desktopSizes}`;
};
```

## Loading Optimization

### Lazy Loading

We implement lazy loading with an IntersectionObserver for efficiency:

```typescript
// From LazyImage.tsx
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
```

### Progressive Loading

For a better user experience, we implement progressive loading with low-quality placeholders:

```typescript
// From ProgressiveImage.tsx
<>
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
  <img
    src={highQualitySrc}
    alt={alt}
    width={width}
    height={height}
    onLoad={handleHighQualityLoad}
    onError={handleError}
    className={cn(
      'w-full h-full transition-opacity duration-500',
      highQualityLoaded ? 'opacity-100' : 'opacity-0'
    )}
    style={objectFitStyle}
  />
</>
```

## Firebase Storage Optimization

### Compression Before Upload

Images are compressed before being uploaded to Firebase Storage:

```typescript
// From storageOptimizer.ts
export const optimizedImageUpload = async (
  file: File,
  path: string,
  fileName: string
): Promise<string> => {
  // Process image for optimal size/quality
  const processedFile = await imageProcessor.processImage(file);
  
  // Create optimized metadata
  const metadata: UploadMetadata = {
    contentType: processedFile.type,
    customMetadata: { /* ... */ },
    cacheControl: 'public, max-age=86400, stale-while-revalidate=604800'
  };
  
  // Upload the processed file
  // ...
};
```

### Metadata and Cache Control

We set appropriate metadata and cache control headers:

```typescript
cacheControl: 'public, max-age=86400, stale-while-revalidate=604800'
```

This implements a cache-first strategy with stale-while-revalidate for optimal performance:
- Images are cached for 1 day (86400 seconds)
- When the cache expires, the stale image is still shown while a new one is fetched
- The cache can continue serving stale content for up to 7 days (604800 seconds)

## CDN Integration

Firebase Storage automatically implements a CDN, but we enhance this with custom URL parameters:

```typescript
// From imageOptimizer.ts
export const configureCdnOptions = (url: string): string => {
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  
  try {
    // Example of rewriting a Firebase Storage URL to use CDN
    const urlObj = new URL(url);
    
    // Add CDN-specific parameters
    const params = new URLSearchParams(urlObj.search);
    params.set('cdn-cache', 'true');
    
    urlObj.search = params.toString();
    return urlObj.toString();
  } catch (e) {
    console.error('Error configuring CDN options:', e);
    return url;
  }
};
```

## Performance Monitoring

We implement comprehensive performance monitoring specifically for images:

```typescript
// From performanceMonitor.ts
public startImageLoad(imageId: string): void {
  this.imageLoadStartTimes.set(imageId, performance.now());
}

public endImageLoad(imageId: string): void {
  const startTime = this.imageLoadStartTimes.get(imageId);
  if (startTime) {
    const loadTime = performance.now() - startTime;
    this.metrics.imageLoadingTime += loadTime;
    this.imageLoadStartTimes.delete(imageId);
    this.notifyCallbacks();
  }
}
```

This data helps us identify problematic images and opportunities for further optimization.

## Network-Aware Loading

The application adapts its image loading strategy based on network conditions:

```typescript
// From OptimizedImage.tsx
const { isOnline, connectionType, isSlowConnection } = useNetworkStatus();

// Determine loading strategy based on priority and network conditions
const loadingStrategy = priority ? 'eager' : 
                       isSlowConnection ? 'lazy' : 
                       loading;

// Disable image loading when offline for non-priority images
const shouldLoadImage = isOnline || priority;
```

On slow connections, we prioritize essential images and load others only when necessary.

## Responsive Grid Implementation

Our image gallery implements a responsive grid that adapts to different device sizes:

```typescript
// From ImageGallery.tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
  {/* Images go here */}
</div>
```

This ensures that images are displayed appropriately across different screen sizes.

## Battery-Aware Optimizations

For mobile devices, we implement battery-aware optimizations:

1. Limiting concurrent image loads
2. Reducing unnecessary animations when battery is low
3. Prioritizing cached content on low battery

## Measuring Success

To measure the success of our image optimization efforts, we track the following metrics:

1. **Image Loading Time**: Average time to load images
2. **Bandwidth Usage**: Data transferred for images
3. **Largest Contentful Paint (LCP)**: A key Core Web Vital related to image loading
4. **First Contentful Paint (FCP)**: Initial rendering of important content
5. **Data Savings**: Amount of data saved through optimization

## Best Practices Summary

1. **Serve WebP/AVIF** where supported
2. **Implement responsive images** with srcset and sizes
3. **Use lazy loading** for off-screen images
4. **Implement progressive loading** with placeholders
5. **Set appropriate cache headers** for optimal caching
6. **Compress images before upload** to reduce storage and bandwidth
7. **Monitor performance** to identify issues
8. **Adapt to network conditions** for better mobile experience
9. **Implement proper error handling** for failed image loads
10. **Create responsive layouts** that work across device sizes
