import type { RegistryWidgetsType, WidgetProps } from '@rjsf/utils'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import styles from './interactive.module.scss'

// The catalog only permits these primitive fields. All controls use the same
// Yakit components as JsonFormWrapper; model-provided widgets remain forbidden.
function TextWidget(props: WidgetProps) {
  if (props.schema.type === 'number' || props.schema.type === 'integer') return <NumberWidget {...props} />
  const { id, value, disabled, readonly, onChange, placeholder, required } = props
  return (
    <YakitInput
      id={id}
      value={value ?? ''}
      disabled={disabled || readonly}
      placeholder={placeholder}
      required={required}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
function NumberWidget({ id, value, disabled, readonly, onChange, schema }: WidgetProps) {
  return (
    <YakitInputNumber
      id={id}
      value={value}
      disabled={disabled || readonly}
      style={{ width: '100%' }}
      min={schema.minimum}
      max={schema.maximum}
      precision={schema.type === 'integer' ? 0 : undefined}
      onChange={(next) => onChange(next ?? undefined)}
    />
  )
}
function SelectWidget({ id, value, disabled, readonly, onChange, options, multiple }: WidgetProps) {
  const choices = options.enumOptions || []
  const selected = multiple
    ? choices.flatMap((option, index) => ((value || []).includes(option.value) ? [String(index)] : []))
    : choices.findIndex((option) => option.value === value)
  return (
    <YakitSelect
      id={id}
      disabled={disabled || readonly}
      style={{ width: '100%' }}
      mode={multiple ? 'multiple' : undefined}
      value={Array.isArray(selected) ? selected : selected < 0 ? undefined : String(selected)}
      options={choices.map((option, index) => ({ label: option.label, value: String(index) }))}
      onChange={(next) =>
        onChange(Array.isArray(next) ? next.map((index) => choices[Number(index)].value) : choices[Number(next)]?.value)
      }
    />
  )
}
function CheckboxWidget({ id, value, disabled, readonly, onChange, label }: WidgetProps) {
  return (
    <YakitCheckbox
      id={id}
      checked={!!value}
      disabled={disabled || readonly}
      onChange={(event) => onChange(event.target.checked)}
    >
      {label}
    </YakitCheckbox>
  )
}
function CheckboxesWidget({ id, value, disabled, readonly, onChange, options, label }: WidgetProps) {
  return (
    <div id={id} role="group" aria-label={label} className={styles.checkboxes}>
      {(options.enumOptions || []).map((option, index) => (
        <YakitCheckbox
          key={index}
          checked={(value || []).includes(option.value)}
          disabled={disabled || readonly}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? [...(value || []), option.value]
                : (value || []).filter((entry: unknown) => entry !== option.value),
            )
          }
        >
          {option.label}
        </YakitCheckbox>
      ))}
    </div>
  )
}

export const formWidgets: RegistryWidgetsType = {
  TextWidget,
  UpDownWidget: NumberWidget,
  SelectWidget,
  CheckboxWidget,
  CheckboxesWidget,
}
