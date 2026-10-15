import React, { useEffect, useRef } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Checkbox,
  Radio,
  InputNumber,
  TimePicker,
} from 'antd';
import type {
  FormItemProps,
  InputProps,
  SelectProps,
  DatePickerProps,
  CheckboxProps,
  RadioGroupProps,
  InputNumberProps,
  TimePickerProps,
} from 'antd';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

const { TextArea, Password } = Input;
const { Option } = Select;

// Base props shared by all mobile form fields
interface BaseMobileFormFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label?: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  formItemProps?: Omit<FormItemProps, 'name' | 'label' | 'required' | 'help' | 'extra'>;
  autoFocus?: boolean;
  mobileOptimized?: boolean;
}

// Mobile-specific text field props
interface MobileTextFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'text' | 'email' | 'tel' | 'url' | 'search';
  inputProps?: InputProps;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'url' | 'search' | 'numeric' | 'decimal';
  pattern?: string;
}

// Mobile-specific number field props
interface MobileNumberFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'number';
  inputProps?: InputNumberProps;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: 'numeric' | 'decimal';
}

// Enhanced password field for mobile
interface MobilePasswordFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'password';
  inputProps?: InputProps;
  showPasswordStrength?: boolean;
}

// Mobile-optimized textarea
interface MobileTextAreaFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'textarea';
  inputProps?: InputProps;
  rows?: number;
  autoResize?: boolean;
  maxLength?: number;
}

// Mobile-friendly select
interface MobileSelectFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'select';
  selectProps?: SelectProps;
  options: Array<{ label: React.ReactNode; value: any; disabled?: boolean }>;
  mode?: 'multiple' | 'tags';
  searchable?: boolean;
}

// Mobile date/time pickers
interface MobileDateFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'date' | 'datetime' | 'time';
  dateProps?: DatePickerProps | TimePickerProps;
  format?: string;
  showNativeInput?: boolean;
}

// Mobile switch
interface MobileSwitchFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'switch';
  checkedChildren?: React.ReactNode;
  unCheckedChildren?: React.ReactNode;
  size?: 'small' | 'default';
}

// Mobile checkbox
interface MobileCheckboxFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'checkbox';
  checkboxProps?: CheckboxProps;
  children?: React.ReactNode;
}

// Mobile radio group
interface MobileRadioFieldProps<TFieldValues extends FieldValues> 
  extends BaseMobileFormFieldProps<TFieldValues> {
  type: 'radio';
  radioProps?: RadioGroupProps;
  options: Array<{ label: React.ReactNode; value: any; disabled?: boolean }>;
  optionType?: 'default' | 'button';
}

// Union type for all mobile form field props
type MobileFormFieldProps<TFieldValues extends FieldValues> =
  | MobileTextFieldProps<TFieldValues>
  | MobileNumberFieldProps<TFieldValues>
  | MobilePasswordFieldProps<TFieldValues>
  | MobileTextAreaFieldProps<TFieldValues>
  | MobileSelectFieldProps<TFieldValues>
  | MobileDateFieldProps<TFieldValues>
  | MobileSwitchFieldProps<TFieldValues>
  | MobileCheckboxFieldProps<TFieldValues>
  | MobileRadioFieldProps<TFieldValues>;

/**
 * Mobile-optimized form field component
 * Provides enhanced mobile input experience with proper keyboard types,
 * auto-focus management, and touch-friendly interactions
 */
export function MobileFormField<TFieldValues extends FieldValues>(
  props: MobileFormFieldProps<TFieldValues>
) {
  const {
    name,
    control,
    label,
    required,
    help,
    extra,
    className,
    disabled,
    formItemProps,
    type,
    autoFocus,
    mobileOptimized = true,
  } = props;

  const inputRef = useRef<any>(null);

  // Auto-focus management for mobile
  useEffect(() => {
    if (autoFocus && inputRef.current && mobileOptimized) {
      // Delay focus to avoid keyboard issues on mobile
      const timer = setTimeout(() => {
        inputRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, mobileOptimized]);

  // Get mobile-specific input attributes
  const getMobileInputAttributes = (fieldType: string, fieldProps: any) => {
    const baseAttributes: Record<string, any> = {
      ref: inputRef,
      spellCheck: false,
      autoCapitalize: 'off',
      autoCorrect: 'off',
    };

    switch (fieldType) {
      case 'email':
        return {
          ...baseAttributes,
          inputMode: 'email' as const,
          autoComplete: 'email',
          type: 'email',
        };
      case 'tel':
        return {
          ...baseAttributes,
          inputMode: 'tel' as const,
          autoComplete: 'tel',
          type: 'tel',
        };
      case 'url':
        return {
          ...baseAttributes,
          inputMode: 'url' as const,
          autoComplete: 'url',
          type: 'url',
          spellCheck: false,
        };
      case 'search':
        return {
          ...baseAttributes,
          inputMode: 'search' as const,
          autoComplete: 'off',
          type: 'search',
        };
      case 'number':
        return {
          ...baseAttributes,
          inputMode: (fieldProps as MobileNumberFieldProps<TFieldValues>).inputMode || 'numeric',
          pattern: '[0-9]*',
        };
      case 'password':
        return {
          ...baseAttributes,
          autoComplete: 'current-password',
          spellCheck: false,
          autoCapitalize: 'off',
        };
      case 'text':
      default:
        return {
          ...baseAttributes,
          inputMode: (fieldProps as MobileTextFieldProps<TFieldValues>).inputMode || 'text',
          autoComplete: (fieldProps as MobileTextFieldProps<TFieldValues>).autoComplete || 'off',
        };
    }
  };

  // Render the appropriate input component based on type
  const renderInput = (value: any, onChange: (value: any) => void, error?: string) => {
    const hasError = !!error;
    const status = hasError ? 'error' : undefined;
    const mobileAttributes = mobileOptimized ? getMobileInputAttributes(type, props) : {};

    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'search': {
        const textProps = props as MobileTextFieldProps<TFieldValues>;
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            size={mobileOptimized ? 'large' : 'middle'}
            {...mobileAttributes}
            {...textProps.inputProps}
          />
        );
      }

      case 'number': {
        const numberProps = props as MobileNumberFieldProps<TFieldValues>;
        return (
          <InputNumber
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            min={numberProps.min}
            max={numberProps.max}
            step={numberProps.step}
            size={mobileOptimized ? 'large' : 'middle'}
            style={{ width: '100%' }}
            {...mobileAttributes}
            {...numberProps.inputProps}
          />
        );
      }

      case 'password': {
        const passwordProps = props as MobilePasswordFieldProps<TFieldValues>;
        return (
          <Password
            value={value}
            onChange={(e) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            size={mobileOptimized ? 'large' : 'middle'}
            {...mobileAttributes}
            {...passwordProps.inputProps}
          />
        );
      }

      case 'textarea': {
        const textareaProps = props as MobileTextAreaFieldProps<TFieldValues>;
        return (
          <TextArea
            value={value}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            rows={textareaProps.rows || 4}
            maxLength={textareaProps.maxLength}
            showCount={!!textareaProps.maxLength}
            autoSize={textareaProps.autoResize ? { minRows: 2, maxRows: 8 } : false}
            size={mobileOptimized ? 'large' : 'middle'}
            style={{ fontSize: mobileOptimized ? '16px' : undefined }}
            {...textareaProps.inputProps}
          />
        );
      }

      case 'select': {
        const selectProps = props as MobileSelectFieldProps<TFieldValues>;
        return (
          <Select
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            mode={selectProps.mode}
            showSearch={selectProps.searchable}
            size={mobileOptimized ? 'large' : 'middle'}
            style={{ width: '100%' }}
            optionFilterProp={selectProps.searchable ? 'children' : undefined}
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

      case 'date': {
        const dateProps = props as MobileDateFieldProps<TFieldValues>;
        return (
          <DatePicker
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            size={mobileOptimized ? 'large' : 'middle'}
            style={{ width: '100%' }}
            format={dateProps.format}
            inputReadOnly={mobileOptimized} // Prevent keyboard on mobile
            {...dateProps.dateProps as DatePickerProps}
          />
        );
      }

      case 'datetime': {
        const dateProps = props as MobileDateFieldProps<TFieldValues>;
        return (
          <DatePicker
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            size={mobileOptimized ? 'large' : 'middle'}
            style={{ width: '100%' }}
            format={dateProps.format || 'YYYY-MM-DD HH:mm'}
            inputReadOnly={mobileOptimized}
            showTime
            {...dateProps.dateProps as DatePickerProps}
          />
        );
      }

      case 'time': {
        const timeProps = props as MobileDateFieldProps<TFieldValues>;
        return (
          <TimePicker
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            size={mobileOptimized ? 'large' : 'middle'}
            style={{ width: '100%' }}
            format={timeProps.format || 'HH:mm'}
            inputReadOnly={mobileOptimized}
            {...timeProps.dateProps as TimePickerProps}
          />
        );
      }

      case 'switch': {
        const switchProps = props as MobileSwitchFieldProps<TFieldValues>;
        return (
          <Switch
            checked={value}
            onChange={onChange}
            disabled={disabled}
            size={switchProps.size || (mobileOptimized ? 'default' : 'small')}
            checkedChildren={switchProps.checkedChildren}
            unCheckedChildren={switchProps.unCheckedChildren}
          />
        );
      }

      case 'checkbox': {
        const checkboxProps = props as MobileCheckboxFieldProps<TFieldValues>;
        return (
          <Checkbox
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            style={{ fontSize: mobileOptimized ? '16px' : undefined }}
            {...checkboxProps.checkboxProps}
          >
            {checkboxProps.children}
          </Checkbox>
        );
      }

      case 'radio': {
        const radioProps = props as MobileRadioFieldProps<TFieldValues>;
        return (
          <Radio.Group
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            optionType={radioProps.optionType}
            size={mobileOptimized ? 'large' : 'middle'}
            {...radioProps.radioProps}
          >
            {radioProps.options.map((option) => (
              <Radio 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled}
                style={{ 
                  fontSize: mobileOptimized ? '16px' : undefined,
                  padding: mobileOptimized ? '8px 0' : undefined 
                }}
              >
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
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
          extra={extra}
          className={`${className || ''} ${mobileOptimized ? 'mobile-form-item' : ''}`}
          validateStatus={fieldState.error ? 'error' : undefined}
          hasFeedback={!!fieldState.error}
          {...formItemProps}
        >
          {renderInput(field.value, field.onChange, fieldState.error?.message)}
        </Form.Item>
      )}
    />
  );
}

// Export prop types for external use
export type {
  MobileFormFieldProps,
  MobileTextFieldProps,
  MobileNumberFieldProps,
  MobilePasswordFieldProps,
  MobileTextAreaFieldProps,
  MobileSelectFieldProps,
  MobileDateFieldProps,
  MobileSwitchFieldProps,
  MobileCheckboxFieldProps,
  MobileRadioFieldProps,
};