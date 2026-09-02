import type React from 'react'
import { memo, useState } from 'react'
import { Form } from 'antd'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { apiGetUserSearch } from '@/pages/notepadManage/NotepadShareModal/utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { SetHTTPFlowTestersRequest } from './HTTPFlowMark.constants'
import { apiSetHTTPFlowTesters } from './HTTPFlowMark.utils'
import styles from './HTTPFlowMark.module.scss'

export interface FlowTestersFormProps {
  ids: number[]
  onClose?: () => void
  onSuccess?: (payload: SetHTTPFlowTestersRequest) => void
}

export const FlowTestersForm: React.FC<FlowTestersFormProps> = memo((props) => {
  const { ids, onClose, onSuccess } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi'])
  const [form] = Form.useForm()
  const [testerOptions, setTesterOptions] = useState<{ label: string; value: string }[]>([])

  const onSearchTester = useDebounceFn(
    (keywords: string) => {
      if (!keywords?.trim()) return
      apiGetUserSearch({ keywords: keywords.trim() })
        .then((res) => {
          setTesterOptions(
            (res?.data || []).map((item) => ({
              label: item.name,
              value: item.name,
            })),
          )
        })
        .catch(() => {})
    },
    { wait: 300 },
  ).run

  const onFinish = useMemoizedFn((value: { Testers?: string[] }) => {
    const testers = (value.Testers || []).map((item) => String(item).trim()).filter(Boolean)
    if (testers.length === 0) return
    const payload: SetHTTPFlowTestersRequest = { Ids: ids, Testers: testers }
    apiSetHTTPFlowTesters(payload).then(() => {
      onSuccess?.(payload)
      onClose?.()
    })
  })

  return (
    <div className={styles['flow-testers-form']}>
      <Form form={form} onFinish={onFinish} layout="horizontal">
        <Form.Item
          label={t('HTTPFlowTable.testers')}
          name="Testers"
          rules={[{ required: true, message: t('HTTPFlowTable.selectTesters') }]}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 19 }}
        >
          <YakitSelect
            mode="tags"
            allowClear
            showSearch
            placeholder={t('HTTPFlowTable.searchTesters')}
            filterOption={false}
            onSearch={onSearchTester}
          >
            {testerOptions.map((item) => (
              <YakitSelect.Option key={item.value} value={item.value}>
                {item.label}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <div className={styles['flow-testers-form-btns']}>
          <YakitButton htmlType="submit">{t('YakitButton.ok')}</YakitButton>
        </div>
      </Form>
    </div>
  )
})
