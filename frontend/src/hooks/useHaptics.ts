import { useCallback, useEffect, useState } from 'react';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export interface HapticPreferences {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'strong';
}

interface HapticPatternConfig {
  duration: number;
  intensity?: number; // For future use with more advanced haptic APIs
}

class HapticsManager {
  private isSupported: boolean;
  private preferences: HapticPreferences;
  private readonly storageKey = 'haptic-preferences';
  
  private patterns: Record<HapticPattern, HapticPatternConfig> = {
    light: { duration: 10 },
    medium: { duration: 20 },
    heavy: { duration: 50 },
    success: { duration: 15 },
    error: { duration: 30 },
    warning: { duration: 25 }
  };

  constructor() {
    this.isSupported = this.checkSupport();
    this.preferences = this.loadPreferences();
  }

  private checkSupport(): boolean {
    return 'vibrate' in navigator;
  }

  private loadPreferences(): HapticPreferences {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('[Haptics] Failed to load preferences:', error);
    }
    return this.getDefaultPreferences();
  }

  private getDefaultPreferences(): HapticPreferences {
    return {
      enabled: true,
      intensity: 'medium'
    };
  }

  private savePreferences(preferences: HapticPreferences): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(preferences));
      this.preferences = preferences;
    } catch (error) {
      console.warn('[Haptics] Failed to save preferences:', error);
    }
  }

  private calculateDuration(pattern: HapticPattern): number {
    const baseDuration = this.patterns[pattern].duration;
    const intensityMultiplier = {
      light: 0.7,
      medium: 1.0,
      strong: 1.3
    }[this.preferences.intensity];
    
    return Math.round(baseDuration * intensityMultiplier);
  }

  public vibrate(pattern: HapticPattern): boolean {
    if (!this.isSupported || !this.preferences.enabled) {
      return false;
    }

    try {
      const duration = this.calculateDuration(pattern);
      navigator.vibrate(duration);
      return true;
    } catch (error) {
      console.warn('[Haptics] Vibration failed:', error);
      return false;
    }
  }

  public vibrateSequence(patterns: HapticPattern[], gap: number = 50): boolean {
    if (!this.isSupported || !this.preferences.enabled) {
      return false;
    }

    try {
      const sequence: number[] = [];
      patterns.forEach((pattern, index) => {
        sequence.push(this.calculateDuration(pattern));
        if (index < patterns.length - 1) {
          sequence.push(gap); // Gap between vibrations
        }
      });
      
      navigator.vibrate(sequence);
      return true;
    } catch (error) {
      console.warn('[Haptics] Sequence vibration failed:', error);
      return false;
    }
  }

  public isHapticsSupported(): boolean {
    return this.isSupported;
  }

  public getPreferences(): HapticPreferences {
    return { ...this.preferences };
  }

  public updatePreferences(preferences: Partial<HapticPreferences>): void {
    const newPreferences = { ...this.preferences, ...preferences };
    this.savePreferences(newPreferences);
  }

  public stop(): void {
    if (this.isSupported) {
      navigator.vibrate(0);
    }
  }
}

// Singleton instance
const hapticsManager = new HapticsManager();

export function useHaptics() {
  const [preferences, setPreferences] = useState<HapticPreferences>(
    hapticsManager.getPreferences()
  );
  const [isSupported] = useState(hapticsManager.isHapticsSupported());

  useEffect(() => {
    setPreferences(hapticsManager.getPreferences());
  }, []);

  const vibrate = useCallback((pattern: HapticPattern) => {
    return hapticsManager.vibrate(pattern);
  }, []);

  const vibrateSequence = useCallback((patterns: HapticPattern[], gap?: number) => {
    return hapticsManager.vibrateSequence(patterns, gap);
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<HapticPreferences>) => {
    hapticsManager.updatePreferences(newPreferences);
    setPreferences(hapticsManager.getPreferences());
  }, []);

  const stop = useCallback(() => {
    hapticsManager.stop();
  }, []);

  // Convenience methods for common interactions
  const tapFeedback = useCallback(() => vibrate('light'), [vibrate]);
  const pressFeedback = useCallback(() => vibrate('medium'), [vibrate]);
  const longPressFeedback = useCallback(() => vibrate('heavy'), [vibrate]);
  const successFeedback = useCallback(() => vibrate('success'), [vibrate]);
  const errorFeedback = useCallback(() => vibrate('error'), [vibrate]);
  const warningFeedback = useCallback(() => vibrate('warning'), [vibrate]);

  // Complex feedback patterns
  const swipeSuccessFeedback = useCallback(() => {
    vibrateSequence(['light', 'medium'], 30);
  }, [vibrateSequence]);

  const dragDropFeedback = useCallback(() => {
    vibrateSequence(['light', 'light'], 20);
  }, [vibrateSequence]);

  const notificationFeedback = useCallback(() => {
    vibrateSequence(['medium', 'light', 'medium'], 40);
  }, [vibrateSequence]);

  return {
    // Core functions
    vibrate,
    vibrateSequence,
    stop,
    
    // Convenience methods
    tapFeedback,
    pressFeedback,
    longPressFeedback,
    successFeedback,
    errorFeedback,
    warningFeedback,
    
    // Complex patterns
    swipeSuccessFeedback,
    dragDropFeedback,
    notificationFeedback,
    
    // State and preferences
    isSupported,
    preferences,
    updatePreferences,
    
    // Status
    isEnabled: preferences.enabled && isSupported
  };
}