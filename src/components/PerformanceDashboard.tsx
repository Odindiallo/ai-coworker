import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Performance monitoring dashboard for development and debugging
 * Displays real-time metrics about application performance
 */
const PerformanceDashboard: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { metrics, generateReport, checkPerformanceIssues } = usePerformanceMonitoring();
  const { isOnline, connectionType, effectiveConnectionType, isSlowConnection } = useNetworkStatus();
  const [report, setReport] = useState('');
  
  // Generate report when button is clicked
  useEffect(() => {
    if (showReport) {
      setReport(generateReport());
    }
  }, [showReport, generateReport]);
  
  // Format a time value with appropriate units
  const formatTime = (time: number | null) => {
    if (time === null) return 'Not measured';
    return `${time.toFixed(2)}ms`;
  };
  
  // Calculate performance scores
  const calculateLCPScore = () => {
    if (!metrics.largestContentfulPaint) return 'N/A';
    
    const lcp = metrics.largestContentfulPaint;
    if (lcp < 2500) return 'Good';
    if (lcp < 4000) return 'Needs Improvement';
    return 'Poor';
  };
  
  const calculateFIDScore = () => {
    if (!metrics.firstInputDelay) return 'N/A';
    
    const fid = metrics.firstInputDelay;
    if (fid < 100) return 'Good';
    if (fid < 300) return 'Needs Improvement';
    return 'Poor';
  };
  
  const calculateCLSScore = () => {
    if (!metrics.cumulativeLayoutShift) return 'N/A';
    
    const cls = metrics.cumulativeLayoutShift;
    if (cls < 0.1) return 'Good';
    if (cls < 0.25) return 'Needs Improvement';
    return 'Poor';
  };
  
  // Get score class for coloring
  const getScoreClass = (score: string) => {
    if (score === 'Good') return 'text-green-600';
    if (score === 'Needs Improvement') return 'text-yellow-600';
    if (score === 'Poor') return 'text-red-600';
    return 'text-gray-600';
  };
  
  if (!expanded) {
    // Minimized view
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setExpanded(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-full shadow-lg flex items-center"
        >
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>Performance</span>
        </button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
        <h3 className="font-medium text-sm">Performance Dashboard</h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => checkPerformanceIssues()}
            className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
          >
            Check
          </button>
          <button 
            onClick={() => setExpanded(false)}
            className="text-xs bg-gray-700 hover:bg-gray-600 rounded px-2 py-1"
          >
            Minimize
          </button>
        </div>
      </div>
      
      {/* Core Web Vitals */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-xs uppercase text-gray-500 mb-2">Core Web Vitals</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs">LCP:</span>
            <div className="flex items-center">
              <span className="text-xs mr-2">{formatTime(metrics.largestContentfulPaint)}</span>
              <span className={`text-xs ${getScoreClass(calculateLCPScore())}`}>{calculateLCPScore()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">FID:</span>
            <div className="flex items-center">
              <span className="text-xs mr-2">{formatTime(metrics.firstInputDelay)}</span>
              <span className={`text-xs ${getScoreClass(calculateFIDScore())}`}>{calculateFIDScore()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">CLS:</span>
            <div className="flex items-center">
              <span className="text-xs mr-2">{metrics.cumulativeLayoutShift ? metrics.cumulativeLayoutShift.toFixed(3) : 'Not measured'}</span>
              <span className={`text-xs ${getScoreClass(calculateCLSScore())}`}>{calculateCLSScore()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Network Information */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-xs uppercase text-gray-500 mb-2">Network</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs">Status:</span>
            <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs">Connection:</span>
            <span className="text-xs">
              {connectionType || 'Unknown'}
              {isSlowConnection && ' (Slow)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs">Speed:</span>
            <span className="text-xs">
              {metrics.networkInfo.downlink ? `${metrics.networkInfo.downlink.toFixed(1)} Mbps` : 'Unknown'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Image Performance */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-xs uppercase text-gray-500 mb-2">Image Performance</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs">Total Load Time:</span>
            <span className="text-xs">{metrics.imageLoadingTime.toFixed(2)}ms</span>
          </div>
        </div>
      </div>
      
      {/* Memory Usage */}
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium text-xs uppercase text-gray-500 mb-2">Memory Usage</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs">Used:</span>
            <span className="text-xs">
              {metrics.memoryInfo.usedJSHeapSize 
                ? `${(metrics.memoryInfo.usedJSHeapSize / 1048576).toFixed(1)} MB` 
                : 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs">Total:</span>
            <span className="text-xs">
              {metrics.memoryInfo.totalJSHeapSize 
                ? `${(metrics.memoryInfo.totalJSHeapSize / 1048576).toFixed(1)} MB` 
                : 'Unknown'}
            </span>
          </div>
          {metrics.memoryInfo.usedJSHeapSize && metrics.memoryInfo.totalJSHeapSize && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ 
                  width: `${Math.min(100, (metrics.memoryInfo.usedJSHeapSize / metrics.memoryInfo.totalJSHeapSize) * 100)}%` 
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-4">
        <button
          onClick={() => setShowReport(!showReport)}
          className="w-full text-xs bg-gray-200 hover:bg-gray-300 py-2 rounded text-center"
        >
          {showReport ? 'Hide' : 'Show'} Detailed Report
        </button>
        
        {showReport && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <pre className="text-xs whitespace-pre-wrap">{report}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
