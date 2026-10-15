/**
 * Loading Spinner Component
 * Reusable loading component for lazy loaded routes and components
 */

import React from 'react';
import { Spin } from 'antd';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  className?: string;
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  tip,
  className = '',
  fullPage = false
}) => {
  const baseClasses = 'flex flex-col items-center justify-center';
  const heightClass = fullPage ? 'min-h-screen' : 'h-48';
  
  return (
    <div className={`${baseClasses} ${heightClass} ${className}`}>
      <Spin size={size}>
        <div className="content" />
      </Spin>
      {tip && (
        <p className="mt-2 text-gray-500 text-sm">{tip}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;