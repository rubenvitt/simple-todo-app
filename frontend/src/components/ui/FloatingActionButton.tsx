import React, { useState, useRef, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { useMobileDetection, useHaptics } from '../../hooks';

interface FloatingAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface FloatingActionButtonProps {
  /**
   * Primary action when FAB is clicked (if no actions array provided)
   */
  onClick?: () => void;
  
  /**
   * Array of actions for expandable FAB menu
   */
  actions?: FloatingAction[];
  
  /**
   * Icon for the main FAB button
   */
  icon?: React.ReactNode;
  
  /**
   * Custom positioning styles
   */
  style?: React.CSSProperties;
  
  /**
   * Whether FAB is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether to hide FAB on scroll
   */
  hideOnScroll?: boolean;
  
  /**
   * Scroll container ref for hideOnScroll functionality
   */
  scrollContainerRef?: React.RefObject<HTMLElement>;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Tooltip text for main FAB
   */
  tooltip?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  actions = [],
  icon = <PlusOutlined />,
  style,
  disabled = false,
  hideOnScroll = false,
  scrollContainerRef,
  className = '',
  tooltip = 'Neue Aufgabe erstellen',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const fabRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useMobileDetection();
  const { pressFeedback, successFeedback, tapFeedback, isEnabled } = useHaptics();

  // Handle scroll-to-hide behavior
  useEffect(() => {
    if (!hideOnScroll || !isMobile) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainerRef?.current?.scrollTop || window.scrollY;
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      
      setScrollDirection(direction);
      setLastScrollY(currentScrollY);

      // Hide when scrolling down, show when scrolling up or at top
      if (currentScrollY > 100 && direction === 'down') {
        setIsVisible(false);
        setIsExpanded(false); // Close expanded menu when hiding
      } else if (direction === 'up' || currentScrollY < 100) {
        setIsVisible(true);
      }
    };

    const scrollElement = scrollContainerRef?.current || window;
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [hideOnScroll, lastScrollY, scrollContainerRef, isMobile]);

  // Close expanded menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  const handleMainClick = () => {
    if (isEnabled) {
      if (actions.length > 0) {
        pressFeedback(); // Expansion feedback
      } else {
        successFeedback(); // Action feedback
      }
    }
    
    if (actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else {
      onClick?.();
    }
  };

  const handleActionClick = (action: FloatingAction) => {
    if (isEnabled) {
      tapFeedback(); // Individual action feedback
    }
    action.onClick();
    setIsExpanded(false);
  };

  // Calculate positioning with safe area considerations
  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: isMobile 
      ? 'calc(env(safe-area-inset-bottom, 0px) + 80px)' 
      : '24px',
    right: isMobile 
      ? 'calc(env(safe-area-inset-right, 0px) + 16px)' 
      : '24px',
    zIndex: 1000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: `translateY(${isVisible ? '0' : '100px'}) scale(${isVisible ? '1' : '0.8'})`,
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none',
    ...style,
  };

  return (
    <div 
      ref={fabRef} 
      className={`fab-container ${className}`} 
      style={defaultStyle}
    >
      {/* Expandable Actions */}
      {actions.length > 0 && isExpanded && (
        <div 
          className="fab-actions"
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            animation: 'fabActionsSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {actions.map((action, index) => (
            <Tooltip key={action.key} title={action.label} placement="left">
              <Button
                type="primary"
                shape="circle"
                icon={action.icon}
                size={isMobile ? 'large' : 'middle'}
                disabled={action.disabled}
                onClick={() => handleActionClick(action)}
                style={{
                  minWidth: isMobile ? '48px' : '40px',
                  minHeight: isMobile ? '48px' : '40px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: 'none',
                  opacity: action.disabled ? 0.5 : 1,
                  transform: `scale(${isExpanded ? 1 : 0.8})`,
                  transition: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 50}ms`,
                }}
                className="fab-action-button"
              />
            </Tooltip>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <Tooltip title={!isExpanded ? tooltip : 'Schließen'} placement="left">
        <Button
          type="primary"
          shape="circle"
          icon={isExpanded ? <CloseOutlined /> : icon}
          size={isMobile ? 'large' : 'middle'}
          disabled={disabled}
          onClick={handleMainClick}
          style={{
            minWidth: isMobile ? '56px' : '48px',
            minHeight: isMobile ? '56px' : '48px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
            border: 'none',
            fontSize: isMobile ? '20px' : '16px',
            transform: `rotate(${isExpanded ? '45deg' : '0deg'})`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="fab-main-button"
        />
      </Tooltip>

      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            zIndex: -1,
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

// Export type for external use
export type { FloatingAction };