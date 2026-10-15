/**
 * ShareButton Component
 * 
 * Provides a button with share functionality and visual feedback
 */

import React, { useState } from 'react';
import { useShare } from '../../hooks/useShare';
import { ShareData } from '../../services/share.service';

interface ShareButtonProps {
  data: ShareData;
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showStatus?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const ShareButton: React.FC<ShareButtonProps> = ({
  data,
  className = '',
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  showStatus = true,
  onSuccess,
  onError
}) => {
  const { share, isSharing, lastResult, capabilities } = useShare({
    onSuccess: (result) => {
      onSuccess?.();
      if (showStatus) {
        console.log('✅ Shared successfully:', result.method);
      }
    },
    onError: (error) => {
      onError?.(error);
      if (showStatus) {
        console.error('❌ Share failed:', error);
      }
    }
  });

  // Check if sharing is available
  const canShare = capabilities.hasNativeShare || capabilities.hasClipboard;

  const handleShare = async () => {
    if (!canShare || disabled || isSharing) return;
    await share(data);
  };

  // Style variants
  const getVariantClasses = () => {
    const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`;
      case 'icon':
        return `${base} text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-500`;
      default: // secondary
        return `${base} bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 focus:ring-gray-500`;
    }
  };

  const getSizeClasses = () => {
    if (variant === 'icon') {
      switch (size) {
        case 'sm': return 'p-1';
        case 'lg': return 'p-3';
        default: return 'p-2';
      }
    }
    
    switch (size) {
      case 'sm': return 'px-3 py-1.5 text-sm';
      case 'lg': return 'px-6 py-3 text-lg';
      default: return 'px-4 py-2 text-base';
    }
  };

  // Share icon SVG
  const ShareIcon = () => (
    <svg 
      className={variant === 'icon' ? 'w-5 h-5' : 'w-4 h-4'} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" 
      />
    </svg>
  );

  // Loading spinner
  const LoadingSpinner = () => (
    <svg 
      className={variant === 'icon' ? 'w-5 h-5' : 'w-4 h-4'} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Success checkmark
  const SuccessIcon = () => (
    <svg 
      className={variant === 'icon' ? 'w-5 h-5' : 'w-4 h-4'} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 13l4 4L19 7" 
      />
    </svg>
  );

  // Error icon
  const ErrorIcon = () => (
    <svg 
      className={variant === 'icon' ? 'w-5 h-5' : 'w-4 h-4'} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M6 18L18 6M6 6l12 12" 
      />
    </svg>
  );

  // Get icon based on current state
  const getIcon = () => {
    if (isSharing) return <LoadingSpinner />;
    if (lastResult?.success) return <SuccessIcon />;
    if (lastResult && !lastResult.success) return <ErrorIcon />;
    return <ShareIcon />;
  };

  // Get button text
  const getButtonText = () => {
    if (variant === 'icon') return null;
    
    if (isSharing) return 'Sharing...';
    if (lastResult?.success) return 'Shared!';
    if (lastResult && !lastResult.success) return 'Failed';
    return children || 'Share';
  };

  // Don't render if sharing is not available
  if (!canShare) {
    return null;
  }

  return (
    <button
      onClick={handleShare}
      disabled={disabled || isSharing}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${className}
        ${(disabled || isSharing) ? 'opacity-50 cursor-not-allowed' : ''}
        ${lastResult?.success ? 'text-green-600' : ''}
        ${lastResult && !lastResult.success ? 'text-red-600' : ''}
      `}
      title={
        isSharing ? 'Sharing...' :
        lastResult?.success ? `Shared via ${lastResult.method}` :
        lastResult && !lastResult.success ? lastResult.error :
        capabilities.hasNativeShare ? 'Share using your device\'s sharing options' :
        'Copy to clipboard'
      }
      aria-label={
        isSharing ? 'Sharing content' :
        lastResult?.success ? 'Content shared successfully' :
        lastResult && !lastResult.success ? 'Sharing failed' :
        'Share content'
      }
    >
      <span className={`${isSharing ? 'animate-spin' : ''} ${getButtonText() ? 'mr-2' : ''}`}>
        {getIcon()}
      </span>
      {getButtonText()}
    </button>
  );
};

export default ShareButton;