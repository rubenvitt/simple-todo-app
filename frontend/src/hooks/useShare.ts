/**
 * useShare Hook
 * 
 * React hook for easy sharing functionality with automatic
 * feedback handling and loading states.
 */

import { useState, useCallback, useEffect } from 'react';
import { shareService, ShareData, ShareResult, ShareCapabilities } from '../services/share.service';
import { ContentFormatter, FormattingOptions } from '../utils/content-formatters';

interface UseShareState {
  isSharing: boolean;
  lastResult: ShareResult | null;
  capabilities: ShareCapabilities;
}

interface UseShareOptions {
  onSuccess?: (result: ShareResult) => void;
  onError?: (error: string) => void;
  showNotifications?: boolean;
  autoResetDelay?: number;
}

interface UseShareReturn {
  share: (data: ShareData) => Promise<ShareResult>;
  isSharing: boolean;
  lastResult: ShareResult | null;
  capabilities: ShareCapabilities;
  canShare: (data: ShareData) => boolean;
  getShareMethod: (data: ShareData) => 'native' | 'clipboard' | 'fallback';
  reset: () => void;
}

export const useShare = (options: UseShareOptions = {}): UseShareReturn => {
  const {
    onSuccess,
    onError,
    showNotifications = true,
    autoResetDelay = 3000
  } = options;

  const [state, setState] = useState<UseShareState>({
    isSharing: false,
    lastResult: null,
    capabilities: shareService.getCapabilities()
  });

  // Auto-reset state after delay
  useEffect(() => {
    if (state.lastResult && autoResetDelay > 0) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, lastResult: null }));
      }, autoResetDelay);

      return () => clearTimeout(timer);
    }
  }, [state.lastResult, autoResetDelay]);

  const share = useCallback(async (data: ShareData): Promise<ShareResult> => {
    setState(prev => ({ ...prev, isSharing: true, lastResult: null }));

    try {
      const result = await shareService.share(data);

      setState(prev => ({ 
        ...prev, 
        isSharing: false, 
        lastResult: result 
      }));

      // Handle callbacks
      if (result.success) {
        onSuccess?.(result);
        
        if (showNotifications && result.message) {
          // You can integrate with your notification system here
          console.log('✅ Share success:', result.message);
        }
      } else {
        onError?.(result.error || 'Sharing failed');
        
        if (showNotifications && result.error) {
          console.warn('❌ Share error:', result.error);
        }
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: ShareResult = {
        success: false,
        method: 'fallback',
        error: errorMessage
      };

      setState(prev => ({ 
        ...prev, 
        isSharing: false, 
        lastResult: result 
      }));

      onError?.(errorMessage);
      
      if (showNotifications) {
        console.error('❌ Share failed:', errorMessage);
      }

      return result;
    }
  }, [onSuccess, onError, showNotifications]);

  const canShare = useCallback((data: ShareData): boolean => {
    return shareService.canUseNativeShare(data) || state.capabilities.hasClipboard;
  }, [state.capabilities]);

  const getShareMethod = useCallback((data: ShareData): 'native' | 'clipboard' | 'fallback' => {
    return shareService.getShareMethod(data);
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({ ...prev, lastResult: null }));
  }, []);

  return {
    share,
    isSharing: state.isSharing,
    lastResult: state.lastResult,
    capabilities: state.capabilities,
    canShare,
    getShareMethod,
    reset
  };
};

// Specialized hooks for common use cases

/**
 * Hook for sharing tasks
 */
export const useTaskShare = (options: UseShareOptions = {}) => {
  const shareHook = useShare(options);

  const shareTask = useCallback(async (
    task: {
      id: string;
      title: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high';
      dueDate?: Date;
      status?: 'todo' | 'in_progress' | 'done' | 'backlog';
      assignee?: { id: string; name: string; email?: string };
      tags?: string[];
    },
    format: 'text' | 'markdown' | 'json' | 'email' = 'text',
    formatOptions: FormattingOptions = {}
  ) => {
    const formattedContent = ContentFormatter.formatTask(task, format, {
      includeMetadata: true,
      includeEmojis: true,
      template: 'detailed',
      ...formatOptions
    });

    const shareData: ShareData = {
      title: `Task: ${task.title}`,
      text: formattedContent,
      url: `${window.location.origin}/tasks/${task.id}`
    };

    return shareHook.share(shareData);
  }, [shareHook]);

  return {
    ...shareHook,
    shareTask
  };
};

/**
 * Hook for sharing lists
 */
export const useListShare = (options: UseShareOptions = {}) => {
  const shareHook = useShare(options);

  const shareList = useCallback(async (
    list: {
      id: string;
      name: string;
      description?: string;
      tasks?: Array<{
        id: string;
        title: string;
        description?: string;
        priority?: 'low' | 'medium' | 'high';
        status?: 'todo' | 'in_progress' | 'done' | 'backlog';
        dueDate?: Date;
        assignee?: { id: string; name: string; email?: string };
        tags?: string[];
      }>;
      owner?: { id: string; name: string; email?: string };
      collaborators?: Array<{
        id: string;
        name: string;
        role: 'viewer' | 'editor' | 'owner';
      }>;
    },
    format: 'text' | 'markdown' | 'json' | 'email' = 'text',
    formatOptions: FormattingOptions = {}
  ) => {
    const formattedContent = ContentFormatter.formatList(list, format, {
      includeMetadata: true,
      includeProgress: true,
      includeEmojis: true,
      template: 'detailed',
      ...formatOptions
    });

    const shareData: ShareData = {
      title: `List: ${list.name}`,
      text: formattedContent,
      url: `${window.location.origin}/lists/${list.id}`
    };

    return shareHook.share(shareData);
  }, [shareHook]);

  const shareListAsFile = useCallback(async (
    list: {
      id: string;
      name: string;
      description?: string;
      tasks?: Array<{
        id: string;
        title: string;
        description?: string;
        priority?: 'low' | 'medium' | 'high';
        status?: 'todo' | 'in_progress' | 'done' | 'backlog';
        dueDate?: Date;
        assignee?: { id: string; name: string; email?: string };
        tags?: string[];
      }>;
      owner?: { id: string; name: string; email?: string };
      collaborators?: Array<{
        id: string;
        name: string;
        role: 'viewer' | 'editor' | 'owner';
      }>;
    },
    format: 'txt' | 'json' | 'csv' | 'markdown' | 'email' = 'txt',
    formatOptions: FormattingOptions = {}
  ) => {
    let content = '';
    let filename = `${list.name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
    let mimeType = 'text/plain';

    // Use the appropriate formatter
    switch (format) {
      case 'json':
        content = ContentFormatter.formatList(list, 'json', formatOptions);
        mimeType = 'application/json';
        break;
      
      case 'csv':
        content = ContentFormatter.formatList(list, 'csv', formatOptions);
        mimeType = 'text/csv';
        break;
      
      case 'markdown':
        content = ContentFormatter.formatList(list, 'markdown', formatOptions);
        filename = filename.replace('.markdown', '.md');
        mimeType = 'text/markdown';
        break;
        
      case 'email':
        content = ContentFormatter.formatList(list, 'email', formatOptions);
        filename = filename.replace('.email', '.txt');
        mimeType = 'text/plain';
        break;
      
      default: // txt
        content = ContentFormatter.formatList(list, 'text', formatOptions);
        break;
    }

    const file = shareService.createShareableFile(content, filename, mimeType);
    
    const shareData: ShareData = {
      title: `${list.name} - Todo List`,
      text: `Sharing todo list: ${list.name}`,
      files: [file]
    };

    return shareHook.share(shareData);
  }, [shareHook]);

  return {
    ...shareHook,
    shareList,
    shareListAsFile
  };
};

/**
 * Hook for sharing URLs with custom content
 */
export const useUrlShare = (options: UseShareOptions = {}) => {
  const shareHook = useShare(options);

  const shareUrl = useCallback(async (url: string, title?: string, text?: string) => {
    const shareData: ShareData = {
      title: title || 'Check this out!',
      text: text || 'I wanted to share this with you:',
      url
    };

    return shareHook.share(shareData);
  }, [shareHook]);

  const shareCurrentPage = useCallback(async (title?: string, text?: string) => {
    return shareUrl(window.location.href, title, text);
  }, [shareUrl]);

  return {
    ...shareHook,
    shareUrl,
    shareCurrentPage
  };
};