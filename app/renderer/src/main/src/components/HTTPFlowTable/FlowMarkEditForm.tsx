import type React from 'react'
import { memo, useRef, useState } from 'react'
import { Form } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { YakQueryHTTPFlowRequest } from '@/utils/yakQueryHTTPFlow'
import { preventImplicitFormSubmit } from '@/utils/formKeyboard'
import { yakitNotify } from '@/utils/notification'
import { BatchScopeSelector } from '@/components/BatchScopeSelector/BatchScopeSelector'
import { buildBatchScopes, type BatchScope } from '@/components/BatchScopeSelector/batchScope'
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
  batchCount?: number
  orderBy?: string
  order?: string
  onClose?: () => void
  onSuccess?: (payload: FlowMarkPatchPayload) => void
  onRefresh?: () => void
}

export const FlowMarkEditForm: React.FC<FlowMarkEditFormProps> = memo((props) => {
  const { info, ids, filter, token, batch, batchCount, orderBy, order, onClose, onSuccess, onRefresh } = props
  const { t } = useI18nNamespaces(['history', 'yakitUi'])
  const [form] = Form.useForm()
  const [batchPayload, setBatchPayload] = useState<BatchSetHTTPFlowIssueFieldsRequest>()
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const total = batchCount ?? ids.length

  const buildPatch = useMemoizedFn((targetIds: number[], payload: BatchSetHTTPFlowIssueFieldsRequest) => ({
    Ids: targetIds,
    ...(payload.SetIssueType !== undefined ? { IssueType: payload.SetIssueType } : {}),
    ...(payload.SetSeverity !== undefined ? { Severity: payload.SetSeverity } : {}),
    ...(payload.SetStatus !== undefined ? { Status: payload.SetStatus } : {}),
    ...(payload.StatusReason !== undefined ? { StatusReason: payload.StatusReason } : {}),
  }))

  const buildBatchRequest = useMemoizedFn(
    (payload: BatchSetHTTPFlowIssueFieldsRequest, scope: BatchScope): BatchSetHTTPFlowIssueFieldsRequest => ({
      ...payload,
      Filter: {
        ...filter,
        ...(ids.length ? { IncludeId: ids } : {}),
        AfterId: undefined,
        BeforeId: undefined,
        Pagination: {
          ...filter?.Pagination,
          Page: scope.page,
          Limit: scope.limit,
          OrderBy: orderBy || filter?.Pagination?.OrderBy || 'id',
          Order: order || filter?.Pagination?.Order || 'desc',
        },
      },
    }),
  )

  const onFinish = useMemoizedFn(
    (value: { IssueType?: string; Severity?: string; Status?: string; StatusReason?: string }) => {
      const payload: BatchSetHTTPFlowIssueFieldsRequest = batch
        ? { Token: token }
        : { Ids: ids, Filter: filter, Token: token }
      if (batch) {
        if (value.IssueType) payload.SetIssueType = value.IssueType
        if (value.Severity) payload.SetSeverity = value.Severity
        if (value.Status) payload.SetStatus = value.Status
        if (value.StatusReason?.trim()) payload.StatusReason = value.StatusReason.trim()
      } else {
        payload.SetIssueType = value.IssueType ?? ''
        payload.SetSeverity = value.Severity ?? ''
        payload.SetStatus = value.Status ?? ''
        payload.StatusReason = value.StatusReason?.trim() || ''
      }
      if (batch) {
        if (total <= 0 || submittingRef.current) return
        if (total > 1000) {
          setBatchPayload(payload)
          return
        }
        const scope = buildBatchScopes(total)[0]
        if (!scope) return
        submittingRef.current = true
        setSubmitting(true)
        apiBatchSetHTTPFlowIssueFields(buildBatchRequest(payload, scope))
          .then((response) => {
            const updatedCount = Number(response?.UpdatedCount ?? 0)
            if (updatedCount !== scope.count) {
              yakitNotify('error', `本次仅更新 ${updatedCount}/${scope.count} 条，请刷新列表后核对。`)
              try {
                onRefresh?.()
              } catch (error) {
                yakitNotify('error', `数据刷新失败，请手动刷新列表：${String(error)}`)
              }
              onClose?.()
              return
            }
            try {
              onSuccess?.(buildPatch(ids, payload))
            } catch (error) {
              yakitNotify('error', `数据刷新失败，请手动刷新列表：${String(error)}`)
            }
            onClose?.()
          })
          .catch(() => {})
          .finally(() => {
            submittingRef.current = false
            setSubmitting(false)
          })
        return
      }
      apiBatchSetHTTPFlowIssueFields(payload).then(() => {
        onSuccess?.(buildPatch(ids, payload))
        onClose?.()
      })
    },
  )

  const layout = {
    labelCol: { span: 5 },
    wrapperCol: { span: 19 },
  }

  if (batch && batchPayload) {
    return (
      <BatchScopeSelector
        total={total}
        execute={(scope) => apiBatchSetHTTPFlowIssueFields(buildBatchRequest(batchPayload, scope))}
        onScopeSuccess={onRefresh ? () => onRefresh() : undefined}
        onPartial={onRefresh ? () => onRefresh() : undefined}
        onClose={onClose}
      />
    )
  }

  return (
    <div className={styles['flow-mark-edit-form']}>
      <Form
        {...layout}
        form={form}
        onFinish={onFinish}
        onKeyDown={preventImplicitFormSubmit}
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
                {t(`HTTPFlowTable.markOptions.${item}`)}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.severity')} name="Severity">
          <YakitSelect allowClear placeholder={t('HTTPFlowTable.selectSeverity')}>
            {FLOW_SEVERITY_OPTIONS.map((item) => (
              <YakitSelect.Option key={item} value={item}>
                {t(`HTTPFlowTable.markOptions.${item}`)}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.disposalStatus')} name="Status">
          <YakitSelect allowClear placeholder={t('HTTPFlowTable.selectDisposalStatus')}>
            {FLOW_DISPOSAL_STATUS_OPTIONS.map((item) => (
              <YakitSelect.Option key={item} value={item}>
                {t(`HTTPFlowTable.markOptions.${item}`)}
              </YakitSelect.Option>
            ))}
          </YakitSelect>
        </Form.Item>
        <Form.Item label={t('HTTPFlowTable.disposalNote')} name="StatusReason">
          <YakitInput.TextArea placeholder={t('HTTPFlowTable.inputDisposalNote')} rows={4} />
        </Form.Item>
        <div className={styles['flow-mark-edit-form-btns']}>
          <YakitButton
            type="outline2"
            disabled={submitting}
            onClick={() => {
              if (!submittingRef.current) onClose?.()
            }}
          >
            {t('YakitButton.cancel')}
          </YakitButton>
          <YakitButton htmlType="submit" type="primary" loading={submitting}>
            {t('YakitButton.ok')}
          </YakitButton>
        </div>
      </Form>
    </div>
  )
})
