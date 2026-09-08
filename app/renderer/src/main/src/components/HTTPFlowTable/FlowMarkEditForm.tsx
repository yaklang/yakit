import type React from 'react'
import { memo } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import {
  FLOW_DISPOSAL_STATUS_OPTIONS,
  FLOW_PROBLEM_TYPE_OPTIONS,
  FLOW_SEVERITY_OPTIONS,
  type BatchSetHTTPFlowIssueFieldsRequest,
  type FlowMarkPatchPayload,
} from './HTTPFlowMark.constants'
import { apiBatchSetHTTPFlowIssueFields } from './HTTPFlowMark.utils'
import styles from './HTTPFlowMark.module.scss'

export interface FlowMarkEditFormProps {
  info?: any //暂时any HTTPFlow
  ids: number[]
  filter?: YakQueryHTTPFlowRequest
  token?: string
  batch?: boolean
  onClose?: () => void
  onSuccess?: (payload: FlowMarkPatchPayload) => void
}

export const FlowMarkEditForm: React.FC<FlowMarkEditFormProps> = memo((props) => {
  const { info, ids, filter, token, batch, onClose, onSuccess } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi'])
  const [form] = Form.useForm()

  const onFinish = useMemoizedFn(
    (value: { ProblemType?: string; Severity?: string; DisposalStatus?: string; DisposalNote?: string }) => {
      const payload: BatchSetHTTPFlowIssueFieldsRequest = {
        Ids: ids,
        Filter: filter,
        Token: token,
      }
      if (batch) {
        if (value.ProblemType) payload.IssueType = value.ProblemType
        if (value.Severity) payload.Severity = value.Severity
        if (value.DisposalStatus) payload.Status = value.DisposalStatus
        if (value.DisposalNote?.trim()) payload.StatusReason = value.DisposalNote.trim()
      } else {
        payload.IssueType = value.ProblemType
        payload.Severity = value.Severity
        payload.Status = value.DisposalStatus
        payload.StatusReason = value.DisposalNote?.trim() || undefined
      }
      apiBatchSetHTTPFlowIssueFields(payload).then(() => {
        const patch: FlowMarkPatchPayload = {
          Ids: ids,
          ...(payload.IssueType !== undefined ? { ProblemType: payload.IssueType } : {}),
          ...(payload.Severity !== undefined ? { Severity: payload.Severity } : {}),
          ...(payload.Status !== undefined ? { DisposalStatus: payload.Status } : {}),
          ...(payload.StatusReason !== undefined ? { DisposalNote: payload.StatusReason } : {}),
        }
        onSuccess?.(patch)
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
          <YakitButton type="outline2" onClick={onClose}>
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton htmlType="submit" type="primary">
            {t('YakitButton.ok')}
          </YakitButton>
        </div>
      </Form>
    </div>
  )
})
