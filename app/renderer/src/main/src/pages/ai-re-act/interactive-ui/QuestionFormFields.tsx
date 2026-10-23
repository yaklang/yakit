import JsonForm from '@rjsf/antd'
import validator from '@rjsf/validator-ajv8'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { formWidgets } from './formWidgets'
import type { QuestionForm } from './types'
import styles from './interactive.module.scss'

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
  const { t } = useI18nNamespaces(['aiAgent'])
  const widgets = Object.fromEntries(
    Object.entries(form.schema.properties || {})
      .filter(([, field]: [string, any]) => field.type === 'array' && field.uniqueItems && field.items?.enum)
      .map(([key]) => [key, { 'ui:widget': 'checkboxes' }]),
  )
  return (
    <div className={styles.form}>
      <strong>{form.title}</strong>
      <JsonForm
        schema={form.schema}
        validator={validator}
        widgets={formWidgets}
        showErrorList={false}
        templates={{
          ButtonTemplates: {
            AddButton: ({ onClick, disabled }) => (
              <YakitButton type="outline2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.addItem')}
              </YakitButton>
            ),
            RemoveButton: ({ onClick, disabled }) => (
              <YakitButton type="text2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.removeItem')}
              </YakitButton>
            ),
            MoveUpButton: ({ onClick, disabled }) => (
              <YakitButton type="text2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.moveUp')}
              </YakitButton>
            ),
            MoveDownButton: ({ onClick, disabled }) => (
              <YakitButton type="text2" onClick={onClick} disabled={disabled}>
                {t('InteractiveUI.moveDown')}
              </YakitButton>
            ),
          },
        }}
        formData={values ?? form.initial ?? {}}
        idPrefix={`memfit-question-${encodeURIComponent(instanceId)}`}
        uiSchema={{
          ...widgets,
          'ui:submitButtonOptions': { norender: true },
          ...(form.fieldOrder ? { 'ui:order': [...form.fieldOrder, '*'] } : {}),
        }}
        disabled={disabled}
        omitExtraData
        liveOmit
        onChange={(event) => {
          if (!disabled) onChange(event.formData || {})
        }}
        onSubmit={(event) => {
          if (!disabled) onSubmit(event.formData || {})
        }}
      >
        <span />
      </JsonForm>
    </div>
  )
}
