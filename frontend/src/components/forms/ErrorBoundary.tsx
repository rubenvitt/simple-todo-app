import { Component } from 'react';
import type { ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for catching and handling form-related errors
 * Provides a fallback UI when forms encounter unexpected errors
 */
export class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Form Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Result
          status="error"
          title="Form Error"
          subTitle="Sorry, something went wrong with the form. Please try again."
          extra={[
            <Button type="primary" onClick={this.handleRetry} key="retry">
              Try Again
            </Button>,
            <Button key="home" onClick={() => window.location.reload()}>
              Reload Page
            </Button>,
          ]}
        />
      );
    }

    return this.props.children;
  }
}