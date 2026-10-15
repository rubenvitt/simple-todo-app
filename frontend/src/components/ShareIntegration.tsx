/**
 * Share Integration Examples
 * 
 * Simple integration examples for adding share functionality
 * to existing components throughout the app.
 */

import React from 'react';
import { ShareButton, useTaskShare, useListShare } from './sharing';

// Example: Add share button to any page header
export const PageShareButton: React.FC<{
  title: string;
  description?: string;
  url?: string;
  className?: string;
}> = ({ title, description, url, className = '' }) => {
  const shareData = {
    title,
    text: description || title,
    url: url || window.location.href
  };

  return (
    <ShareButton
      data={shareData}
      variant="secondary"
      className={className}
    >
      Share Page
    </ShareButton>
  );
};

// Example: Inline share for tasks in tables/lists
export const InlineTaskShare: React.FC<{
  task: any;
  variant?: 'primary' | 'secondary' | 'icon';
}> = ({ task, variant = 'icon' }) => {
  const { shareTask, isSharing } = useTaskShare();

  const handleShare = async () => {
    await shareTask(task);
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`
        ${variant === 'icon' ? 'p-1 rounded hover:bg-gray-100' : 'px-3 py-1 rounded bg-blue-100 hover:bg-blue-200'}
        transition-colors disabled:opacity-50
      `}
      title="Share task"
    >
      {variant === 'icon' ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      ) : (
        isSharing ? 'Sharing...' : 'Share'
      )}
    </button>
  );
};

// Example: List share with progress info
export const ListShareWithProgress: React.FC<{
  list: any;
  showProgress?: boolean;
}> = ({ list, showProgress = true }) => {
  const { shareList } = useListShare();

  const handleShare = async (format: 'text' | 'markdown' | 'csv' = 'text') => {
    await shareList(list, format, {
      includeProgress: showProgress,
      includeMetadata: true,
      template: 'detailed'
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleShare('text')}
        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
      >
        Share as Text
      </button>
      <button
        onClick={() => handleShare('markdown')}
        className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded transition-colors"
      >
        Share as Markdown
      </button>
      <button
        onClick={() => handleShare('csv')}
        className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded transition-colors"
      >
        Export CSV
      </button>
    </div>
  );
};

// Example: Floating share button
export const FloatingShareButton: React.FC<{
  data: any;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}> = ({ data, position = 'bottom-right' }) => {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      <ShareButton
        data={data}
        variant="primary"
        size="lg"
        className="!rounded-full !p-4 shadow-lg hover:shadow-xl"
      />
    </div>
  );
};

// Example: Share progress notification
export const ShareProgressNotification: React.FC<{
  isSharing: boolean;
  lastResult: any;
  onDismiss: () => void;
}> = ({ isSharing, lastResult, onDismiss }) => {
  if (!isSharing && !lastResult) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`
        p-4 rounded-lg shadow-lg border
        ${isSharing ? 'bg-blue-50 border-blue-200' : 
          lastResult?.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {isSharing ? (
              <>
                <div className="animate-spin w-5 h-5 mr-2">
                  <svg fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                </div>
                <span className="text-blue-800">Sharing...</span>
              </>
            ) : lastResult?.success ? (
              <>
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800">Shared successfully!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-red-800">Share failed</span>
              </>
            )}
          </div>
          
          {!isSharing && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {lastResult?.message && (
          <p className="mt-2 text-sm text-gray-600">
            {lastResult.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default {
  PageShareButton,
  InlineTaskShare,
  ListShareWithProgress,
  FloatingShareButton,
  ShareProgressNotification
};