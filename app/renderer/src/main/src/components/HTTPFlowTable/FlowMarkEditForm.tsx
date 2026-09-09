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
    (value: { IssueType?: string; Severity?: string; Status?: string; StatusReason?: string }) => {
      const payload: BatchSetHTTPFlowIssueFieldsRequest = {
        Ids: ids,
        Filter: filter,
        Token: token,
      }
      if (batch) {
        if (value.IssueType) payload.IssueType = value.IssueType
        if (value.Severity) payload.Severity = value.Severity
        if (value.Status) payload.Status = value.Status
        if (value.StatusReason?.trim()) payload.StatusReason = value.StatusReason.trim()
      } else {
        payload.IssueType = value.IssueType
        payload.Severity = value.Severity
        payload.Status = value.Status
        payload.StatusReason = value.StatusReason?.trim() || undefined
      }
      apiBatchSetHTTPFlowIssueFields(payload).then(() => {
        const patch: FlowMarkPatchPayload = {
          Ids: ids,
          ...(payload.IssueType !== undefined ? { IssueType: payload.IssueType } : {}),
          ...(payload.Severity !== undefined ? { Severity: payload.Severity } : {}),
          ...(payload.Status !== undefined ? { Status: payload.Status } : {}),
          ...(payload.StatusReason !== undefined ? { StatusReason: payload.StatusReason } : {}),
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
                IssueType: info?.IssueType,
                Severity: info?.Severity,
                Status: info?.Status,
                StatusReason: info?.StatusReason,
              }
        }
      >
        <Form.Item label={t('HTTPFlowTable.problemType')} name="IssueType">
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
        <Form.Item label={t('HTTPFlowTable.disposalStatus')} name="Status">
          <YakitSelect allowClear placeholder={t('HTTPFlowTable.selectDisposalStatus')}>
            {FLOW_DISPOSAL_STATUS_OPTIONS.map((item) => (
              <YakitSelect.Option key={item} value={item}>
                {item}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.disposalNote')} name="StatusReason">
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
