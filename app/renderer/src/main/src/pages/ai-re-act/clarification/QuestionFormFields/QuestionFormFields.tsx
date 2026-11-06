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
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { PlusOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { QuestionForm } from '../../interactive-ui/types'
import { matchesSchema } from '../../interactive-ui/validate'
import { formFieldErrors } from '../formValidation'
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

function isStringList(schema: RJSFSchema) {
  return schema.type === 'array' && jsonEnumValues((schema.items as RJSFSchema | undefined)?.enum).length === 0
}

export function filledStrings(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : []
}

export function stringListIssue(value: unknown, min: number, unique: boolean) {
  const filled = filledStrings(value)
  if (filled.length < min) return 'emptyItem'
  if (unique && new Set(filled).size !== filled.length) return 'duplicateItem'
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
  const stringList = isStringList(schema)
  if (required && schema.type === 'array' && !stringList) {
    rules.push({ type: 'array', min: schema.minItems || 1 })
  } else if (required && schema.type !== 'boolean' && schema.type !== 'array') {
    rules.push({ required: true })
  }
  if (schema.minLength !== undefined) rules.push({ type: 'string', min: schema.minLength })
  if (schema.maxLength !== undefined) rules.push({ type: 'string', max: schema.maxLength })
  if (schema.minimum !== undefined) rules.push({ type: 'number', min: schema.minimum })
  if (schema.maximum !== undefined) rules.push({ type: 'number', max: schema.maximum })
  if (!stringList && schema.minItems !== undefined && !(required && schema.type === 'array')) {
    rules.push({ type: 'array', min: schema.minItems })
  }
  if (!stringList && schema.maxItems !== undefined) rules.push({ type: 'array', max: schema.maxItems })
  return rules
}

function initialValues(form: QuestionForm, values?: Record<string, unknown>) {
  const next: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(form.schema.properties || {}) as [string, RJSFSchema][]) {
    if (values && Object.hasOwn(values, key)) next[key] = values[key]
    else if (form.initial && Object.hasOwn(form.initial, key)) next[key] = form.initial[key]
    else if (schema.default !== undefined) next[key] = schema.default
    else if (schema.type === 'array') next[key] = []
    else if (schema.type === 'boolean' && matchesSchema(schema, false)) next[key] = false
  }
  return next
}

function emptyNumber(schema: RJSFSchema, value: unknown) {
  if (schema.type !== 'number' && schema.type !== 'integer') return false
  return value === '' || value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
}

export function sanitizeFormValues(form: QuestionForm, raw: Record<string, unknown>) {
  const properties = (form.schema.properties || {}) as Record<string, RJSFSchema>
  const required = new Set((form.schema.required || []) as string[])
  const next: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(properties)) {
    let value = raw[key]
    if (isStringList(schema)) value = filledStrings(value)
    if (emptyNumber(schema, value)) {
      if (required.has(key)) next[key] = value
      continue
    }
    if (value === undefined) continue
    if (!required.has(key) && !matchesSchema(schema, value)) continue
    next[key] = value
  }
  return next
}

function StringList({
  id,
  label,
  disabled,
  maxItems,
  minItems,
  value,
  onChange,
}: {
  id: string
  label: string
  disabled?: boolean
  maxItems?: number
  minItems?: number
  value?: unknown[]
  onChange?: (value: string[]) => void
}) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const items = Array.isArray(value) && value.length ? value.map(String) : ['']
  const cap = maxItems ?? 30
  const floor = minItems || 0
  const update = (next: string[]) => onChange?.(next.length ? next : [''])
  return (
    <div id={id} role="group" aria-label={label} className={styles.stringList}>
      {items.map((item, index) => (
        <div key={index} className={styles.stringListRow}>
          <YakitInput
            value={item}
            disabled={disabled}
            wrapperClassName={styles.control}
            onChange={(event) => {
              const next = [...items]
              next[index] = event.target.value
              update(next)
            }}
          />
          <YakitButton
            type="text"
            colors="danger"
            icon={<TrashOutlined color="currentColor" />}
            aria-label={t('InteractiveUI.removeItem')}
            disabled={disabled || items.length <= Math.max(floor, 1)}
            onClick={() => update(items.filter((_, current) => current !== index))}
          />
        </div>
      ))}
      {items.length < cap ? (
        <div className={styles.stringListRow}>
          <button
            type="button"
            className={styles.stringListAdd}
            disabled={disabled}
            onClick={() => update([...items, ''])}
          >
            <PlusOutlined color="currentColor" />
            {t('InteractiveUI.addItem')}
          </button>
        </div>
      ) : null}
    </div>
  )
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
    if (options.length) {
      return <EnumCheckboxes id={id} label={title} options={options} disabled={disabled} {...(rest as object)} />
    }
    return (
      <StringList
        id={id}
        label={title}
        disabled={disabled}
        maxItems={schema.maxItems}
        minItems={schema.minItems}
        {...(rest as object)}
      />
    )
  }
  if (schema.enum) {
    const options = jsonEnumValues(schema.enum).filter(
      (option): option is string | number => typeof option !== 'boolean',
    )
    return (
      <YakitSelect<string | number>
        id={id}
        disabled={disabled}
        wrapperStyle={{ width: '100%' }}
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
  return <YakitInput id={id} disabled={disabled} wrapperClassName={styles.control} {...(rest as object)} />
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
  const { t } = useI18nNamespaces(['aiAgent'])
  const id = fieldId(instanceId, fieldKey)
  const title = schema.title || fieldKey
  const rules = fieldRules(schema, required)
  if (isStringList(schema)) {
    const min = schema.minItems ?? (required ? 1 : 0)
    rules.push({
      validator: async (_, value: unknown) => {
        if (stringListIssue(value, min, false) === 'emptyItem') return Promise.reject()
      },
      message: t('InteractiveUI.emptyItem'),
    })
    if (schema.uniqueItems !== false) {
      rules.push({
        validator: async (_, value: unknown) => {
          if (stringListIssue(value, 0, true) === 'duplicateItem') return Promise.reject()
        },
        message: t('InteractiveUI.duplicateItem'),
      })
    }
  } else if (schema.type === 'array' && schema.uniqueItems !== false) {
    rules.push({
      validator: async (_, value: unknown) => {
        const items = Array.isArray(value) ? value.map(String) : []
        if (new Set(items).size !== items.length) return Promise.reject()
      },
      message: t('InteractiveUI.duplicateItem'),
    })
  }
  if (schema.type === 'boolean') {
    return (
      <Form.Item name={fieldKey} valuePropName="checked" colon={false} required={false} rules={rules}>
        <BooleanRow id={id} title={title} description={schema.description} disabled={disabled} />
      </Form.Item>
    )
  }
  return (
    <Form.Item
      name={fieldKey}
      layout="vertical"
      htmlFor={id}
      required={false}
      colon={false}
      label={
        <>
          {title}
          {required ? <span className={styles.requiredMark}> *</span> : null}
        </>
      }
      rules={rules}
      validateFirst
      messageVariables={{ label: title }}
      extra={rules.length ? undefined : schema.description}
    >
      <FieldControl id={id} schema={schema} title={title} disabled={disabled} />
    </Form.Item>
  )
}

function BooleanRow({
  id,
  title,
  description,
  disabled,
  ...rest
}: {
  id: string
  title: string
  description?: string
  disabled: boolean
  [key: string]: unknown
}) {
  return (
    <label className={styles.switchRow} htmlFor={id}>
      <span className={styles.switchCopy}>
        <span className={styles.switchTitle}>{title}</span>
        {description ? <span className={styles.switchDesc}>{description}</span> : null}
      </span>
      <YakitSwitch id={id} disabled={disabled} aria-label={title} {...(rest as object)} />
    </label>
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
  const [antdForm] = Form.useForm()
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
          form={antdForm}
          layout="vertical"
          colon={false}
          disabled={disabled}
          initialValues={initialValues(form, values)}
          onValuesChange={(_, all) => {
            if (!disabled) onChange(all)
          }}
          onFinish={(all) => {
            if (disabled) return
            const next = sanitizeFormValues(form, all)
            const errors = formFieldErrors(form.schema, next)
            if (errors.length) {
              antdForm.setFields(errors)
              return
            }
            onSubmit(next)
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
