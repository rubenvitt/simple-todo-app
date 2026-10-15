/**
 * Network Components
 * 
 * Components for displaying and managing network status and adaptive behavior
 */

export { default as NetworkStatusIndicator } from './NetworkStatusIndicator';

// Re-export network hooks
export { 
  useNetworkMonitor,
  useOnlineStatus,
  useNetworkAdaptiveConfig,
  useNetworkQualityAdaptation
} from '../../hooks/useNetworkMonitor';

// Re-export network service
export { 
  networkMonitor,
  createNetworkHook
} from '../../services/network-monitor.service';

// Re-export types
export type {
  NetworkType,
  NetworkQuality,
  NetworkInfo,
  NetworkEvent,
  NetworkCapabilities,
  UseNetworkMonitorOptions,
  UseNetworkMonitorReturn
} from '../../services/network-monitor.service';