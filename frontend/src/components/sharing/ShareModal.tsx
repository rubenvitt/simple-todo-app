/**
 * ShareModal Component
 * 
 * Advanced sharing modal with multiple format options, preview, and customization
 */

import React, { useState, useEffect } from 'react';
import { useTaskShare, useListShare } from '../../hooks/useShare';
import { ContentFormatter, FormattingOptions } from '../../utils/content-formatters';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    type: 'task' | 'list';
    data: any; // Task or List data
  };
  className?: string;
}

type ShareFormat = 'text' | 'markdown' | 'json' | 'csv' | 'email';

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  content,
  className = ''
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>('text');
  const [formatOptions, setFormatOptions] = useState<FormattingOptions>({
    includeMetadata: true,
    includeTimestamps: false,
    includeEmojis: true,
    template: 'detailed',
    dateFormat: 'short',
    includeProgress: true,
    includeCollaborators: false
  });
  const [preview, setPreview] = useState<string>('');
  const [shareMethod, setShareMethod] = useState<'share' | 'file'>('share');

  const taskShare = useTaskShare({
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      console.error('Share failed:', error);
    }
  });

  const listShare = useListShare({
    onSuccess: () => {
      onClose();
    },
    onError: (error) => {
      console.error('Share failed:', error);
    }
  });

  // Update preview when format or options change
  useEffect(() => {
    if (!content.data) return;

    try {
      const formatted = content.type === 'task' 
        ? ContentFormatter.formatTask(content.data, selectedFormat, formatOptions)
        : ContentFormatter.formatList(content.data, selectedFormat, formatOptions);
      setPreview(formatted);
    } catch (error) {
      setPreview('Error generating preview');
      console.error('Preview generation failed:', error);
    }
  }, [content, selectedFormat, formatOptions]);

  const handleShare = async () => {
    try {
      if (content.type === 'task') {
        if (shareMethod === 'file') {
          // For tasks, create a temporary list structure for file sharing
          const taskList = {
            ...content.data,
            name: content.data.title,
            tasks: [content.data]
          };
          await listShare.shareListAsFile(taskList, selectedFormat as any, formatOptions);
        } else {
          await taskShare.shareTask(content.data, selectedFormat, formatOptions);
        }
      } else {
        if (shareMethod === 'file') {
          await listShare.shareListAsFile(content.data, selectedFormat as any, formatOptions);
        } else {
          await listShare.shareList(content.data, selectedFormat, formatOptions);
        }
      }
    } catch (error) {
      console.error('Share operation failed:', error);
    }
  };

  const formatOptions_list = [
    { value: 'text', label: 'Plain Text', icon: '📄' },
    { value: 'markdown', label: 'Markdown', icon: '📝' },
    { value: 'json', label: 'JSON', icon: '🔧' },
    { value: 'csv', label: 'CSV', icon: '📊' },
    { value: 'email', label: 'Email', icon: '📧' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`
          relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden
          ${className}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Share {content.type === 'task' ? 'Task' : 'List'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex h-96">
            {/* Left Panel - Options */}
            <div className="w-1/3 p-6 border-r border-gray-200 overflow-y-auto">
              {/* Share Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="shareMethod"
                      value="share"
                      checked={shareMethod === 'share'}
                      onChange={(e) => setShareMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    <span className="text-sm">Share directly</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="shareMethod"
                      value="file"
                      checked={shareMethod === 'file'}
                      onChange={(e) => setShareMethod(e.target.value as any)}
                      className="mr-2"
                    />
                    <span className="text-sm">Download as file</span>
                  </label>
                </div>
              </div>

              {/* Format Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <div className="space-y-2">
                  {formatOptions_list.map((format) => (
                    <label key={format.value} className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value={format.value}
                        checked={selectedFormat === format.value}
                        onChange={(e) => setSelectedFormat(e.target.value as ShareFormat)}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {format.icon} {format.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Options</h3>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formatOptions.includeMetadata}
                    onChange={(e) => setFormatOptions(prev => ({
                      ...prev,
                      includeMetadata: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include metadata</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formatOptions.includeTimestamps}
                    onChange={(e) => setFormatOptions(prev => ({
                      ...prev,
                      includeTimestamps: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include timestamps</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formatOptions.includeEmojis}
                    onChange={(e) => setFormatOptions(prev => ({
                      ...prev,
                      includeEmojis: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Include emojis</span>
                </label>

                {content.type === 'list' && (
                  <>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formatOptions.includeProgress}
                        onChange={(e) => setFormatOptions(prev => ({
                          ...prev,
                          includeProgress: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Include progress stats</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formatOptions.includeCollaborators}
                        onChange={(e) => setFormatOptions(prev => ({
                          ...prev,
                          includeCollaborators: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Include collaborators</span>
                    </label>
                  </>
                )}

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detail Level
                  </label>
                  <select
                    value={formatOptions.template}
                    onChange={(e) => setFormatOptions(prev => ({
                      ...prev,
                      template: e.target.value as any
                    }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="detailed">Detailed</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Format
                  </label>
                  <select
                    value={formatOptions.dateFormat}
                    onChange={(e) => setFormatOptions(prev => ({
                      ...prev,
                      dateFormat: e.target.value as any
                    }))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="short">Short (12/31/2023)</option>
                    <option value="long">Long (December 31, 2023)</option>
                    <option value="iso">ISO (2023-12-31T...</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
              <div className="bg-gray-50 rounded-lg p-4 h-full overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {preview}
                </pre>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              {shareMethod === 'file' ? 'File will be downloaded' : 'Content will be shared'}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={taskShare.isSharing || listShare.isSharing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {taskShare.isSharing || listShare.isSharing ? 'Sharing...' : 
                 shareMethod === 'file' ? 'Download' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;