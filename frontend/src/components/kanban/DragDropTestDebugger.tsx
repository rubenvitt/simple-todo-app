import React, { useState, useEffect } from 'react';
import { Card, Typography, Switch, Badge, Space } from 'antd';

const { Text, Title } = Typography;

interface DragDropEvent {
  type: 'dragStart' | 'dragOver' | 'dragEnd';
  activeId?: string;
  overId?: string;
  timestamp: number;
}

interface DragDropTestDebuggerProps {
  isActive: boolean;
  onToggle: () => void;
}

export const DragDropTestDebugger: React.FC<DragDropTestDebuggerProps> = ({
  isActive,
  onToggle,
}) => {
  const [events, setEvents] = useState<DragDropEvent[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    activeId?: string;
  }>({
    isDragging: false,
  });

  useEffect(() => {
    if (!isActive) return;

    const originalConsoleLog = console.log;
    
    console.log = (...args: any[]) => {
      // Capture drag and drop related logs
      const message = args.join(' ');
      
      if (message.includes('VirtualDrag start:')) {
        const match = message.match(/activeId: (\w+)/);
        if (match) {
          const event: DragDropEvent = {
            type: 'dragStart',
            activeId: match[1],
            timestamp: Date.now(),
          };
          setEvents(prev => [...prev.slice(-9), event]);
          setDragState({
            isDragging: true,
            activeId: match[1],
          });
        }
      } else if (message.includes('VirtualDrag end:')) {
        const activeMatch = message.match(/activeId: (\w+)/);
        const overMatch = message.match(/overId: (\w+)/);
        if (activeMatch) {
          const event: DragDropEvent = {
            type: 'dragEnd',
            activeId: activeMatch[1],
            overId: overMatch?.[1],
            timestamp: Date.now(),
          };
          setEvents(prev => [...prev.slice(-9), event]);
          setDragState({
            isDragging: false,
          });
        }
      }
      
      // Call original console.log
      originalConsoleLog(...args);
    };

    return () => {
      console.log = originalConsoleLog;
    };
  }, [isActive]);

  if (!isActive) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Card size="small" className="bg-blue-50">
          <Space>
            <Text strong>🔍 Drag & Drop Debugger</Text>
            <Switch 
              size="small" 
              checked={false} 
              onChange={onToggle}
            />
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <Card
      size="small"
      className="fixed bottom-4 left-4 z-50 w-80"
      title={
        <Space>
          <span>🔍 Drag & Drop Debug</span>
          <Badge 
            color={dragState.isDragging ? 'green' : 'gray'} 
            text={dragState.isDragging ? 'Dragging' : 'Idle'} 
          />
          <Switch 
            size="small" 
            checked={true} 
            onChange={onToggle}
          />
        </Space>
      }
    >
      <div className="space-y-2">
        {dragState.isDragging && (
          <div className="p-2 bg-green-50 rounded">
            <Text strong>Active Drag: {dragState.activeId}</Text>
          </div>
        )}
        
        <div>
          <Title level={5} className="!mb-2">Recent Events:</Title>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {events.length === 0 ? (
              <Text type="secondary">No drag events yet...</Text>
            ) : (
              events.slice(-10).reverse().map((event, index) => (
                <div 
                  key={`${event.timestamp}-${index}`}
                  className={`text-xs p-2 rounded ${
                    event.type === 'dragStart' ? 'bg-blue-50' :
                    event.type === 'dragEnd' ? 'bg-green-50' : 
                    'bg-gray-50'
                  }`}
                >
                  <div className="font-mono">
                    <span className="font-bold">{event.type}</span>
                    {event.activeId && <span> active:{event.activeId}</span>}
                    {event.overId && <span> over:{event.overId}</span>}
                  </div>
                  <div className="text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <button
            onClick={() => setEvents([])}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Clear Events
          </button>
        </div>
      </div>
    </Card>
  );
};

// Hook für den Debugger
export const useDragDropDebugger = () => {
  const [isActive, setIsActive] = useState(false);

  const toggle = () => setIsActive(prev => !prev);
  const activate = () => setIsActive(true);
  const deactivate = () => setIsActive(false);

  return {
    isActive,
    toggle,
    activate,
    deactivate,
  };
};