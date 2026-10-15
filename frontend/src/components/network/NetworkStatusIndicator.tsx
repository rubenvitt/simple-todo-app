/**
 * Network Status Indicator Component
 * 
 * Displays current network status with visual indicators and adaptive messaging
 */

import React, { useState } from 'react';
import { useNetworkMonitor } from '../../hooks/useNetworkMonitor';

interface NetworkStatusIndicatorProps {
  className?: string;
  variant?: 'minimal' | 'detailed' | 'badge';
  showSpeedTest?: boolean;
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  variant = 'minimal',
  showSpeedTest = false,
  showDetails = false,
  position = 'inline'
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const {
    networkInfo,
    quality,
    isOnline,
    statusDescription,
    adaptiveConfig,
    isTestingSpeed,
    lastSpeedTest,
    testNetworkSpeed,
    capabilities
  } = useNetworkMonitor({
    startMonitoring: true,
    enableSpeedTests: showSpeedTest
  });

  // Get quality-based styling
  const getQualityStyles = () => {
    if (!isOnline) {
      return {
        bg: 'bg-gray-500',
        text: 'text-white',
        border: 'border-gray-500',
        icon: '🔌'
      };
    }

    switch (quality) {
      case 'excellent':
        return {
          bg: 'bg-green-500',
          text: 'text-white',
          border: 'border-green-500',
          icon: '🚀'
        };
      case 'good':
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          border: 'border-blue-500',
          icon: '📶'
        };
      case 'moderate':
        return {
          bg: 'bg-yellow-500',
          text: 'text-white',
          border: 'border-yellow-500',
          icon: '⚡'
        };
      case 'poor':
        return {
          bg: 'bg-red-500',
          text: 'text-white',
          border: 'border-red-500',
          icon: '🐌'
        };
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-white',
          border: 'border-gray-500',
          icon: '❓'
        };
    }
  };

  const styles = getQualityStyles();

  // Position classes for floating indicators
  const getPositionClasses = () => {
    if (position === 'inline') return '';
    
    const baseClasses = 'fixed z-50';
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return '';
    }
  };

  // Format speed for display
  const formatSpeed = (speed: number) => {
    if (speed >= 1) {
      return `${speed.toFixed(1)} Mbps`;
    } else {
      return `${(speed * 1000).toFixed(0)} Kbps`;
    }
  };

  // Minimal variant - just a status dot
  if (variant === 'minimal') {
    return (
      <div className={`${getPositionClasses()} ${className}`}>
        <div
          className={`
            w-3 h-3 rounded-full ${styles.bg}
            ${isOnline ? 'animate-pulse' : ''}
          `}
          title={statusDescription}
        />
      </div>
    );
  }

  // Badge variant - compact status badge
  if (variant === 'badge') {
    return (
      <div className={`${getPositionClasses()} ${className}`}>
        <div
          className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${styles.bg} ${styles.text} cursor-pointer
          `}
          onClick={() => setExpanded(!expanded)}
          title="Click for details"
        >
          <span className="mr-1">{styles.icon}</span>
          {networkInfo.type}
          {networkInfo.saveData && <span className="ml-1">💾</span>}
        </div>
        
        {expanded && (
          <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border p-3 min-w-64 z-60">
            <div className="text-sm space-y-2">
              <div className="font-medium text-gray-900">{statusDescription}</div>
              
              <div className="text-gray-600">
                <div>Type: {networkInfo.effectiveType}</div>
                <div>Quality: {quality}</div>
                {networkInfo.downlink > 0 && (
                  <div>Speed: {formatSpeed(networkInfo.downlink)}</div>
                )}
                {networkInfo.rtt > 0 && (
                  <div>Latency: {networkInfo.rtt}ms</div>
                )}
              </div>

              {lastSpeedTest && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  Speed test: {formatSpeed(lastSpeedTest.downloadSpeed)} 
                  ({lastSpeedTest.latency}ms)
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detailed variant - full status panel
  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border p-4 min-w-80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Network Status
          </h3>
          <div className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${styles.bg} ${styles.text}
          `}>
            <span className="mr-1">{styles.icon}</span>
            {quality}
          </div>
        </div>

        <div className="space-y-3">
          {/* Connection Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Status:</span>
              <div className="font-medium">{statusDescription}</div>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <div className="font-medium">{networkInfo.effectiveType}</div>
            </div>
            
            {networkInfo.downlink > 0 && (
              <div>
                <span className="text-gray-500">Speed:</span>
                <div className="font-medium">{formatSpeed(networkInfo.downlink)}</div>
              </div>
            )}
            
            {networkInfo.rtt > 0 && (
              <div>
                <span className="text-gray-500">Latency:</span>
                <div className="font-medium">{networkInfo.rtt}ms</div>
              </div>
            )}
          </div>

          {/* Adaptive Configuration */}
          {showDetails && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Adaptive Settings
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Max Requests: {adaptiveConfig.maxConcurrentRequests}</div>
                <div>Timeout: {adaptiveConfig.requestTimeout / 1000}s</div>
                <div>Retry: {adaptiveConfig.retryAttempts}x</div>
                <div>Prefetch: {adaptiveConfig.prefetchEnabled ? 'On' : 'Off'}</div>
              </div>
            </div>
          )}

          {/* Speed Test */}
          {showSpeedTest && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  Speed Test
                </h4>
                <button
                  onClick={testNetworkSpeed}
                  disabled={isTestingSpeed || !isOnline}
                  className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingSpeed ? 'Testing...' : 'Test'}
                </button>
              </div>
              
              {lastSpeedTest ? (
                <div className="text-sm text-gray-600">
                  <div>Download: {formatSpeed(lastSpeedTest.downloadSpeed)}</div>
                  <div>Latency: {lastSpeedTest.latency}ms</div>
                  <div className="text-xs text-gray-400">
                    {new Date(lastSpeedTest.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  No speed test data
                </div>
              )}
            </div>
          )}

          {/* Data Saver Notice */}
          {networkInfo.saveData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="flex items-center text-yellow-800 text-sm">
                <span className="mr-2">💾</span>
                Data Saver mode is active
              </div>
            </div>
          )}

          {/* Capabilities Info */}
          {showDetails && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Browser Support
              </h4>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <div>Network API: {capabilities.hasNetworkAPI ? '✅' : '❌'}</div>
                <div>Connection API: {capabilities.hasConnectionAPI ? '✅' : '❌'}</div>
                <div>Performance API: {capabilities.hasPerformanceAPI ? '✅' : '❌'}</div>
                <div>Online Events: {capabilities.hasNavigatorOnline ? '✅' : '❌'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;