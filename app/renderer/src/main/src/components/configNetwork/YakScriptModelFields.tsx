import React, { lazy, Suspense } from 'react'
import { Form } from 'antd'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { YakitInput } from '../yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '../yakitUI/YakitInputNumber/YakitInputNumber'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import qclawMockScript from './qclawMock.yak?raw'
import styles from './ConfigNetworkPage.module.scss'

const YakitEditor = lazy(() =>
  import('@/components/yakitUI/YakitEditor/YakitEditor').then((module) => ({ default: module.YakitEditor })),
)

// Form.Item 使用 value/onChange；编辑器使用 value/setValue，显式连接以确保保存的是当前代码。
const ScriptEditor: React.FC<{
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  id?: string
}> = ({ value, onChange, disabled, id }) => (
  <div id={id} className={styles['model-script-editor']}>
    <Suspense fallback={null}>
      <YakitEditor type="yak" value={value ?? ''} setValue={onChange} readOnly={disabled} noMiniMap />
    </Suspense>
  </div>
)

export const YakScriptModelFields: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  const form = Form.useFormInstance()
  const { t } = useI18nNamespaces(['configNetwork'])
  return (
    <>
      <Form.Item label={t('ConfigNetworkPage.scriptTemplate')}>
        <YakitButton
          type="outline1"
          disabled={disabled}
          onClick={() => {
            form.setFieldsValue({
              script: qclawMockScript,
              script_params: '{"cust_id":"memfit-local"}',
              script_timeout_seconds: 240,
              model: 'qclaw-mock',
              api_key: 'qclaw-local-test',
              api_key_id: undefined,
              base_url: 'http://127.0.0.1:18080',
              endpoint: '',
              enable_endpoint: false,
              proxy: '',
              Headers: [],
            })
          }}
        >
          {t('ConfigNetworkPage.loadQClawMock')}
        </YakitButton>
        <div className={styles['model-script-help']}>{t('ConfigNetworkPage.qclawMockHelp')}</div>
      </Form.Item>
      <Form.Item
        label={t('ConfigNetworkPage.modelScript')}
        name="script"
        rules={[{ required: true, whitespace: true, message: t('ConfigNetworkPage.modelScriptRequired') }]}
        extra={t('ConfigNetworkPage.modelScriptHelp')}
      >
        <ScriptEditor disabled={disabled} />
      </Form.Item>
      <Form.Item
        label={t('ConfigNetworkPage.scriptParams')}
        name="script_params"
        extra={t('ConfigNetworkPage.scriptParamsHelp')}
        rules={[
          {
            validator: async (_, value) => {
              if (!value?.trim()) return
              try {
                const parsed = JSON.parse(value)
                if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return
              } catch {}
              throw new Error(t('ConfigNetworkPage.scriptParamsInvalid'))
            },
          },
        ]}
      >
        <YakitInput.TextArea autoSize={{ minRows: 2, maxRows: 6 }} disabled={disabled} />
      </Form.Item>
      <Form.Item
        label={t('ConfigNetworkPage.scriptTimeout')}
        name="script_timeout_seconds"
        rules={[
          { required: true, type: 'number', min: 1, max: 3600, message: t('ConfigNetworkPage.scriptTimeoutInvalid') },
        ]}
      >
        <YakitInputNumber min={1} max={3600} precision={0} disabled={disabled} />
      </Form.Item>
    </>
  )
}
