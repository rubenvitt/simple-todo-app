/**
 * Share Service
 * 
 * Provides native sharing functionality with Web Share API and fallback support
 * for copying to clipboard on unsupported browsers.
 */

// Share data interface
export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

// Share result interface
export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'fallback';
  error?: string;
  message?: string;
}

// Share capabilities
export interface ShareCapabilities {
  hasNativeShare: boolean;
  hasClipboard: boolean;
  supportsFiles: boolean;
  supportedMimeTypes: string[];
}

export class ShareService {
  private static instance: ShareService;
  private capabilities: ShareCapabilities;

  private constructor() {
    this.capabilities = this.detectCapabilities();
  }

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  /**
   * Detect browser sharing capabilities
   */
  private detectCapabilities(): ShareCapabilities {
    const hasNativeShare = 'share' in navigator && typeof navigator.share === 'function';
    const hasClipboard = 'clipboard' in navigator && typeof navigator.clipboard?.writeText === 'function';
    
    let supportsFiles = false;
    let supportedMimeTypes: string[] = [];

    if (hasNativeShare) {
      // Check if files are supported by trying to share a minimal file
      try {
        supportsFiles = 'canShare' in navigator && typeof navigator.canShare === 'function';
        
        if (supportsFiles) {
          // Common MIME types to test
          const testTypes = [
            'text/plain',
            'text/html',
            'application/json',
            'image/png',
            'image/jpeg',
            'application/pdf'
          ];

          supportedMimeTypes = testTypes.filter(type => {
            try {
              const testFile = new File(['test'], 'test.txt', { type });
              return navigator.canShare?.({ files: [testFile] }) ?? false;
            } catch {
              return false;
            }
          });
        }
      } catch (error) {
        console.warn('Error detecting file sharing capabilities:', error);
        supportsFiles = false;
      }
    }

    return {
      hasNativeShare,
      hasClipboard,
      supportsFiles,
      supportedMimeTypes
    };
  }

  /**
   * Get current sharing capabilities
   */
  getCapabilities(): ShareCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if native sharing is available
   */
  canUseNativeShare(data: ShareData): boolean {
    if (!this.capabilities.hasNativeShare) {
      return false;
    }

    // Check if files are supported if trying to share files
    if (data.files && data.files.length > 0) {
      if (!this.capabilities.supportsFiles) {
        return false;
      }

      // Check if all file types are supported
      return data.files.every(file => 
        this.capabilities.supportedMimeTypes.includes(file.type) ||
        navigator.canShare?.({ files: [file] }) === true
      );
    }

    // For text/URL sharing, native share is available
    return true;
  }

  /**
   * Share content using the best available method
   */
  async share(data: ShareData): Promise<ShareResult> {
    try {
      // Validate input data
      if (!data.title && !data.text && !data.url && (!data.files || data.files.length === 0)) {
        throw new Error('No content to share');
      }

      // Try native sharing first
      if (this.canUseNativeShare(data)) {
        return await this.shareNative(data);
      }

      // Fall back to clipboard for text content
      if ((data.text || data.url) && this.capabilities.hasClipboard) {
        return await this.shareClipboard(data);
      }

      // Final fallback - custom share modal will be handled by UI
      return {
        success: false,
        method: 'fallback',
        error: 'No sharing method available',
        message: 'Please copy the content manually'
      };

    } catch (error) {
      console.error('Share failed:', error);
      return {
        success: false,
        method: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Sharing failed. Please try again.'
      };
    }
  }

  /**
   * Share using native Web Share API
   */
  private async shareNative(data: ShareData): Promise<ShareResult> {
    try {
      // Prepare share data
      const shareData: ShareData = {};
      
      if (data.title) shareData.title = data.title;
      if (data.text) shareData.text = data.text;
      if (data.url) shareData.url = data.url;
      if (data.files && data.files.length > 0) shareData.files = data.files;

      // Check if we can share this data
      if (navigator.canShare && !navigator.canShare(shareData)) {
        throw new Error('Content cannot be shared natively');
      }

      await navigator.share(shareData);

      return {
        success: true,
        method: 'native',
        message: 'Content shared successfully'
      };

    } catch (error) {
      // Handle user cancellation gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          error: 'User cancelled sharing',
          message: 'Sharing was cancelled'
        };
      }

      throw error;
    }
  }

  /**
   * Share by copying to clipboard
   */
  private async shareClipboard(data: ShareData): Promise<ShareResult> {
    try {
      let textToShare = '';

      // Build text content
      if (data.title) {
        textToShare += data.title;
      }

      if (data.text) {
        if (textToShare) textToShare += '\n\n';
        textToShare += data.text;
      }

      if (data.url) {
        if (textToShare) textToShare += '\n\n';
        textToShare += data.url;
      }

      if (!textToShare) {
        throw new Error('No text content to copy');
      }

      await navigator.clipboard.writeText(textToShare);

      return {
        success: true,
        method: 'clipboard',
        message: 'Content copied to clipboard'
      };

    } catch (error) {
      // Try legacy clipboard API as fallback
      try {
        const textArea = document.createElement('textarea');
        textArea.value = data.text || data.url || '';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (success) {
          return {
            success: true,
            method: 'clipboard',
            message: 'Content copied to clipboard'
          };
        } else {
          throw new Error('Legacy clipboard copy failed');
        }
      } catch (legacyError) {
        throw new Error('Failed to copy to clipboard');
      }
    }
  }

  /**
   * Generate shareable text content
   */
  generateShareableText(content: {
    title?: string;
    items?: string[];
    url?: string;
    footer?: string;
  }): string {
    let text = '';

    if (content.title) {
      text += content.title + '\n';
      text += '='.repeat(content.title.length) + '\n\n';
    }

    if (content.items && content.items.length > 0) {
      content.items.forEach((item, index) => {
        text += `${index + 1}. ${item}\n`;
      });
      text += '\n';
    }

    if (content.url) {
      text += `View online: ${content.url}\n`;
    }

    if (content.footer) {
      text += `\n${content.footer}`;
    }

    return text.trim();
  }

  /**
   * Create shareable file content
   */
  createShareableFile(content: string, filename: string, mimeType: string = 'text/plain'): File {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Check if sharing is available at all
   */
  isShareAvailable(): boolean {
    return this.capabilities.hasNativeShare || this.capabilities.hasClipboard;
  }

  /**
   * Get sharing method that would be used for given data
   */
  getShareMethod(data: ShareData): 'native' | 'clipboard' | 'fallback' {
    if (this.canUseNativeShare(data)) {
      return 'native';
    }

    if ((data.text || data.url) && this.capabilities.hasClipboard) {
      return 'clipboard';
    }

    return 'fallback';
  }

  /**
   * Test sharing capabilities (for development/debugging)
   */
  async testCapabilities(): Promise<{
    native: boolean;
    clipboard: boolean;
    files: boolean;
    supportedTypes: string[];
  }> {
    const testResults = {
      native: false,
      clipboard: false,
      files: false,
      supportedTypes: [] as string[]
    };

    // Test native sharing
    try {
      if (this.capabilities.hasNativeShare) {
        testResults.native = true;
      }
    } catch (error) {
      console.warn('Native share test failed:', error);
    }

    // Test clipboard
    try {
      if (this.capabilities.hasClipboard) {
        await navigator.clipboard.writeText('test');
        testResults.clipboard = true;
      }
    } catch (error) {
      console.warn('Clipboard test failed:', error);
    }

    // Test file sharing
    testResults.files = this.capabilities.supportsFiles;
    testResults.supportedTypes = this.capabilities.supportedMimeTypes;

    return testResults;
  }
}

// Convenience functions
export const shareService = ShareService.getInstance();

export const canShare = (data: ShareData): boolean => {
  return shareService.canUseNativeShare(data) || shareService.getCapabilities().hasClipboard;
};

export const share = (data: ShareData): Promise<ShareResult> => {
  return shareService.share(data);
};

export const getShareCapabilities = (): ShareCapabilities => {
  return shareService.getCapabilities();
};