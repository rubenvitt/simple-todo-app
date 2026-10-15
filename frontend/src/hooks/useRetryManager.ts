/**
 * useRetryManager Hook
 * 
 * React hook for managing retry operations with exponential backoff and circuit breaker
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  retryManager, 
  RetryConfig, 
  NetworkAwareRetryConfig, 
  CircuitBreakerConfig,
  RetryResult,
  CircuitBreakerState
} from '../services/retry-manager.service';

export interface UseRetryManagerOptions {
  operationId?: string;
  defaultConfig?: Partial<NetworkAwareRetryConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  enableCircuitBreaker?: boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
  onMaxRetriesExceeded?: (error: any, attempts: number) => void;
  onSuccess?: (data: any, attempts: number, totalTime: number) => void;
  onFailure?: (error: any, attempts: number, totalTime: number) => void;
}

export interface UseRetryManagerReturn {
  // Execute operations
  execute: <T>(operation: () => Promise<T>, config?: Partial<RetryConfig>) => Promise<RetryResult<T>>;
  executeNetworkAware: <T>(operation: () => Promise<T>, config?: Partial<NetworkAwareRetryConfig>) => Promise<RetryResult<T>>;
  executeWithCircuitBreaker: <T>(operation: () => Promise<T>, config?: Partial<RetryConfig>) => Promise<RetryResult<T>>;
  
  // HTTP helpers
  httpGet: <T>(url: string, config?: Partial<NetworkAwareRetryConfig>) => Promise<RetryResult<T>>;
  httpPost: <T>(url: string, body: any, config?: Partial<NetworkAwareRetryConfig>) => Promise<RetryResult<T>>;
  httpPut: <T>(url: string, body: any, config?: Partial<NetworkAwareRetryConfig>) => Promise<RetryResult<T>>;
  httpDelete: <T>(url: string, config?: Partial<NetworkAwareRetryConfig>) => Promise<RetryResult<T>>;
  
  // State management
  isExecuting: boolean;
  lastResult: RetryResult<any> | null;
  currentAttempt: number;
  circuitBreakerState: CircuitBreakerState | null;
  
  // Control
  cancel: () => boolean;
  resetCircuitBreaker: () => boolean;
  
  // Utilities
  createRetryWrapper: <TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    config?: Partial<NetworkAwareRetryConfig>
  ) => (...args: TArgs) => Promise<RetryResult<TReturn>>;
}

export const useRetryManager = (options: UseRetryManagerOptions = {}): UseRetryManagerReturn => {
  const {
    operationId,
    defaultConfig = {},
    circuitBreakerConfig = {},
    enableCircuitBreaker = false,
    onRetry,
    onMaxRetriesExceeded,
    onSuccess,
    onFailure
  } = options;

  // State
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<RetryResult<any> | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [circuitBreakerState, setCircuitBreakerState] = useState<CircuitBreakerState | null>(null);

  // Refs
  const executionIdRef = useRef(operationId || Math.random().toString(36));
  const isComponentMountedRef = useRef(true);

  // Update circuit breaker state
  useEffect(() => {
    if (enableCircuitBreaker && executionIdRef.current) {
      const state = retryManager.getCircuitBreakerState(executionIdRef.current);
      setCircuitBreakerState(state);
    }
  }, [enableCircuitBreaker, lastResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
      if (executionIdRef.current) {
        retryManager.cancelOperation(executionIdRef.current);
      }
    };
  }, []);

  // Create enhanced config with callbacks
  const createEnhancedConfig = useCallback((config: Partial<RetryConfig> = {}) => {
    return {
      ...defaultConfig,
      ...config,
      onRetry: (error: any, attempt: number, delay: number) => {
        if (isComponentMountedRef.current) {
          setCurrentAttempt(attempt);
        }
        onRetry?.(error, attempt, delay);
        config.onRetry?.(error, attempt, delay);
      },
      onMaxRetriesExceeded: (error: any, attempts: number) => {
        onMaxRetriesExceeded?.(error, attempts);
        config.onMaxRetriesExceeded?.(error, attempts);
      }
    };
  }, [defaultConfig, onRetry, onMaxRetriesExceeded]);

  // Execute operation
  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> => {
    if (isExecuting) {
      throw new Error('Another operation is already executing');
    }

    setIsExecuting(true);
    setCurrentAttempt(0);
    setLastResult(null);

    try {
      const enhancedConfig = createEnhancedConfig(config);
      const result = await retryManager.execute(operation, enhancedConfig, executionIdRef.current);
      
      if (isComponentMountedRef.current) {
        setLastResult(result);
        
        if (result.success) {
          onSuccess?.(result.data, result.attempts, result.totalTime);
        } else {
          onFailure?.(result.error, result.attempts, result.totalTime);
        }
      }
      
      return result;
    } finally {
      if (isComponentMountedRef.current) {
        setIsExecuting(false);
        setCurrentAttempt(0);
      }
    }
  }, [isExecuting, createEnhancedConfig, onSuccess, onFailure]);

  // Execute with network awareness
  const executeNetworkAware = useCallback(async <T>(
    operation: () => Promise<T>,
    config: Partial<NetworkAwareRetryConfig> = {}
  ): Promise<RetryResult<T>> => {
    if (isExecuting) {
      throw new Error('Another operation is already executing');
    }

    setIsExecuting(true);
    setCurrentAttempt(0);
    setLastResult(null);

    try {
      const enhancedConfig = createEnhancedConfig(config);
      const result = await retryManager.executeNetworkAware(operation, enhancedConfig, executionIdRef.current);
      
      if (isComponentMountedRef.current) {
        setLastResult(result);
        
        if (result.success) {
          onSuccess?.(result.data, result.attempts, result.totalTime);
        } else {
          onFailure?.(result.error, result.attempts, result.totalTime);
        }
      }
      
      return result;
    } finally {
      if (isComponentMountedRef.current) {
        setIsExecuting(false);
        setCurrentAttempt(0);
      }
    }
  }, [isExecuting, createEnhancedConfig, onSuccess, onFailure]);

  // Execute with circuit breaker
  const executeWithCircuitBreaker = useCallback(async <T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> => {
    if (isExecuting) {
      throw new Error('Another operation is already executing');
    }

    setIsExecuting(true);
    setCurrentAttempt(0);
    setLastResult(null);

    try {
      const enhancedConfig = createEnhancedConfig(config);
      const result = await retryManager.executeWithCircuitBreaker(
        operation,
        executionIdRef.current,
        enhancedConfig,
        circuitBreakerConfig
      );
      
      if (isComponentMountedRef.current) {
        setLastResult(result);
        setCircuitBreakerState(result.circuitState || null);
        
        if (result.success) {
          onSuccess?.(result.data, result.attempts, result.totalTime);
        } else {
          onFailure?.(result.error, result.attempts, result.totalTime);
        }
      }
      
      return result;
    } finally {
      if (isComponentMountedRef.current) {
        setIsExecuting(false);
        setCurrentAttempt(0);
      }
    }
  }, [isExecuting, createEnhancedConfig, circuitBreakerConfig, onSuccess, onFailure]);

  // HTTP helper functions
  const httpGet = useCallback(<T>(url: string, config: Partial<NetworkAwareRetryConfig> = {}) => {
    const operation = () => fetch(url, { method: 'GET' }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    });
    return executeNetworkAware<T>(operation, config);
  }, [executeNetworkAware]);

  const httpPost = useCallback(<T>(url: string, body: any, config: Partial<NetworkAwareRetryConfig> = {}) => {
    const operation = () => fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    });
    return executeNetworkAware<T>(operation, config);
  }, [executeNetworkAware]);

  const httpPut = useCallback(<T>(url: string, body: any, config: Partial<NetworkAwareRetryConfig> = {}) => {
    const operation = () => fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    });
    return executeNetworkAware<T>(operation, config);
  }, [executeNetworkAware]);

  const httpDelete = useCallback(<T>(url: string, config: Partial<NetworkAwareRetryConfig> = {}) => {
    const operation = () => fetch(url, { method: 'DELETE' }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    });
    return executeNetworkAware<T>(operation, config);
  }, [executeNetworkAware]);

  // Control functions
  const cancel = useCallback(() => {
    return retryManager.cancelOperation(executionIdRef.current);
  }, []);

  const resetCircuitBreaker = useCallback(() => {
    const result = retryManager.resetCircuitBreaker(executionIdRef.current);
    if (result && isComponentMountedRef.current) {
      setCircuitBreakerState('closed');
    }
    return result;
  }, []);

  // Create retry wrapper
  const createRetryWrapper = useCallback(<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    config: Partial<NetworkAwareRetryConfig> = {}
  ) => {
    return retryManager.createRetryWrapper(fn, { ...defaultConfig, ...config }, executionIdRef.current);
  }, [defaultConfig]);

  return {
    // Execute operations
    execute,
    executeNetworkAware,
    executeWithCircuitBreaker,
    
    // HTTP helpers
    httpGet,
    httpPost,
    httpPut,
    httpDelete,
    
    // State management
    isExecuting,
    lastResult,
    currentAttempt,
    circuitBreakerState,
    
    // Control
    cancel,
    resetCircuitBreaker,
    
    // Utilities
    createRetryWrapper
  };
};

// Convenience hooks for specific use cases

/**
 * Hook for API calls with automatic retry
 */
export const useRetryableApi = (baseUrl: string = '', defaultConfig: Partial<NetworkAwareRetryConfig> = {}) => {
  const { httpGet, httpPost, httpPut, httpDelete, ...rest } = useRetryManager({
    defaultConfig: {
      networkAdaptive: true,
      ...defaultConfig
    }
  });

  const get = useCallback(<T>(endpoint: string, config?: Partial<NetworkAwareRetryConfig>) => 
    httpGet<T>(`${baseUrl}${endpoint}`, config), [baseUrl, httpGet]);

  const post = useCallback(<T>(endpoint: string, body: any, config?: Partial<NetworkAwareRetryConfig>) => 
    httpPost<T>(`${baseUrl}${endpoint}`, body, config), [baseUrl, httpPost]);

  const put = useCallback(<T>(endpoint: string, body: any, config?: Partial<NetworkAwareRetryConfig>) => 
    httpPut<T>(`${baseUrl}${endpoint}`, body, config), [baseUrl, httpPut]);

  const del = useCallback(<T>(endpoint: string, config?: Partial<NetworkAwareRetryConfig>) => 
    httpDelete<T>(`${baseUrl}${endpoint}`, config), [baseUrl, httpDelete]);

  return {
    get,
    post,
    put,
    delete: del,
    ...rest
  };
};

/**
 * Hook for operations that need circuit breaker protection
 */
export const useRetryWithCircuitBreaker = (
  operationId: string,
  circuitConfig: Partial<CircuitBreakerConfig> = {}
) => {
  return useRetryManager({
    operationId,
    enableCircuitBreaker: true,
    circuitBreakerConfig: circuitConfig
  });
};

/**
 * Hook for background operations with lower priority
 */
export const useBackgroundRetry = (defaultConfig: Partial<NetworkAwareRetryConfig> = {}) => {
  return useRetryManager({
    defaultConfig: {
      maxAttempts: 1,
      baseDelay: 5000,
      maxDelay: 30000,
      networkAdaptive: true,
      ...defaultConfig
    }
  });
};

export default useRetryManager;