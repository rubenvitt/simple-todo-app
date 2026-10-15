import React from 'react';
import { animated, useSpring, config } from '@react-spring/web';
import { ReloadOutlined, ArrowDownOutlined, CheckOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  isPulling: boolean;
  isRefreshing: boolean;
  isThresholdReached: boolean;
  threshold: number;
  className?: string;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  pullProgress,
  isPulling,
  isRefreshing,
  isThresholdReached,
  className = '',
}) => {
  // Animation for the indicator container
  const containerSpring = useSpring({
    transform: `translateY(${Math.min(pullDistance * 0.8, 80)}px)`,
    opacity: isPulling || isRefreshing ? 1 : 0,
    config: config.gentle,
  });

  // Animation for the refresh icon rotation
  const iconSpring = useSpring({
    transform: isRefreshing 
      ? 'rotate(360deg)' 
      : `rotate(${pullProgress * 180}deg)`,
    config: isRefreshing ? { duration: 1000 } : config.wobbly,
    loop: isRefreshing,
  });

  // Scale animation for threshold feedback
  const scaleSpring = useSpring({
    transform: `scale(${isThresholdReached ? 1.2 : 1})`,
    config: config.wobbly,
  });

  // Progress circle animation
  const progressSpring = useSpring({
    strokeDasharray: `${pullProgress * 100} 100`,
    config: config.gentle,
  });

  const getIndicatorContent = () => {
    if (isRefreshing) {
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <Spin size="small" />
          <span className="text-sm font-medium">Aktualisierung...</span>
        </div>
      );
    }

    if (isThresholdReached) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <animated.div style={scaleSpring}>
            <CheckOutlined className="text-lg" />
          </animated.div>
          <span className="text-sm font-medium">Loslassen zum Aktualisieren</span>
        </div>
      );
    }

    if (isPulling) {
      return (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="relative">
            {/* Progress circle */}
            <svg width="24" height="24" className="absolute inset-0">
              <circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <animated.circle
                cx="12"
                cy="12"
                r="8"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={progressSpring.strokeDasharray}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                }}
              />
            </svg>
            
            {/* Pull icon */}
            <animated.div 
              style={iconSpring}
              className="relative z-10 flex items-center justify-center w-6 h-6"
            >
              <ArrowDownOutlined className="text-sm" />
            </animated.div>
          </div>
          <span className="text-sm font-medium">
            Nach unten ziehen...
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <animated.div
      style={containerSpring}
      className={`
        fixed top-0 left-0 right-0 z-40
        flex items-center justify-center
        py-4 px-6
        bg-white/90 backdrop-blur-sm
        border-b border-gray-100
        shadow-sm
        ${className}
      `}
    >
      {getIndicatorContent()}
    </animated.div>
  );
};

// Simplified version for inline use
export const InlinePullIndicator: React.FC<{
  pullProgress: number;
  isRefreshing: boolean;
  isThresholdReached: boolean;
}> = ({ pullProgress, isRefreshing, isThresholdReached }) => {
  const iconSpring = useSpring({
    transform: isRefreshing 
      ? 'rotate(360deg)' 
      : `rotate(${pullProgress * 180}deg)`,
    config: isRefreshing ? { duration: 1000 } : config.wobbly,
    loop: isRefreshing,
  });

  if (isRefreshing) {
    return (
      <div className="flex items-center justify-center py-2">
        <Spin size="small" />
      </div>
    );
  }

  if (pullProgress > 0) {
    return (
      <div className="flex items-center justify-center py-2">
        <animated.div style={iconSpring}>
          <ReloadOutlined 
            className={`text-lg ${
              isThresholdReached ? 'text-green-600' : 'text-gray-400'
            }`} 
          />
        </animated.div>
      </div>
    );
  }

  return null;
};