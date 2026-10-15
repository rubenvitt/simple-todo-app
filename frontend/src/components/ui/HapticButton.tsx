import React, { forwardRef } from 'react';
import { Button, ButtonProps } from 'antd';
import { useHaptics, HapticPattern } from '../../hooks/useHaptics';

export interface HapticButtonProps extends ButtonProps {
  hapticPattern?: HapticPattern | 'none';
  hapticOnHover?: boolean;
  hapticOnFocus?: boolean;
  customHapticSequence?: HapticPattern[];
}

export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ 
    hapticPattern = 'light',
    hapticOnHover = false,
    hapticOnFocus = false,
    customHapticSequence,
    onClick,
    onMouseEnter,
    onFocus,
    onMouseDown,
    children,
    ...props 
  }, ref) => {
    const { 
      vibrate, 
      vibrateSequence, 
      tapFeedback, 
      pressFeedback, 
      successFeedback,
      errorFeedback,
      warningFeedback,
      isEnabled 
    } = useHaptics();

    const getHapticFeedback = (pattern: HapticPattern) => {
      switch (pattern) {
        case 'light': return tapFeedback;
        case 'medium': return pressFeedback;
        case 'heavy': return pressFeedback;
        case 'success': return successFeedback;
        case 'error': return errorFeedback;
        case 'warning': return warningFeedback;
        default: return tapFeedback;
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback
      if (isEnabled && hapticPattern !== 'none') {
        if (customHapticSequence && customHapticSequence.length > 0) {
          vibrateSequence(customHapticSequence);
        } else {
          // Enhanced feedback based on button type
          if (props.danger) {
            errorFeedback();
          } else if (props.type === 'primary') {
            pressFeedback();
          } else {
            getHapticFeedback(hapticPattern)();
          }
        }
      }
      
      onClick?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isEnabled && hapticOnHover) {
        tapFeedback();
      }
      onMouseEnter?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
      if (isEnabled && hapticOnFocus) {
        tapFeedback();
      }
      onFocus?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Additional feedback on press for better tactile experience
      if (isEnabled && hapticPattern !== 'none' && props.type === 'primary') {
        vibrate('light');
      }
      onMouseDown?.(e);
    };

    return (
      <Button
        ref={ref}
        {...props}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        onMouseDown={handleMouseDown}
      >
        {children}
      </Button>
    );
  }
);

HapticButton.displayName = 'HapticButton';