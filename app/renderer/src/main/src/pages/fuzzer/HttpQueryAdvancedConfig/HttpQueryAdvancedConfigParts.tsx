import React from 'react'
import { Form } from 'antd'
import { ResizerIcon } from '@yakit-libs/yakit-ui-icons/oldicon'
import { AutoTextarea } from '../components/AutoTextarea/AutoTextarea'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './HttpQueryAdvancedConfig.module.scss'

interface SetVariableItemProps {
  name: number
}

export const SetVariableItem: React.FC<SetVariableItemProps> = React.memo((props) => {
  const { name } = props
  const { t } = useI18nNamespaces(['webFuzzer'])

  return (
    <div className={styles['variable-item']}>
      <Form.Item name={[name, 'Key']} noStyle wrapperCol={{ span: 24 }}>
        <input placeholder={t('SetVariableItem.variableName')} className={styles['variable-item-input']} />
      </Form.Item>

      <div className={styles['variable-item-textarea-body']}>
        <Form.Item name={[name, 'Value']} noStyle wrapperCol={{ span: 24 }}>
          <AutoTextarea className={styles['variable-item-textarea']} placeholder={t('SetVariableItem.variableValue')} />
        </Form.Item>
        <ResizerIcon className={styles['resizer-icon']} />
      </div>
    </div>
  )
})
