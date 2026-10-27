import type React from 'react'
import { lazy, Suspense } from 'react'
import { Form } from 'antd'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
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
  const { t } = useI18nNamespaces(['configNetwork'])
  return (
    <>
      <Form.Item
        label={t('ConfigNetworkPage.modelScript')}
        name="script"
        rules={[{ required: true, whitespace: true, message: t('ConfigNetworkPage.modelScriptRequired') }]}
        extra={t('ConfigNetworkPage.modelScriptHelp')}
      >
        <ScriptEditor disabled={disabled} />
      </Form.Item>
    </>
  )
}
