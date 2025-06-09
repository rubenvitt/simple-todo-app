import { message } from 'antd';
import type { UseFormSetError, Path, FieldValues } from 'react-hook-form';

/**
 * Common API error response structure
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, string[]>;
}

/**
 * Network/HTTP error types
 */
export interface NetworkError {
  name: string;
  message: string;
  status?: number;
  response?: {
    data?: ApiError;
    status: number;
    statusText: string;
  };
}

/**
 * Validation error mapping utilities
 */
export class FormErrorHandler {
  /**
   * Handle API errors and map them to form fields
   */
  static handleApiError<TFieldValues extends FieldValues>(
    error: NetworkError | ApiError,
    setError: UseFormSetError<TFieldValues>,
    options?: {
      showGeneralError?: boolean;
      fieldMapping?: Record<string, Path<TFieldValues>>;
      fallbackMessage?: string;
    }
  ) {
    const { showGeneralError = true, fieldMapping = {}, fallbackMessage = 'An error occurred' } = options || {};

    // Handle network errors
    if ('response' in error && error.response?.data) {
      const apiError = error.response.data;
      this.processApiError(apiError, setError, { showGeneralError, fieldMapping, fallbackMessage });
    } 
    // Handle direct API errors
    else if ('statusCode' in error) {
      this.processApiError(error, setError, { showGeneralError, fieldMapping, fallbackMessage });
    }
    // Handle generic errors
    else {
      if (showGeneralError) {
        message.error(error.message || fallbackMessage);
      }
    }
  }

  /**
   * Process API error response and set form errors
   */
  private static processApiError<TFieldValues extends FieldValues>(
    apiError: ApiError,
    setError: UseFormSetError<TFieldValues>,
    options: {
      showGeneralError: boolean;
      fieldMapping: Record<string, Path<TFieldValues>>;
      fallbackMessage: string;
    }
  ) {
    const { showGeneralError, fieldMapping, fallbackMessage } = options;

    // Handle validation errors with field details
    if (apiError.details && typeof apiError.details === 'object') {
      Object.entries(apiError.details).forEach(([field, messages]) => {
        const formField = fieldMapping[field] || (field as Path<TFieldValues>);
        const errorMessage = Array.isArray(messages) ? messages[0] : messages;
        
        setError(formField, {
          type: 'server',
          message: errorMessage,
        });
      });
    }
    // Handle general form error
    else if (showGeneralError) {
      message.error(apiError.message || fallbackMessage);
    }
  }

  /**
   * Clear all form errors
   */
  static clearFormErrors<TFieldValues extends FieldValues>(
    clearErrors: (name?: Path<TFieldValues> | Path<TFieldValues>[]) => void
  ) {
    clearErrors();
  }

  /**
   * Set custom validation error on specific field
   */
  static setFieldError<TFieldValues extends FieldValues>(
    fieldName: Path<TFieldValues>,
    message: string,
    setError: UseFormSetError<TFieldValues>
  ) {
    setError(fieldName, {
      type: 'custom',
      message,
    });
  }

  /**
   * Validate and show client-side error messages
   */
  static validateField<TFieldValues extends FieldValues>(
    fieldName: Path<TFieldValues>,
    value: any,
    validationRules: Array<{
      condition: (value: any) => boolean;
      message: string;
    }>,
    setError: UseFormSetError<TFieldValues>
  ): boolean {
    for (const rule of validationRules) {
      if (!rule.condition(value)) {
        this.setFieldError(fieldName, rule.message, setError);
        return false;
      }
    }
    return true;
  }

  /**
   * Handle async validation errors
   */
  static async handleAsyncValidation<TFieldValues extends FieldValues>(
    fieldName: Path<TFieldValues>,
    validationFn: () => Promise<boolean>,
    errorMessage: string,
    setError: UseFormSetError<TFieldValues>
  ): Promise<boolean> {
    try {
      const isValid = await validationFn();
      if (!isValid) {
        this.setFieldError(fieldName, errorMessage, setError);
      }
      return isValid;
    } catch (error) {
      this.setFieldError(fieldName, errorMessage, setError);
      return false;
    }
  }
}

/**
 * Common validation error messages
 */
export const ValidationMessages = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must not exceed ${max} characters`,
  passwordMismatch: 'Passwords do not match',
  invalidFormat: (field: string) => `Please enter a valid ${field.toLowerCase()}`,
  futureDate: 'Date cannot be in the past',
  pastDate: 'Date cannot be in the future',
  uniqueValue: (field: string) => `This ${field.toLowerCase()} is already taken`,
  numeric: (field: string) => `${field} must be a number`,
  positive: (field: string) => `${field} must be positive`,
  range: (field: string, min: number, max: number) => 
    `${field} must be between ${min} and ${max}`,
} as const;

/**
 * Helper for creating field mapping for consistent error handling
 */
export function createFieldMapping<TFieldValues extends FieldValues>(
  mapping: Record<string, keyof TFieldValues>
): Record<string, Path<TFieldValues>> {
  return mapping as Record<string, Path<TFieldValues>>;
}

/**
 * Debounced async validation helper
 */
export function createDebouncedValidator<T>(
  validationFn: (value: T) => Promise<boolean>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  
  return (value: T): Promise<boolean> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const result = await validationFn(value);
          resolve(result);
        } catch {
          resolve(false);
        }
      }, delay);
    });
  };
}