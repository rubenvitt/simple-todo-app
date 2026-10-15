import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input, Button, message, Tooltip } from 'antd';
import { PlusOutlined, SendOutlined, LoadingOutlined } from '@ant-design/icons';
import { TaskPriority } from '@simple-todo-app/shared';

interface QuickTaskCreatorProps {
  onCreateTask: (data: { title: string; priority: TaskPriority }) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  maxLength?: number;
  enableHaptics?: boolean;
}

export const QuickTaskCreator: React.FC<QuickTaskCreatorProps> = ({
  onCreateTask,
  disabled = false,
  loading = false,
  placeholder = "Neue Aufgabe schnell erstellen...",
  maxLength = 100,
  enableHaptics = true,
}) => {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<any>(null);

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Haptic feedback utility
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [enableHaptics]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setTitle(value);
    }
  }, [maxLength]);

  // Validate input
  const isValidTitle = useCallback((title: string) => {
    return title.trim().length >= 1 && title.trim().length <= maxLength;
  }, [maxLength]);

  // Handle task creation
  const handleCreateTask = useCallback(async () => {
    if (!isValidTitle(title) || isSubmitting) return;

    setIsSubmitting(true);
    triggerHaptic(30); // Light haptic on submission

    try {
      await onCreateTask({
        title: title.trim(),
        priority: TaskPriority.MEDIUM, // Auto-default
      });

      // Success feedback
      setTitle('');
      setShowSuccess(true);
      triggerHaptic([50, 50]); // Double haptic for success
      message.success('Aufgabe erstellt! 🎉', 2);

      // Reset success state
      setTimeout(() => {
        setShowSuccess(false);
        if (isExpanded) {
          setIsExpanded(false);
        }
      }, 1500);

    } catch (error) {
      console.error('Error creating quick task:', error);
      triggerHaptic([100, 50, 100]); // Error haptic pattern
      message.error('Fehler beim Erstellen der Aufgabe 😞');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, isValidTitle, isSubmitting, onCreateTask, triggerHaptic]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateTask();
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setTitle('');
      triggerHaptic(20);
    }
  }, [handleCreateTask, triggerHaptic]);

  // Handle click outside to collapse
  const handleBlur = useCallback(() => {
    if (!title.trim()) {
      setTimeout(() => setIsExpanded(false), 150); // Small delay for button clicks
    }
  }, [title]);

  // Expand on focus
  const handleFocus = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      triggerHaptic(20);
    }
  }, [isExpanded, triggerHaptic]);

  const isButtonDisabled = disabled || loading || isSubmitting || !isValidTitle(title);

  if (showSuccess) {
    return (
      <div className="flex items-center justify-center py-3 px-4 bg-green-50 border border-green-200 rounded-lg transition-all duration-500">
        <span className="text-green-600 font-medium animate-pulse">
          ✅ Aufgabe erfolgreich erstellt!
        </span>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'mb-4' : 'mb-2'}`}>
      <div className="flex items-center gap-2">
        {/* Quick Input Field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={title}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled || loading}
            size="large"
            maxLength={maxLength}
            className={`transition-all duration-300 ${
              isExpanded 
                ? 'border-blue-400 shadow-md' 
                : 'border-gray-300 hover:border-blue-300'
            }`}
            style={{
              borderRadius: '8px',
              fontSize: '16px', // Prevent zoom on iOS
              touchAction: 'manipulation',
            }}
            suffix={
              title.length > 0 && (
                <span className={`text-xs transition-colors ${
                  title.length > maxLength * 0.8 ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {title.length}/{maxLength}
                </span>
              )
            }
          />
          
          {/* Subtle animation indicator */}
          {isExpanded && (
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Action Button */}
        <Tooltip 
          title={
            !isValidTitle(title) 
              ? "Geben Sie einen Titel ein (1-100 Zeichen)" 
              : "Aufgabe erstellen (Enter)"
          }
        >
          <Button
            type="primary"
            size="large"
            icon={
              isSubmitting || loading ? (
                <LoadingOutlined spin />
              ) : isExpanded ? (
                <SendOutlined />
              ) : (
                <PlusOutlined />
              )
            }
            onClick={handleCreateTask}
            disabled={isButtonDisabled}
            className={`transition-all duration-300 ${
              isExpanded 
                ? 'scale-105 shadow-md' 
                : 'hover:scale-105'
            }`}
            style={{
              minWidth: '44px', // Touch target requirement
              height: '44px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </Tooltip>
      </div>

      {/* Helper Text */}
      {isExpanded && (
        <div className="mt-2 text-xs text-gray-500 animate-fadeIn">
          <span>💡 Tipp: Enter zum Erstellen • Escape zum Abbrechen</span>
          {title.length > 0 && (
            <span className="ml-2">
              • Priorität: Mittel (Standard)
            </span>
          )}
        </div>
      )}

      {/* Performance styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Touch optimization */
        .ant-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
        
        /* Prevent iOS zoom */
        @media screen and (max-width: 768px) {
          .ant-input {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};