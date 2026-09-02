import type React from 'react'
import { memo } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { HTTPFlow } from './HTTPFlowTable.constants'
import {
  FLOW_DISPOSAL_STATUS_OPTIONS,
  FLOW_PROBLEM_TYPE_OPTIONS,
  FLOW_SEVERITY_OPTIONS,
  type SetHTTPFlowMarkRequest,
} from './HTTPFlowMark.constants'
import { apiSetHTTPFlowMark } from './HTTPFlowMark.utils'
import styles from './HTTPFlowMark.module.scss'

export interface FlowMarkEditFormProps {
  info?: any //暂时any HTTPFlow
  ids: number[]
  batch?: boolean
  onClose?: () => void
  onSuccess?: (payload: SetHTTPFlowMarkRequest) => void
}

export const FlowMarkEditForm: React.FC<FlowMarkEditFormProps> = memo((props) => {
  const { info, ids, batch, onClose, onSuccess } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi'])
  const [form] = Form.useForm()

  const onFinish = useMemoizedFn(
    (value: { ProblemType?: string; Severity?: string; DisposalStatus?: string; DisposalNote?: string }) => {
      const payload: SetHTTPFlowMarkRequest = { Ids: ids }
      if (batch) {
        if (value.ProblemType) payload.ProblemType = value.ProblemType
        if (value.Severity) payload.Severity = value.Severity
        if (value.DisposalStatus) payload.DisposalStatus = value.DisposalStatus
        if (value.DisposalNote?.trim()) payload.DisposalNote = value.DisposalNote.trim()
      } else {
        payload.ProblemType = value.ProblemType
        payload.Severity = value.Severity
        payload.DisposalStatus = value.DisposalStatus
        payload.DisposalNote = value.DisposalNote?.trim() || undefined
      }
      apiSetHTTPFlowMark(payload).then(() => {
        onSuccess?.(payload)
        onClose?.()
      })
    },
  )

  const layout = {
    labelCol: { span: 5 },
    wrapperCol: { span: 19 },
  }

  return (
    <div className={styles['flow-mark-edit-form']}>
      <Form
        {...layout}
        form={form}
        onFinish={onFinish}
        initialValues={
          batch
            ? {}
            : {
                ProblemType: info?.ProblemType,
                Severity: info?.Severity,
                DisposalStatus: info?.DisposalStatus,
                DisposalNote: info?.DisposalNote,
              }
        }
      >
        <Form.Item label={t('HTTPFlowTable.problemType')} name="ProblemType">
          <YakitSelect allowClear placeholder={t('HTTPFlowTable.selectProblemType')}>
            {FLOW_PROBLEM_TYPE_OPTIONS.map((item) => (
              <YakitSelect.Option key={item} value={item}>
                {item}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.severity')} name="Severity">
          <YakitSelect allowClear placeholder={t('HTTPFlowTable.selectSeverity')}>
            {FLOW_SEVERITY_OPTIONS.map((item) => (
              <YakitSelect.Option key={item} value={item}>
                {item}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.disposalStatus')} name="DisposalStatus">
          <YakitSelect allowClear placeholder={t('HTTPFlowTable.selectDisposalStatus')}>
            {FLOW_DISPOSAL_STATUS_OPTIONS.map((item) => (
              <YakitSelect.Option key={item} value={item}>
                {item}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.disposalNote')} name="DisposalNote">
          <YakitInput.TextArea placeholder={t('HTTPFlowTable.inputDisposalNote')} rows={4} />
        </Form.Item>
        <div className={styles['flow-mark-edit-form-btns']}>
          <YakitButton type="outline2" onClick={() => onClose?.()}>
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton htmlType="submit">{t('YakitButton.ok')}</YakitButton>
        </div>
      </Form>
    </div>
  )
})
