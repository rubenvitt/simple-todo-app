/**
 * Error Boundary Component
 * Handles errors during chunk loading and provides fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log chunk loading errors
    if (error.message.includes('Loading chunk') || error.message.includes('Loading CSS chunk')) {
      console.error('Chunk loading failed:', error);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Check if it's a chunk loading error
      const isChunkError = this.state.error?.message.includes('Loading chunk') || 
                          this.state.error?.message.includes('Loading CSS chunk');

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Result
            status={isChunkError ? 'warning' : 'error'}
            title={isChunkError ? 'Loading Failed' : 'Something went wrong'}
            subTitle={
              isChunkError 
                ? 'Failed to load application resources. This might be due to a network issue or an application update.'
                : 'An unexpected error occurred. Please try again.'
            }
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                {isChunkError ? 'Reload App' : 'Reload Page'}
              </Button>,
              !isChunkError && (
                <Button key="retry" onClick={this.handleRetry}>
                  Try Again
                </Button>
              ),
            ].filter(Boolean)}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of Error Boundary for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

export default ErrorBoundary;