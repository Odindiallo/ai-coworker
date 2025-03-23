import { 
  compressImage, 
  getImageDimensions, 
  calculateAspectRatio,
  formatFileSize,
  isImageSupported,
  generateLowQualityPreview
} from '../imageUtils';

describe('Image Utility Functions', () => {
  // Setup for tests
  beforeEach(() => {
    // Reset mocks and spies
    jest.clearAllMocks();
  });
  
  describe('calculateAspectRatio', () => {
    test('calculates aspect ratio correctly', () => {
      expect(calculateAspectRatio(1200, 800)).toBe(1.5);
      expect(calculateAspectRatio(800, 1200)).toBe(0.67);
      expect(calculateAspectRatio(1000, 1000)).toBe(1);
    });
    
    test('handles zero values', () => {
      expect(calculateAspectRatio(0, 800)).toBe(0);
      expect(calculateAspectRatio(1200, 0)).toBe(Infinity);
    });
  });
  
  describe('formatFileSize', () => {
    test('formats file size in bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });
    
    test('formats file size in kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(10240)).toBe('10.0 KB');
      expect(formatFileSize(102400)).toBe('100.0 KB');
    });
    
    test('formats file size in megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });
    
    test('handles zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });
  
  describe('isImageSupported', () => {
    test('returns true for supported image types', () => {
      expect(isImageSupported('image/jpeg')).toBe(true);
      expect(isImageSupported('image/png')).toBe(true);
      expect(isImageSupported('image/webp')).toBe(true);
    });
    
    test('returns false for unsupported image types', () => {
      expect(isImageSupported('image/gif')).toBe(false);
      expect(isImageSupported('image/bmp')).toBe(false);
      expect(isImageSupported('application/pdf')).toBe(false);
      expect(isImageSupported('')).toBe(false);
    });
  });
  
  describe('compressImage', () => {
    test('returns compressed image', async () => {
      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Spy on console.log
      const consoleSpy = jest.spyOn(console, 'log');
      
      const result = await compressImage(file, 800, 0.7);
      
      // Verify console message
      expect(consoleSpy).toHaveBeenCalledWith(
        'Compressing image to 800px max dimension and 0.7MB max size'
      );
      
      // Should return the file (in our mock implementation)
      expect(result).toBe(file);
    });
    
    test('handles compression errors', async () => {
      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error');
      
      // Create a function that will throw an error
      const originalImplementation = compressImage;
      jest.spyOn(global.console, 'log').mockImplementationOnce(() => {
        throw new Error('Compression failed');
      });
      
      // Call the function which should catch the error
      const result = await compressImage(file, 800, 0.7);
      
      // Verify the result is the original file
      expect(result).toBe(file);
      
      // Clean up
      jest.restoreAllMocks();
    });
  });
  
  describe('getImageDimensions', () => {
    test('returns image dimensions', async () => {
      // Mock Image
      const originalImage = window.Image;
      
      // Create a mock implementation
      window.Image = jest.fn().mockImplementation(() => {
        return {
          naturalWidth: 1200,
          naturalHeight: 800,
          addEventListener: jest.fn((event, callback) => {
            if (event === 'load') {
              setTimeout(() => callback(), 0);
            }
          }),
          src: '',
        };
      }) as any;
      
      // Mock URL.createObjectURL and URL.revokeObjectURL
      URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
      URL.revokeObjectURL = jest.fn();
      
      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const dimensions = await getImageDimensions(file);
      
      // Verify dimensions
      expect(dimensions).toEqual({ width: 1200, height: 800 });
      
      // Verify object URL creation and revocation
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
      
      // Restore original Image constructor
      window.Image = originalImage;
    });
    
    test('handles image loading errors', async () => {
      // Mock Image
      const originalImage = window.Image;
      
      // Create a mock implementation that fails to load
      window.Image = jest.fn().mockImplementation(() => {
        return {
          addEventListener: jest.fn((event, callback) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('Failed to load image')), 0);
            }
          }),
          src: '',
        };
      }) as any;
      
      // Mock URL functions
      URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
      URL.revokeObjectURL = jest.fn();
      
      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      // Should reject with error
      await expect(getImageDimensions(file)).rejects.toThrow('Failed to load image');
      
      // Should still revoke object URL on error
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
      
      // Restore original Image constructor
      window.Image = originalImage;
    });
  });
});
