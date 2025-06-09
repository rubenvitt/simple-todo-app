import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { UseFormProps, Path, FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { message } from 'antd';

/**
 * Enhanced form configuration hook that integrates React Hook Form with Zod validation
 * and provides consistent error handling and form submission patterns
 */
export function useFormConfig<TSchema extends z.ZodType<any, any, any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>
) {
  type FormData = z.infer<TSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    ...options,
  });

  /**
   * Enhanced submit handler with error handling and loading states
   */
  const createSubmitHandler = (
    onSubmit: (data: FormData) => Promise<void> | void,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: FormData) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    return form.handleSubmit(async (data: FormData) => {
      try {
        await onSubmit(data);
        
        if (options?.successMessage) {
          message.success(options.successMessage);
        }
        
        options?.onSuccess?.(data);
      } catch (error) {
        console.error('Form submission error:', error);
        
        // Handle different types of errors
        if (error instanceof Error) {
          const errorMessage = options?.errorMessage || error.message || 'An error occurred';
          message.error(errorMessage);
          options?.onError?.(error);
        } else {
          message.error(options?.errorMessage || 'An unexpected error occurred');
        }
      }
    });
  };

  /**
   * Helper to get field error message
   */
  const getFieldError = (fieldName: Path<FormData>) => {
    const fieldError = form.formState.errors[fieldName];
    return fieldError?.message as string | undefined;
  };

  /**
   * Helper to check if field has error
   */
  const hasFieldError = (fieldName: Path<FormData>) => {
    return !!form.formState.errors[fieldName];
  };

  /**
   * Helper to get field validation status for Ant Design
   */
  const getFieldStatus = (fieldName: Path<FormData>): '' | 'error' | 'warning' | 'success' | 'validating' => {
    const fieldError = form.formState.errors[fieldName];
    const fieldState = form.getFieldState(fieldName);
    
    if (fieldError) return 'error';
    if (fieldState.isDirty && !fieldError) return 'success';
    return '';
  };

  /**
   * Reset form with optional new default values
   */
  const resetForm = (values?: Partial<FormData>) => {
    form.reset(values);
  };

  /**
   * Set form field errors (useful for server-side validation errors)
   */
  const setFormErrors = (errors: Record<string, string>) => {
    Object.entries(errors).forEach(([field, message]) => {
      form.setError(field as Path<FormData>, {
        type: 'server',
        message,
      });
    });
  };

  return {
    ...form,
    createSubmitHandler,
    getFieldError,
    hasFieldError,
    getFieldStatus,
    resetForm,
    setFormErrors,
    // Expose commonly used form state
    isValid: form.formState.isValid,
    isDirty: form.formState.isDirty,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  };
}

/**
 * Type-safe helper to create form field props for Ant Design components
 */
export function createFieldProps<TFormData extends FieldValues>(
  form: ReturnType<typeof useFormConfig<any>>,
  fieldName: Path<TFormData>,
  options?: {
    label?: string;
    placeholder?: string;
    required?: boolean;
  }
) {
  return {
    ...form.register(fieldName),
    status: form.getFieldStatus(fieldName),
    help: form.getFieldError(fieldName),
    validateStatus: form.hasFieldError(fieldName) ? 'error' : undefined,
    hasFeedback: true,
    label: options?.label,
    placeholder: options?.placeholder,
    required: options?.required,
  };
}