import { useMemo } from 'react'
import { ConfigProvider, Form } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import zhTW from 'antd/locale/zh_TW'
import enUS from 'antd/locale/en_US'
import type { Locale } from 'antd/es/locale'
import type { Rule } from 'antd/es/form'
import type { RJSFSchema } from '@rjsf/utils'
import i18n from '@/i18n/i18n'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import type { QuestionForm } from '../../interactive-ui/types'
import styles from './QuestionFormFields.module.scss'

function fieldId(instanceId: string, key: string) {
  return `memfit-question-${encodeURIComponent(instanceId)}_${key}`
}

type JsonEnum = string | number | boolean

function jsonEnumValues(values: unknown[] | undefined): JsonEnum[] {
  return (values || []).filter(
    (value): value is JsonEnum => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
  )
}

function orderedKeys(form: QuestionForm) {
  const keys = Object.keys(form.schema.properties || {})
  const order = form.fieldOrder || []
  return [...order.filter((key) => keys.includes(key)), ...keys.filter((key) => !order.includes(key))]
}

function isCompactField(schema: RJSFSchema) {
  return schema.type === 'string' || schema.type === 'number' || schema.type === 'integer'
}

function groupFields(form: QuestionForm) {
  const rows: { compact: boolean; keys: string[] }[] = []
  for (const key of orderedKeys(form)) {
    const schema = (form.schema.properties || {})[key] as RJSFSchema
    const compact = isCompactField(schema)
    const last = rows[rows.length - 1]
    if (compact && last?.compact) last.keys.push(key)
    else rows.push({ compact, keys: [key] })
  }
  return rows
}

const antdLocales: Record<string, Locale> = {
  zh: zhCN,
  'zh-TW': zhTW,
  en: enUS,
}

function fieldRules(schema: RJSFSchema, required: boolean): Rule[] {
  const rules: Rule[] = []
  if (required && schema.type === 'array') {
    rules.push({ type: 'array', min: schema.minItems || 1 })
  } else if (required && schema.type !== 'boolean') {
    rules.push({ required: true })
  }
  if (schema.minLength !== undefined) rules.push({ type: 'string', min: schema.minLength })
  if (schema.maxLength !== undefined) rules.push({ type: 'string', max: schema.maxLength })
  if (schema.minimum !== undefined) rules.push({ type: 'number', min: schema.minimum })
  if (schema.maximum !== undefined) rules.push({ type: 'number', max: schema.maximum })
  if (schema.minItems !== undefined && !(required && schema.type === 'array')) {
    rules.push({ type: 'array', min: schema.minItems })
  }
  if (schema.maxItems !== undefined) rules.push({ type: 'array', max: schema.maxItems })
  return rules
}

function initialValues(form: QuestionForm, values?: Record<string, unknown>) {
  const next: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(form.schema.properties || {}) as [string, RJSFSchema][]) {
    if (values && Object.hasOwn(values, key)) next[key] = values[key]
    else if (form.initial && Object.hasOwn(form.initial, key)) next[key] = form.initial[key]
    else if (schema.default !== undefined) next[key] = schema.default
    else if (schema.type === 'array') next[key] = []
    else if (schema.type === 'boolean') next[key] = false
  }
  return next
}

function EnumCheckboxes({
  id,
  label,
  options,
  disabled,
  value,
  onChange,
}: {
  id: string
  label: string
  options: unknown[]
  disabled?: boolean
  value?: unknown[]
  onChange?: (value: unknown[]) => void
}) {
  const selected = value || []
  return (
    <div id={id} role="group" aria-label={label} className={styles.checkboxes}>
      {options.map((option, index) => (
        <YakitCheckbox
          key={index}
          checked={selected.includes(option)}
          disabled={disabled}
          onChange={(event) =>
            onChange?.(event.target.checked ? [...selected, option] : selected.filter((entry) => entry !== option))
          }
        >
          {String(option)}
        </YakitCheckbox>
      ))}
    </div>
  )
}

function FieldControl({
  id,
  schema,
  title,
  disabled,
  ...rest
}: {
  id: string
  schema: RJSFSchema
  title: string
  disabled: boolean
  [key: string]: unknown
}) {
  if (schema.type === 'boolean') {
    return <YakitSwitch id={id} disabled={disabled} aria-label={title} {...(rest as object)} />
  }
  if (schema.type === 'array') {
    const options = jsonEnumValues((schema.items as RJSFSchema | undefined)?.enum)
    return <EnumCheckboxes id={id} label={title} options={options} disabled={disabled} {...(rest as object)} />
  }
  if (schema.enum) {
    const options = jsonEnumValues(schema.enum).filter(
      (option): option is string | number => typeof option !== 'boolean',
    )
    return (
      <YakitSelect<string | number>
        id={id}
        disabled={disabled}
        style={{ width: '100%' }}
        options={options.map((option) => ({ label: String(option), value: option }))}
        {...(rest as object)}
      />
    )
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <YakitInputNumber
        id={id}
        disabled={disabled}
        style={{ width: '100%' }}
        min={schema.minimum}
        max={schema.maximum}
        precision={schema.type === 'integer' ? 0 : undefined}
        {...(rest as object)}
      />
    )
  }
  return <YakitInput id={id} disabled={disabled} {...(rest as object)} />
}

function FieldItem({
  fieldKey,
  schema,
  required,
  instanceId,
  disabled,
}: {
  fieldKey: string
  schema: RJSFSchema
  required: boolean
  instanceId: string
  disabled: boolean
}) {
  const id = fieldId(instanceId, fieldKey)
  const title = schema.title || fieldKey
  const rules = fieldRules(schema, required)
  if (schema.type === 'boolean') {
    return (
      <label className={styles.switchRow} htmlFor={id}>
        <span className={styles.switchCopy}>
          <span className={styles.switchTitle}>{title}</span>
          {schema.description ? <span className={styles.switchDesc}>{schema.description}</span> : null}
        </span>
        <Form.Item name={fieldKey} valuePropName="checked" noStyle>
          <FieldControl id={id} schema={schema} title={title} disabled={disabled} />
        </Form.Item>
      </label>
    )
  }
  return (
    <Form.Item
      name={fieldKey}
      layout="vertical"
      htmlFor={id}
      required={false}
      label={
        <>
          {title}
          {required ? <span className={styles.requiredMark}> *</span> : null}
        </>
      }
      colon
      labelCol={{ span: 24 }}
      wrapperCol={{ span: 24 }}
      rules={rules}
      validateFirst
      messageVariables={{ label: title }}
      extra={rules.length ? undefined : schema.description}
    >
      <FieldControl id={id} schema={schema} title={title} disabled={disabled} />
    </Form.Item>
  )
}

export function QuestionFormFields({
  form,
  values,
  disabled,
  instanceId,
  onChange,
  onSubmit,
}: {
  form: QuestionForm
  values?: Record<string, unknown>
  disabled: boolean
  instanceId: string
  onChange: (values: Record<string, unknown>) => void
  onSubmit: (values: Record<string, unknown>) => void
}) {
  const rows = useMemo(() => groupFields(form), [form])
  const requiredKeys = (form.schema.required || []) as string[]
  const properties = (form.schema.properties || {}) as Record<string, RJSFSchema>
  return (
    <div className={styles.form}>
      <div className={styles.toolbar}>
        <div>{form.title}</div>
        {form.schema.description ? <span className={styles.formSubtitle}>{form.schema.description}</span> : null}
      </div>
      <ConfigProvider locale={antdLocales[i18n.language] || zhCN}>
        <Form
          layout="vertical"
          disabled={disabled}
          initialValues={initialValues(form, values)}
          onValuesChange={(_, all) => {
            if (!disabled) onChange(all)
          }}
          onFinish={(all) => {
            if (!disabled) onSubmit(all)
          }}
        >
          <div className={styles.formFields}>
            {rows.map((row, index) => (
              <div key={index} className={row.compact ? styles.formRow : styles.formBlock}>
                {row.keys.map((key) => (
                  <div key={key} className={styles.formCell}>
                    <FieldItem
                      fieldKey={key}
                      schema={properties[key]}
                      required={requiredKeys.includes(key)}
                      instanceId={instanceId}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Form>
      </ConfigProvider>
    </div>
  )
}
