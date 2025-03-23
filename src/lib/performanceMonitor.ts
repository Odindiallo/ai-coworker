/**
 * Performance Monitor Utility
 * 
 * Monitors and reports on application performance metrics, with a focus on image loading
 * and rendering performance. Helps identify and resolve performance bottlenecks.
 */

import { logError } from './crashlytics';

// Interface for performance metrics
interface PerformanceMetrics {
  imageLoadingTime: number;
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  firstInputDelay: number | null;
  cumulativeLayoutShift: number | null;
  timingEntries: Record<string, number>;
  networkInfo: {
    effectiveConnectionType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  memoryInfo: {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
  };
}

// Class for monitoring performance
class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private imageLoadStartTimes: Map<string, number>;
  private callbacks: Array<(metrics: PerformanceMetrics) => void>;

  constructor() {
    // Initialize metrics object
    this.metrics = {
      imageLoadingTime: 0,
      firstContentfulPaint: null,
      largestContentfulPaint: null,
      firstInputDelay: null,
      cumulativeLayoutShift: null,
      timingEntries: {},
      networkInfo: {},
      memoryInfo: {}
    };

    this.imageLoadStartTimes = new Map();
    this.callbacks = [];

    // Initialize performance monitoring
    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    try {
      // Collect navigation timing metrics
      this.collectNavigationTiming();

      // Set up Web Vitals monitoring using PerformanceObserver
      this.setupPerformanceObservers();

      // Collect network information
      this.collectNetworkInfo();

      // Collect memory information
      this.collectMemoryInfo();

      // Set up periodic monitoring
      setInterval(() => this.collectMemoryInfo(), 30000);
    } catch (error) {
      console.error('Error initializing performance monitor:', error);
    }
  }

  /**
   * Collect navigation timing metrics
   */
  private collectNavigationTiming(): void {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      
      // Calculate page load metrics
      this.metrics.timingEntries = {
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        serverResponse: timing.responseStart - timing.requestStart,
        contentDownload: timing.responseEnd - timing.responseStart,
        domParsing: timing.domInteractive - timing.responseEnd,
        resourceLoading: timing.loadEventStart - timing.domContentLoadedEventEnd,
        totalPageLoad: timing.loadEventEnd - timing.navigationStart
      };
    }
  }

  /**
   * Set up performance observers for Web Vitals
   */
  private setupPerformanceObservers(): void {
    // Only run if PerformanceObserver is available
    if (!('PerformanceObserver' in window)) return;

    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const fcp = entries[0];
          this.metrics.firstContentfulPaint = fcp.startTime;
          this.notifyCallbacks();
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const lcp = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = lcp.startTime;
          this.notifyCallbacks();
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const fid = entries[0];
          this.metrics.firstInputDelay = fid.processingStart - fid.startTime;
          this.notifyCallbacks();
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((entryList) => {
        let cumulativeLayoutShift = 0;
        const entries = entryList.getEntries();
        
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        });
        
        this.metrics.cumulativeLayoutShift = cumulativeLayoutShift;
        this.notifyCallbacks();
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Resource timing for image loads
      const resourceObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries().filter(entry => 
          entry.initiatorType === 'img' || 
          entry.name.match(/\.(jpe?g|png|gif|webp|avif)/)
        );
        
        entries.forEach(entry => {
          const loadTime = entry.responseEnd - entry.startTime;
          this.metrics.imageLoadingTime += loadTime;
        });
        
        this.notifyCallbacks();
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
    } catch (error) {
      console.error('Error setting up performance observers:', error);
    }
  }

  /**
   * Collect network information
   */
  private collectNetworkInfo(): void {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      this.metrics.networkInfo = {
        effectiveConnectionType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
      
      // Listen for changes
      connection.addEventListener('change', () => {
        this.metrics.networkInfo = {
          effectiveConnectionType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        };
        this.notifyCallbacks();
      });
    }
  }

  /**
   * Collect memory information
   */
  private collectMemoryInfo(): void {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryInfo = {
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize
      };
      this.notifyCallbacks();
    }
  }

  /**
   * Start timing image load
   * 
   * @param imageId Unique identifier for the image
   */
  public startImageLoad(imageId: string): void {
    this.imageLoadStartTimes.set(imageId, performance.now());
  }

  /**
   * End timing image load
   * 
   * @param imageId Unique identifier for the image
   */
  public endImageLoad(imageId: string): void {
    const startTime = this.imageLoadStartTimes.get(imageId);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      this.metrics.imageLoadingTime += loadTime;
      this.imageLoadStartTimes.delete(imageId);
      this.notifyCallbacks();
    }
  }

  /**
   * Register a callback to be notified when metrics change
   * 
   * @param callback Function to call with updated metrics
   */
  public onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Return function to unregister callback
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance metrics callback:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   * 
   * @returns Current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Log performance issues if metrics fall below thresholds
   */
  public checkPerformanceIssues(): void {
    const metrics = this.getMetrics();
    
    // Define thresholds
    const thresholds = {
      lcp: 2500, // milliseconds
      fid: 100,  // milliseconds
      cls: 0.1,  // unitless
      imageLoadingTime: 1000 // milliseconds
    };
    
    // Check for issues
    const issues = [];
    
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > thresholds.lcp) {
      issues.push(`Slow LCP: ${metrics.largestContentfulPaint.toFixed(2)}ms (threshold: ${thresholds.lcp}ms)`);
    }
    
    if (metrics.firstInputDelay && metrics.firstInputDelay > thresholds.fid) {
      issues.push(`High FID: ${metrics.firstInputDelay.toFixed(2)}ms (threshold: ${thresholds.fid}ms)`);
    }
    
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > thresholds.cls) {
      issues.push(`High CLS: ${metrics.cumulativeLayoutShift.toFixed(2)} (threshold: ${thresholds.cls})`);
    }
    
    if (metrics.imageLoadingTime > thresholds.imageLoadingTime) {
      issues.push(`Slow image loading: ${metrics.imageLoadingTime.toFixed(2)}ms (threshold: ${thresholds.imageLoadingTime}ms)`);
    }
    
    // Log issues for monitoring
    if (issues.length > 0) {
      console.warn('Performance issues detected:', issues);
      
      // Log to Crashlytics for monitoring (not as an error)
      logError(
        new Error('Performance issues detected'), 
        { 
          type: 'performance_warning',
          issues,
          metrics: JSON.stringify(metrics)
        }
      );
    }
  }

  /**
   * Generate a performance report for debugging
   * 
   * @returns Performance report as a string
   */
  public generateReport(): string {
    const metrics = this.getMetrics();
    
    return `
Performance Report:
------------------
Web Vitals:
- First Contentful Paint: ${metrics.firstContentfulPaint ? `${metrics.firstContentfulPaint.toFixed(2)}ms` : 'Not measured'}
- Largest Contentful Paint: ${metrics.largestContentfulPaint ? `${metrics.largestContentfulPaint.toFixed(2)}ms` : 'Not measured'}
- First Input Delay: ${metrics.firstInputDelay ? `${metrics.firstInputDelay.toFixed(2)}ms` : 'Not measured'}
- Cumulative Layout Shift: ${metrics.cumulativeLayoutShift ? metrics.cumulativeLayoutShift.toFixed(3) : 'Not measured'}

Image Performance:
- Total Image Loading Time: ${metrics.imageLoadingTime.toFixed(2)}ms

Navigation Timing:
${Object.entries(metrics.timingEntries)
  .map(([key, value]) => `- ${key}: ${value.toFixed(2)}ms`)
  .join('\n')}

Network Information:
- Effective Connection Type: ${metrics.networkInfo.effectiveConnectionType || 'Unknown'}
- Downlink: ${metrics.networkInfo.downlink ? `${metrics.networkInfo.downlink.toFixed(2)} Mbps` : 'Unknown'}
- Round-Trip Time: ${metrics.networkInfo.rtt ? `${metrics.networkInfo.rtt.toFixed(2)}ms` : 'Unknown'}
- Data Saver: ${metrics.networkInfo.saveData ? 'Enabled' : 'Disabled'}

Memory Usage:
- Used JS Heap: ${metrics.memoryInfo.usedJSHeapSize ? `${(metrics.memoryInfo.usedJSHeapSize / 1048576).toFixed(2)} MB` : 'Unknown'}
- Total JS Heap: ${metrics.memoryInfo.totalJSHeapSize ? `${(metrics.memoryInfo.totalJSHeapSize / 1048576).toFixed(2)} MB` : 'Unknown'}
- JS Heap Limit: ${metrics.memoryInfo.jsHeapSizeLimit ? `${(metrics.memoryInfo.jsHeapSizeLimit / 1048576).toFixed(2)} MB` : 'Unknown'}

Generated on: ${new Date().toISOString()}
    `.trim();
  }
}

// Create a singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
