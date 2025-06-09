import React from 'react';
import { Badge, Tooltip, Typography } from 'antd';
import { WifiOutlined, LoadingOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ConnectionState } from '../../services/websocket.service';
import { useConnectionInfo } from '../../contexts';

const { Text } = Typography;

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  size?: 'small' | 'default';
}

const getStatusConfig = (state: ConnectionState, queuedMessages: number) => {
  switch (state) {
    case ConnectionState.CONNECTED:
      return {
        status: 'success' as const,
        icon: <WifiOutlined />,
        text: 'Connected',
        color: '#52c41a',
        description: queuedMessages > 0 
          ? `Connected (${queuedMessages} queued messages)` 
          : 'Real-time connection active'
      };
    case ConnectionState.CONNECTING:
      return {
        status: 'processing' as const,
        icon: <LoadingOutlined />,
        text: 'Connecting',
        color: '#1890ff',
        description: 'Establishing connection...'
      };
    case ConnectionState.RECONNECTING:
      return {
        status: 'warning' as const,
        icon: <LoadingOutlined />,
        text: 'Reconnecting',
        color: '#faad14',
        description: 'Attempting to reconnect...'
      };
    case ConnectionState.ERROR:
      return {
        status: 'error' as const,
        icon: <ExclamationCircleOutlined />,
        text: 'Error',
        color: '#ff4d4f',
        description: 'Connection failed'
      };
    case ConnectionState.DISCONNECTED:
    default:
      return {
        status: 'default' as const,
        icon: <WifiOutlined />,
        text: 'Disconnected',
        color: '#d9d9d9',
        description: queuedMessages > 0 
          ? `Offline (${queuedMessages} messages queued)` 
          : 'No connection'
      };
  }
};

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  showDetails = false,
  size = 'default'
}) => {
  const { state, queuedMessages, lastConnected, lastDisconnected, retry } = useConnectionInfo();
  const config = getStatusConfig(state, queuedMessages);

  const getDetailedDescription = () => {
    let description = config.description;
    
    if (lastConnected && state === ConnectionState.CONNECTED) {
      description += `\nLast connected: ${lastConnected.toLocaleTimeString()}`;
    }
    
    if (lastDisconnected && state === ConnectionState.DISCONNECTED) {
      description += `\nLast disconnected: ${lastDisconnected.toLocaleTimeString()}`;
    }
    
    if (state === ConnectionState.ERROR) {
      description += '\nClick to retry connection';
    }
    
    return description;
  };

  const handleClick = () => {
    if (state === ConnectionState.ERROR) {
      retry();
    }
  };

  const indicator = (
    <div 
      onClick={handleClick}
      style={{ cursor: state === ConnectionState.ERROR ? 'pointer' : 'default' }}
    >
      <Badge 
        status={config.status} 
        dot={!showDetails}
        text={showDetails ? config.text : undefined}
      />
    </div>
  );

  if (size === 'small' && !showDetails) {
    return (
      <Tooltip title={getDetailedDescription()}>
        <div style={{ color: config.color }}>
          {config.icon}
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={getDetailedDescription()}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4,
          cursor: state === ConnectionState.ERROR ? 'pointer' : 'default'
        }}
        onClick={handleClick}
      >
        {indicator}
        {showDetails && queuedMessages > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ({queuedMessages})
          </Text>
        )}
      </div>
    </Tooltip>
  );
};