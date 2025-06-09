import React from 'react';
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
  Slider,
  Rate,
  ColorPicker,
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
  SliderSingleProps,
  RateProps,
  ColorPickerProps,
} from 'antd';
import { Controller } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

const { TextArea, Password } = Input;
const { Option } = Select;

// Base props shared by all form fields
interface BaseFormFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label?: React.ReactNode;
  required?: boolean;
  help?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  formItemProps?: Omit<FormItemProps, 'name' | 'label' | 'required' | 'help' | 'extra'>;
}

// Specific field type props
interface TextFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'text' | 'email' | 'url';
  inputProps?: InputProps;
}

interface PasswordFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'password';
  inputProps?: InputProps;
}

interface TextAreaFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'textarea';
  inputProps?: InputProps;
  rows?: number;
}

interface NumberFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'number';
  inputProps?: InputNumberProps;
  min?: number;
  max?: number;
  step?: number;
}

interface SelectFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'select';
  selectProps?: SelectProps;
  options: Array<{ label: React.ReactNode; value: any; disabled?: boolean }>;
  mode?: 'multiple' | 'tags';
}

interface DateFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'date' | 'datetime' | 'time';
  dateProps?: DatePickerProps | TimePickerProps;
  format?: string;
}

interface SwitchFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'switch';
  checkedChildren?: React.ReactNode;
  unCheckedChildren?: React.ReactNode;
}

interface CheckboxFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'checkbox';
  checkboxProps?: CheckboxProps;
  children?: React.ReactNode;
}

interface RadioFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'radio';
  radioProps?: RadioGroupProps;
  options: Array<{ label: React.ReactNode; value: any; disabled?: boolean }>;
}

interface SliderFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'slider';
  sliderProps?: SliderSingleProps;
  min?: number;
  max?: number;
  step?: number;
}

interface RateFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'rate';
  rateProps?: RateProps;
  count?: number;
}

interface ColorFieldProps<TFieldValues extends FieldValues> 
  extends BaseFormFieldProps<TFieldValues> {
  type: 'color';
  colorProps?: ColorPickerProps;
}

// Union type for all possible form field props
type FormFieldProps<TFieldValues extends FieldValues> =
  | TextFieldProps<TFieldValues>
  | PasswordFieldProps<TFieldValues>
  | TextAreaFieldProps<TFieldValues>
  | NumberFieldProps<TFieldValues>
  | SelectFieldProps<TFieldValues>
  | DateFieldProps<TFieldValues>
  | SwitchFieldProps<TFieldValues>
  | CheckboxFieldProps<TFieldValues>
  | RadioFieldProps<TFieldValues>
  | SliderFieldProps<TFieldValues>
  | RateFieldProps<TFieldValues>
  | ColorFieldProps<TFieldValues>;

/**
 * Universal form field component that integrates React Hook Form with Ant Design
 * Supports all common input types with proper validation and error handling
 */
export function FormField<TFieldValues extends FieldValues>(
  props: FormFieldProps<TFieldValues>
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
  } = props;

  // Render the appropriate input component based on type
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
            onChange={(e) => onChange(e.target.value)}
            status={status}
            disabled={disabled}
            rows={textareaProps.rows || 4}
            placeholder={textareaProps.inputProps?.placeholder}
            maxLength={textareaProps.inputProps?.maxLength}
            allowClear={textareaProps.inputProps?.allowClear}
            className={textareaProps.inputProps?.className}
            style={textareaProps.inputProps?.style}
          />
        );
      }

      case 'number': {
        const numberProps = props as NumberFieldProps<TFieldValues>;
        return (
          <InputNumber
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            min={numberProps.min}
            max={numberProps.max}
            step={numberProps.step}
            style={{ width: '100%' }}
            {...numberProps.inputProps}
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

      case 'date':
        return (
          <DatePicker
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            style={{ width: '100%' }}
            format={(props as DateFieldProps<TFieldValues>).format}
            {...(props as DateFieldProps<TFieldValues>).dateProps as DatePickerProps}
          />
        );

      case 'datetime': {
        const dateProps = props as DateFieldProps<TFieldValues>;
        return (
          <DatePicker
            showTime
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            style={{ width: '100%' }}
            format={dateProps.format || 'YYYY-MM-DD HH:mm:ss'}
          />
        );
      }

      case 'time':
        return (
          <TimePicker
            value={value}
            onChange={onChange}
            status={status}
            disabled={disabled}
            style={{ width: '100%' }}
            format={(props as DateFieldProps<TFieldValues>).format}
            {...(props as DateFieldProps<TFieldValues>).dateProps as TimePickerProps}
          />
        );

      case 'switch': {
        const switchProps = props as SwitchFieldProps<TFieldValues>;
        return (
          <Switch
            checked={value}
            onChange={onChange}
            disabled={disabled}
            checkedChildren={switchProps.checkedChildren}
            unCheckedChildren={switchProps.unCheckedChildren}
          />
        );
      }

      case 'checkbox': {
        const checkboxProps = props as CheckboxFieldProps<TFieldValues>;
        return (
          <Checkbox
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            {...checkboxProps.checkboxProps}
          >
            {checkboxProps.children}
          </Checkbox>
        );
      }

      case 'radio': {
        const radioProps = props as RadioFieldProps<TFieldValues>;
        return (
          <Radio.Group
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            {...radioProps.radioProps}
          >
            {radioProps.options.map((option) => (
              <Radio key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </Radio>
            ))}
          </Radio.Group>
        );
      }

      case 'slider': {
        const sliderProps = props as SliderFieldProps<TFieldValues>;
        return (
          <Slider
            value={value}
            onChange={onChange}
            disabled={disabled}
            min={sliderProps.min}
            max={sliderProps.max}
            step={sliderProps.step}
            {...sliderProps.sliderProps}
          />
        );
      }

      case 'rate': {
        const rateProps = props as RateFieldProps<TFieldValues>;
        return (
          <Rate
            value={value}
            onChange={onChange}
            disabled={disabled}
            count={rateProps.count}
            {...rateProps.rateProps}
          />
        );
      }

      case 'color': {
        const colorProps = props as ColorFieldProps<TFieldValues>;
        return (
          <ColorPicker
            value={value}
            onChange={(color) => onChange(color.toHexString())}
            disabled={disabled}
            {...colorProps.colorProps}
          />
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
          className={className}
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
  FormFieldProps,
  TextFieldProps,
  PasswordFieldProps,
  TextAreaFieldProps,
  NumberFieldProps,
  SelectFieldProps,
  DateFieldProps,
  SwitchFieldProps,
  CheckboxFieldProps,
  RadioFieldProps,
  SliderFieldProps,
  RateFieldProps,
  ColorFieldProps,
};