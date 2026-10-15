import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorType?: 'network' | 'memory' | 'touch' | 'orientation' | 'unknown';
  isOnline: boolean;
  retryCount: number;
  deviceInfo: {
    viewport: { width: number; height: number };
    orientation: string;
    connection?: string;
    memory?: number;
  };
}

export class MobileErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      isOnline: navigator.onLine,
      retryCount: 0,
      deviceInfo: this.getDeviceInfo()
    };
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange);
    
    // Listen for memory pressure (if available)
    if ('memory' in performance) {
      this.checkMemoryPressure();
    }
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorType = this.categorizeError(error);
    
    this.setState({
      errorInfo,
      errorType,
      deviceInfo: this.getDeviceInfo()
    });
    
    // Log error with context
    console.error('[MobileErrorBoundary] Error caught:', {
      error: error.message,
      errorType,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      deviceInfo: this.state.deviceInfo,
      isOnline: this.state.isOnline,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    
    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo, errorType);
  }

  private categorizeError(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
      return 'network';
    }
    
    if (message.includes('memory') || message.includes('heap') || message.includes('oom')) {
      return 'memory';
    }
    
    if (message.includes('touch') || message.includes('gesture')) {
      return 'touch';
    }
    
    if (message.includes('orientation') || message.includes('resize')) {
      return 'orientation';
    }
    
    return 'unknown';
  }

  private getDeviceInfo() {
    const nav = navigator as any;
    
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      orientation: window.screen.orientation?.type || 'unknown',
      connection: nav.connection?.effectiveType,
      memory: nav.deviceMemory
    };
  }

  private checkMemoryPressure = () => {
    const memory = (performance as any).memory;
    if (!memory) return;
    
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    if (usagePercent > 90) {
      console.warn('[MobileErrorBoundary] High memory usage detected:', usagePercent.toFixed(1) + '%');
      
      // Trigger garbage collection hint (if available)
      if ('gc' in window) {
        (window as any).gc();
      }
    }
  };

  private reportError(error: Error, errorInfo: ErrorInfo, errorType: State['errorType']) {
    // Here you would send the error to your monitoring service
    // For now, we'll just dispatch a custom event
    const errorEvent = new CustomEvent('mobile-error', {
      detail: {
        error: {
          message: error.message,
          stack: error.stack,
          type: errorType
        },
        errorInfo,
        deviceInfo: this.state.deviceInfo,
        isOnline: this.state.isOnline,
        retryCount: this.state.retryCount
      }
    });
    
    window.dispatchEvent(errorEvent);
  }

  private handleOnline = () => {
    this.setState({ isOnline: true });
    
    // Auto-retry if error was network-related
    if (this.state.hasError && this.state.errorType === 'network') {
      this.handleRetry();
    }
  };

  private handleOffline = () => {
    this.setState({ isOnline: false });
  };

  private handleOrientationChange = () => {
    this.setState({ deviceInfo: this.getDeviceInfo() });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      console.warn('[MobileErrorBoundary] Max retry attempts reached');
      return;
    }
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    
    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1
      });
    }, delay);
    
    this.retryTimeouts.push(timeout);
  };

  private renderErrorUI() {
    const { error, errorType, isOnline, retryCount, deviceInfo } = this.state;
    const { fallback } = this.props;
    
    if (fallback) {
      return fallback;
    }
    
    const isMobile = deviceInfo.viewport.width < 768;
    
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isMobile ? 'px-6' : 'px-8'
      }`}>
        <div className={`max-w-md w-full bg-white rounded-lg shadow-lg p-6 ${
          isMobile ? 'space-y-4' : 'space-y-6'
        }`}>
          {/* Error Icon */}
          <div className="flex justify-center">
            {!isOnline ? (
              <WifiOff className="h-16 w-16 text-gray-400" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          
          {/* Error Title */}
          <h1 className={`text-center font-semibold text-gray-900 ${
            isMobile ? 'text-xl' : 'text-2xl'
          }`}>
            {!isOnline ? 'You are offline' : 'Something went wrong'}
          </h1>
          
          {/* Error Description */}
          <p className="text-center text-gray-600 text-sm">
            {this.getErrorDescription(errorType, isOnline)}
          </p>
          
          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {error.message}
                {error.stack && '\n\n' + error.stack}
              </pre>
            </details>
          )}
          
          {/* Actions */}
          <div className={`flex flex-col space-y-3 ${isMobile ? 'mt-6' : 'mt-8'}`}>
            {/* Retry Button */}
            {errorType === 'network' || !isOnline ? (
              <button
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                  retryCount >= 3
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                } ${isMobile ? 'text-base' : 'text-sm'}`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>
                  {retryCount >= 3 ? 'Max retries reached' : 'Try again'}
                  {retryCount > 0 && retryCount < 3 && ` (${3 - retryCount} left)`}
                </span>
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className={`flex items-center justify-center space-x-2 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors ${
                  isMobile ? 'text-base' : 'text-sm'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload page</span>
              </button>
            )}
            
            {/* Home Button */}
            <Link
              to="/"
              className={`flex items-center justify-center space-x-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors ${
                isMobile ? 'text-base' : 'text-sm'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Go to homepage</span>
            </Link>
          </div>
          
          {/* Additional Info */}
          {errorType === 'memory' && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              Tip: Try closing other apps or browser tabs to free up memory
            </p>
          )}
        </div>
      </div>
    );
  }

  private getErrorDescription(errorType?: State['errorType'], isOnline?: boolean): string {
    if (!isOnline) {
      return 'Please check your internet connection and try again.';
    }
    
    switch (errorType) {
      case 'network':
        return 'We couldn\'t connect to our servers. Please check your connection and try again.';
      case 'memory':
        return 'Your device is running low on memory. Try closing other apps or tabs.';
      case 'touch':
        return 'There was an issue with touch interaction. Please try again.';
      case 'orientation':
        return 'There was an issue with screen orientation. Try rotating your device.';
      default:
        return 'An unexpected error occurred. Please try refreshing the page.';
    }
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}