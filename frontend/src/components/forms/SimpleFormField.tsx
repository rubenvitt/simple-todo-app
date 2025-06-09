import React from 'react';
import { Form, Input, Select } from 'antd';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import type { InputProps, SelectProps } from 'antd';

const { TextArea, Password } = Input;
const { Option } = Select;

// Base props for all form fields
interface BaseFormFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label?: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

// Text input field
interface TextFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'text' | 'email' | 'url';
  inputProps?: InputProps;
}

// Password field
interface PasswordFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'password';
  inputProps?: InputProps;
}

// Textarea field
interface TextAreaFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'textarea';
  inputProps?: Omit<InputProps, 'onChange'>;
  rows?: number;
}

// Select field
interface SelectFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'select';
  selectProps?: SelectProps;
  options: Array<{ label: React.ReactNode; value: any; disabled?: boolean }>;
  mode?: 'multiple' | 'tags';
}

// Union type for all form field props
type SimpleFormFieldProps<TFieldValues extends FieldValues> =
  | TextFieldProps<TFieldValues>
  | PasswordFieldProps<TFieldValues>
  | TextAreaFieldProps<TFieldValues>
  | SelectFieldProps<TFieldValues>;

/**
 * Simplified form field component that integrates React Hook Form with Ant Design
 * Supports basic input types with proper validation and error handling
 */
export function SimpleFormField<TFieldValues extends FieldValues>(
  props: SimpleFormFieldProps<TFieldValues>
) {
  const {
    name,
    control,
    label,
    required,
    help,
    className,
    disabled,
    type,
  } = props;

  const renderInput = (value: any, onChange: (value: any) => void, error?: string) => {
    const hasError = !!error;
    const status = hasError ? 'error' : undefined;

    switch (type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <Input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            {...(props as TextFieldProps<TFieldValues>).inputProps}
          />
        );

      case 'password':
        return (
          <Password
            value={value}
            onChange={(e) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            {...(props as PasswordFieldProps<TFieldValues>).inputProps}
          />
        );

      case 'textarea': {
        const textareaProps = props as TextAreaFieldProps<TFieldValues>;
        return (
          <TextArea
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            rows={textareaProps.rows || 4}
          />
        );
      }

      case 'select': {
        const selectProps = props as SelectFieldProps<TFieldValues>;
        return (
          <Select
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            mode={selectProps.mode}
            style={{ width: '100%' }}
            {...selectProps.selectProps}
          >
            {selectProps.options.map((option) => (
              <Option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </Option>
            ))}
          </Select>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          required={required}
          help={fieldState.error?.message || help}
          className={className}
          validateStatus={fieldState.error ? 'error' : undefined}
          hasFeedback={!!fieldState.error}
        >
          {renderInput(field.value, field.onChange, fieldState.error?.message)}
        </Form.Item>
      )}
    />
  );
}

// Export prop types for external use
export type {
  SimpleFormFieldProps,
  TextFieldProps,
  PasswordFieldProps,
  TextAreaFieldProps,
  SelectFieldProps,
};