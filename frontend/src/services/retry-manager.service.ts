/**
 * Retry Manager Service
 * 
 * Implements intelligent retry logic with exponential backoff, circuit breaker pattern,
 * and network-aware retry strategies for robust network operations.
 */

import { networkMonitor, NetworkQuality } from './network-monitor.service';

// Retry configuration interfaces
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  multiplier: number;
  jitter: boolean;
  jitterRange: number; // 0-1, percentage of delay to jitter
  timeout: number; // milliseconds
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
  onMaxRetriesExceeded?: (error: any, attempts: number) => void;
}

export interface NetworkAwareRetryConfig extends RetryConfig {
  networkAdaptive: boolean;
  networkConfigs: {
    [K in NetworkQuality]: Partial<RetryConfig>;
  };
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number; // number of failures before opening circuit
  recoveryTimeout: number; // milliseconds to wait before trying to close circuit
  monitorWindow: number; // milliseconds to monitor for failures
  halfOpenMaxAttempts: number; // max attempts in half-open state
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
  circuitState?: CircuitBreakerState;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

// Default configurations
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true,
  jitterRange: 0.1,
  timeout: 30000
};

const DEFAULT_NETWORK_CONFIGS: NetworkAwareRetryConfig['networkConfigs'] = {
  excellent: {
    maxAttempts: 3,
    baseDelay: 500,
    maxDelay: 5000,
    multiplier: 1.5
  },
  good: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    multiplier: 2
  },
  moderate: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 20000,
    multiplier: 2.5
  },
  poor: {
    maxAttempts: 1,
    baseDelay: 5000,
    maxDelay: 60000,
    multiplier: 3
  }
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  failureThreshold: 5,
  recoveryTimeout: 60000,
  monitorWindow: 300000, // 5 minutes
  halfOpenMaxAttempts: 3
};

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures: number[] = []; // timestamps of failures
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    this.updateState();
    return this.state !== 'open';
  }

  onSuccess(): void {
    this.failures = [];
    this.halfOpenAttempts = 0;
    this.state = 'closed';
  }

  onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    
    // Clean old failures outside monitor window
    this.failures = this.failures.filter(
      time => now - time <= this.config.monitorWindow
    );

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = 'open';
      }
    } else if (this.failures.length >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitBreakerState {
    this.updateState();
    return this.state;
  }

  private updateState(): void {
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.recoveryTimeout) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      }
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failures = [];
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Retry Manager Service
 */
export class RetryManager {
  private static instance: RetryManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private activeRetries: Map<string, AbortController> = new Map();

  private constructor() {}

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationId?: string
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const startTime = Date.now();
    let attempts = 0;
    let lastError: any;

    // Setup abort controller for timeout
    const abortController = new AbortController();
    if (operationId) {
      this.activeRetries.set(operationId, abortController);
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, finalConfig.timeout);

    try {
      while (attempts < finalConfig.maxAttempts) {
        attempts++;

        // Check if operation was aborted
        if (abortController.signal.aborted) {
          throw new Error('Operation aborted due to timeout');
        }

        try {
          const result = await operation();
          
          // Success - clear timeout and return
          clearTimeout(timeoutId);
          
          return {
            success: true,
            data: result,
            attempts,
            totalTime: Date.now() - startTime
          };
          
        } catch (error) {
          lastError = error;
          
          // Check if we should retry
          if (attempts >= finalConfig.maxAttempts) {
            break;
          }

          // Check retry condition
          if (finalConfig.retryCondition && !finalConfig.retryCondition(error, attempts)) {
            break;
          }

          // Calculate delay
          const delay = this.calculateDelay(attempts, finalConfig);
          
          // Call retry callback
          finalConfig.onRetry?.(error, attempts, delay);
          
          // Wait before next attempt
          await this.delay(delay, abortController.signal);
        }
      }

      // Max retries exceeded
      clearTimeout(timeoutId);
      finalConfig.onMaxRetriesExceeded?.(lastError, attempts);
      
      return {
        success: false,
        error: lastError,
        attempts,
        totalTime: Date.now() - startTime
      };

    } finally {
      clearTimeout(timeoutId);
      if (operationId) {
        this.activeRetries.delete(operationId);
      }
    }
  }

  /**
   * Execute with network-aware retry strategy
   */
  async executeNetworkAware<T>(
    operation: () => Promise<T>,
    config: Partial<NetworkAwareRetryConfig> = {},
    operationId?: string
  ): Promise<RetryResult<T>> {
    const networkQuality = networkMonitor.getNetworkInfo().quality;
    const networkConfig = config.networkConfigs?.[networkQuality] || DEFAULT_NETWORK_CONFIGS[networkQuality];
    
    const finalConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
      ...networkConfig
    };

    return this.execute(operation, finalConfig, operationId);
  }

  /**
   * Execute with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationId: string,
    config: Partial<RetryConfig> = {},
    circuitConfig: Partial<CircuitBreakerConfig> = {}
  ): Promise<RetryResult<T>> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationId, circuitConfig);
    
    // Check if circuit is open
    if (!circuitBreaker.canExecute()) {
      return {
        success: false,
        error: new Error('Circuit breaker is open'),
        attempts: 0,
        totalTime: 0,
        circuitState: circuitBreaker.getState()
      };
    }

    const result = await this.execute(operation, config, operationId);
    
    // Update circuit breaker based on result
    if (result.success) {
      circuitBreaker.onSuccess();
    } else {
      circuitBreaker.onFailure();
    }

    return {
      ...result,
      circuitState: circuitBreaker.getState()
    };
  }

  /**
   * Execute HTTP request with comprehensive retry strategy
   */
  async executeHttpRequest<T>(
    request: () => Promise<Response>,
    config: Partial<NetworkAwareRetryConfig> = {},
    operationId?: string
  ): Promise<RetryResult<T>> {
    const httpConfig: Partial<NetworkAwareRetryConfig> = {
      ...config,
      retryCondition: (error, attempt) => {
        // Retry on network errors
        if (error.name === 'NetworkError' || error.name === 'TypeError') {
          return true;
        }
        
        // Retry on specific HTTP status codes
        if (error.status) {
          const retryableStatuses = [408, 429, 500, 502, 503, 504];
          return retryableStatuses.includes(error.status);
        }
        
        return false;
      }
    };

    const operation = async (): Promise<T> => {
      const response = await request();
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }
      
      return response.json();
    };

    return this.executeNetworkAware(operation, httpConfig, operationId);
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.multiplier, attempt - 1);
    
    // Apply max delay cap
    delay = Math.min(delay, config.maxDelay);
    
    // Apply jitter
    if (config.jitter) {
      const jitterAmount = delay * config.jitterRange;
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
      delay = Math.max(0, delay + jitterOffset);
    }
    
    return Math.round(delay);
  }

  /**
   * Promise-based delay with abort signal support
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Delay aborted'));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);
      
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Delay aborted'));
      };
      
      signal?.addEventListener('abort', abortHandler, { once: true });
    });
  }

  /**
   * Get or create circuit breaker for operation
   */
  private getOrCreateCircuitBreaker(
    operationId: string, 
    config: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(operationId)) {
      const finalConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
      this.circuitBreakers.set(operationId, new CircuitBreaker(finalConfig));
    }
    return this.circuitBreakers.get(operationId)!;
  }

  /**
   * Cancel active retry operation
   */
  cancelOperation(operationId: string): boolean {
    const controller = this.activeRetries.get(operationId);
    if (controller) {
      controller.abort();
      this.activeRetries.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(operationId: string): CircuitBreakerState | null {
    const circuitBreaker = this.circuitBreakers.get(operationId);
    return circuitBreaker ? circuitBreaker.getState() : null;
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(operationId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(operationId);
    if (circuitBreaker) {
      circuitBreaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Get active retry operations
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeRetries.keys());
  }

  /**
   * Cancel all active operations
   */
  cancelAllOperations(): void {
    for (const [operationId, controller] of this.activeRetries) {
      controller.abort();
    }
    this.activeRetries.clear();
  }

  /**
   * Create a retry wrapper for async functions
   */
  createRetryWrapper<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    config: Partial<NetworkAwareRetryConfig> = {},
    operationId?: string
  ): (...args: TArgs) => Promise<RetryResult<TReturn>> {
    return async (...args: TArgs) => {
      const operation = () => fn(...args);
      return this.executeNetworkAware(operation, config, operationId);
    };
  }
}

// Convenience functions and exports
export const retryManager = RetryManager.getInstance();

// Utility functions for common use cases
export const withRetry = <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> => {
  return retryManager.execute(operation, config);
};

export const withNetworkAwareRetry = <T>(
  operation: () => Promise<T>,
  config: Partial<NetworkAwareRetryConfig> = {}
): Promise<RetryResult<T>> => {
  return retryManager.executeNetworkAware(operation, config);
};

export const withCircuitBreaker = <T>(
  operation: () => Promise<T>,
  operationId: string,
  config: Partial<RetryConfig> = {},
  circuitConfig: Partial<CircuitBreakerConfig> = {}
): Promise<RetryResult<T>> => {
  return retryManager.executeWithCircuitBreaker(operation, operationId, config, circuitConfig);
};

export const createRetryableHttpClient = (baseConfig: Partial<NetworkAwareRetryConfig> = {}) => {
  return {
    get: <T>(url: string, config: Partial<NetworkAwareRetryConfig> = {}) =>
      retryManager.executeHttpRequest<T>(
        () => fetch(url, { method: 'GET' }),
        { ...baseConfig, ...config },
        `GET:${url}`
      ),
    
    post: <T>(url: string, body: any, config: Partial<NetworkAwareRetryConfig> = {}) =>
      retryManager.executeHttpRequest<T>(
        () => fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }),
        { ...baseConfig, ...config },
        `POST:${url}`
      ),
    
    put: <T>(url: string, body: any, config: Partial<NetworkAwareRetryConfig> = {}) =>
      retryManager.executeHttpRequest<T>(
        () => fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }),
        { ...baseConfig, ...config },
        `PUT:${url}`
      ),
    
    delete: <T>(url: string, config: Partial<NetworkAwareRetryConfig> = {}) =>
      retryManager.executeHttpRequest<T>(
        () => fetch(url, { method: 'DELETE' }),
        { ...baseConfig, ...config },
        `DELETE:${url}`
      )
  };
};

export default retryManager;