import styles from './WebFuzzerAiTestTemplateModal.module.scss'

import React, { useEffect } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'

import { WebFuzzerAiTestTemplate } from '@/defaultConstants/webFuzzerAiTestTemplates'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const PROMPT_MAX_LENGTH = 800

export interface WebFuzzerAiTestTemplateModalProps {
  visible: boolean
  mode: 'add' | 'edit'
  initialValue?: WebFuzzerAiTestTemplate
  existingLabels: string[]
  onCancel: () => void
  onSubmit: (value: WebFuzzerAiTestTemplate) => void
}

export const WebFuzzerAiTestTemplateModal: React.FC<WebFuzzerAiTestTemplateModalProps> = React.memo((props) => {
  const { visible, mode, initialValue, existingLabels, onCancel, onSubmit } = props
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const [form] = Form.useForm<WebFuzzerAiTestTemplate>()

  const initialLabel = (initialValue?.label || '').trim()

  useEffect(() => {
    if (!visible) return
    form.resetFields()
    form.setFieldsValue({
      label: initialValue?.label || '',
      prompt: initialValue?.prompt || '',
    })
  }, [visible, initialValue, form])

  const handleOk = useMemoizedFn(async () => {
    try {
      const values = await form.validateFields()
      onSubmit({
        label: values.label.trim(),
        prompt: values.prompt.trim(),
      })
    } catch (error) {}
  })

  return (
    <YakitModal
      visible={visible}
      title={mode === 'add' ? t('WebFuzzerAiTestTemplate.addTitle') : t('WebFuzzerAiTestTemplate.editTitle')}
      width={560}
      onCancel={onCancel}
      okText={t('YakitButton.save')}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical" className={styles['web-fuzzer-ai-test-template-form']}>
        <Form.Item
          label={t('WebFuzzerAiTestTemplate.label')}
          name="label"
          validateTrigger={['onChange', 'onBlur']}
          rules={[
            { required: true, whitespace: true, message: t('WebFuzzerAiTestTemplate.labelRequired') },
            {
              validator: (_, value) => {
                const label = (value || '').trim()
                if (!label) return Promise.resolve()
                const duplicate = existingLabels.some((item) => item === label && item !== initialLabel)
                if (duplicate) {
                  return Promise.reject(t('WebFuzzerAiTestTemplate.labelDuplicate'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <YakitInput placeholder={t('WebFuzzerAiTestTemplate.labelPlaceholder')} maxLength={50} showCount />
        </Form.Item>
        <Form.Item
          label={t('WebFuzzerAiTestTemplate.prompt')}
          name="prompt"
          validateTrigger={['onChange', 'onBlur']}
          rules={[
            { required: true, whitespace: true, message: t('WebFuzzerAiTestTemplate.promptRequired') },
            {
              max: PROMPT_MAX_LENGTH,
              message: t('WebFuzzerAiTestTemplate.promptMaxLength', { max: PROMPT_MAX_LENGTH }),
            },
          ]}
        >
          <YakitInput.TextArea
            placeholder={t('WebFuzzerAiTestTemplate.promptPlaceholder')}
            maxLength={PROMPT_MAX_LENGTH}
            showCount
            autoSize={{ minRows: 8, maxRows: 16 }}
          />
        </Form.Item>
      </Form>
    </YakitModal>
  )
})

WebFuzzerAiTestTemplateModal.displayName = 'WebFuzzerAiTestTemplateModal'
