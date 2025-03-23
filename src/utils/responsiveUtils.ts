/**
 * Responsive utilities for image sizing and responsive layout
 */

// Array of common device breakpoints in pixels
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Type for responsive size configuration
interface ResponsiveSizeConfig {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
  default: number;
}

/**
 * Calculate the optimal image width based on viewport size
 * 
 * @param containerWidth Width of the parent container as percentage or fixed value
 * @param columns Configuration of columns at each breakpoint
 * @returns Optimal image width in pixels
 */
export const calculateResponsiveImageWidth = (
  containerWidth: number | string,
  columns: ResponsiveSizeConfig
): number => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  
  // Convert container width to pixels if it's a percentage
  const containerPixels = typeof containerWidth === 'string' && containerWidth.includes('%') 
    ? (width * parseInt(containerWidth, 10)) / 100
    : typeof containerWidth === 'number' 
      ? containerWidth
      : width;
  
  // Determine number of columns based on breakpoint
  let cols = columns.default;
  
  if (width >= breakpoints['2xl'] && columns['2xl']) {
    cols = columns['2xl'];
  } else if (width >= breakpoints.xl && columns.xl) {
    cols = columns.xl;
  } else if (width >= breakpoints.lg && columns.lg) {
    cols = columns.lg;
  } else if (width >= breakpoints.md && columns.md) {
    cols = columns.md;
  } else if (width >= breakpoints.sm && columns.sm) {
    cols = columns.sm;
  } else if (width >= breakpoints.xs && columns.xs) {
    cols = columns.xs;
  }
  
  // Calculate image width (with a small gap adjustment)
  const gapAdjustment = 16; // Approximate gap size in pixels
  const imageWidth = Math.floor((containerPixels / cols) - gapAdjustment);
  
  return imageWidth;
};

/**
 * Generate srcSet attribute value for responsive images
 * 
 * @param baseUrl Base URL of the image
 * @param widths Array of widths to generate srcSet for
 * @returns srcSet string
 */
export const generateResponsiveSrcSet = (
  baseUrl: string,
  widths: number[] = [320, 480, 640, 768, 1024, 1280, 1536]
): string => {
  if (!baseUrl) return '';
  
  return widths
    .map(width => {
      // For URLs with existing query parameters
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}width=${width} ${width}w`;
    })
    .join(', ');
};

/**
 * Generate sizes attribute value for responsive images
 * 
 * @param sizeConfig Configuration for image sizes at different breakpoints
 * @returns sizes string
 */
export const generateResponsiveSizes = (
  sizeConfig: { breakpoint: number; size: string }[] = []
): string => {
  // Default fallback size
  const defaultSize = '100vw';
  
  if (!sizeConfig.length) {
    return defaultSize;
  }
  
  // Sort by breakpoint in descending order
  const sortedConfig = [...sizeConfig].sort((a, b) => b.breakpoint - a.breakpoint);
  
  // Generate sizes string
  return sortedConfig
    .map(({ breakpoint, size }) => `(min-width: ${breakpoint}px) ${size}`)
    .concat([defaultSize])
    .join(', ');
};

/**
 * Calculate an aspect ratio style object
 * 
 * @param width Width in units
 * @param height Height in units
 * @returns Style object with paddingTop to maintain aspect ratio
 */
export const aspectRatioStyle = (
  width: number,
  height: number
): { paddingTop: string } => {
  const ratio = (height / width) * 100;
  return { paddingTop: `${ratio}%` };
};

/**
 * Example usage:
 * 
 * // Define columns configuration
 * const columns = {
 *   xs: 1,
 *   sm: 2,
 *   md: 3,
 *   lg: 4,
 *   xl: 5,
 *   '2xl': 6,
 *   default: 1
 * };
 * 
 * // Calculate image width
 * const imageWidth = calculateResponsiveImageWidth('100%', columns);
 * 
 * // Generate srcSet
 * const srcSet = generateResponsiveSrcSet('https://example.com/image.jpg');
 * 
 * // Generate sizes attribute
 * const sizes = generateResponsiveSizes([
 *   { breakpoint: 1280, size: '20vw' },
 *   { breakpoint: 1024, size: '25vw' },
 *   { breakpoint: 768, size: '33vw' },
 *   { breakpoint: 640, size: '50vw' }
 * ]);
 * 
 * // Create aspect ratio container (16:9)
 * const style = aspectRatioStyle(16, 9);
 */
