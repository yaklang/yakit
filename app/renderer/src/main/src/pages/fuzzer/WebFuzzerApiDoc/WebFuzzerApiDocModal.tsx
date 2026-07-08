import React, { useEffect, useMemo, useState } from 'react'
import classNames from 'classnames'
import styles from './WebFuzzerApiDoc.module.scss'
import {
  ApiDocInfo,
  ApiDocOperationDetail,
  ApiDocOperationParameter,
  ApiDocOperationSummary,
  getApiMethodTagStyle,
  getExtra,
  openApiRequest,
} from './apiDoc'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitAutoComplete } from '@/components/yakitUI/YakitAutoComplete/YakitAutoComplete'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useMemoizedFn } from 'ahooks'
import { onSetRemoteValuesBase } from '@/components/yakitUI/utils'
import { CacheDropDownGV } from '@/yakitGV'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { OutlineInformationcircleIcon } from '@/assets/icon/outline'
import { Tooltip } from 'antd'
import { YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'

const PARAM_TYPE_DEFAULTS: Record<string, string> = {
  integer: '1',
  int: '1',
  number: '1',
  boolean: 'false',
  bool: 'false',
}

const getParamDefault = (param: ApiDocOperationParameter) => {
  if (param.example !== undefined && param.example !== null && param.example !== '') {
    return String(param.example)
  }
  const name = param.name.toLowerCase()
  const type = (param.type || 'string').toLowerCase()
  if (PARAM_TYPE_DEFAULTS[type]) return PARAM_TYPE_DEFAULTS[type]
  if (name.includes('uuid') || name.endsWith('uid') || name === 'sid') {
    return '00000000-0000-0000-0000-000000000001'
  }
  if (name.includes('id')) return '1'
  if (name.includes('name')) return 'mock_name'
  if (name.includes('email') || name.includes('mail')) return 'admin@example.com'
  if (name.includes('phone') || name.includes('mobile')) return '13800000001'
  if (name.includes('password')) return 'admin123'
  if (name.includes('url') || name.includes('link')) return 'https://www.example.com'
  if (name.includes('ip')) return '127.0.0.1'
  return `mock_${param.name}`
}

const resolveParams = (parameters: ApiDocOperationParameter[] | undefined, values: Record<string, string>) => {
  const result: Record<string, string> = {}
  parameters?.forEach((param) => {
    const v = values[param.name]
    result[param.name] = v !== undefined && v !== '' ? v : getParamDefault(param)
  })
  return result
}

const isValidStatusCode = (code: string) => {
  const text = code.trim()
  if (text === 'default') return true
  if (!/^\d{3}$/.test(text)) return false
  const num = Number(text)
  return num >= 100 && num <= 599
}

const { YakitPanel } = YakitCollapse

export const WebFuzzerApiDocModal: React.FC<{
  visible: boolean
  docId: string
  docInfo?: ApiDocInfo
  operation?: ApiDocOperationSummary
  onClose: () => void
  onConstructRequest: (request: string, isHttps: boolean) => void
}> = React.memo(({ visible, docId, docInfo, operation, onClose, onConstructRequest }) => {
  const { t } = useI18nNamespaces(['webFuzzer'])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [operationDetail, setOperationDetail] = useState<ApiDocOperationDetail>()
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({})
  const [overrideDomain, setOverrideDomain] = useState('')

  const loadOperationDetail = useMemoizedFn(async () => {
    if (!docId || !operation) return
    setLoading(true)
    setOperationDetail(undefined)
    setParameterValues({})
    try {
      const resources = await openApiRequest('GET', docId, [
        { Key: 'op', Value: 'detail' },
        { Key: 'method', Value: operation.method.toUpperCase() },
        { Key: 'path', Value: operation.path },
      ])
      const detailJson = getExtra(resources[0]?.Extra, 'detail_json')
      if (!detailJson) throw new Error('operation detail is empty')
      const detail = JSON.parse(detailJson) as ApiDocOperationDetail
      setOperationDetail(detail)
      setParameterValues(Object.fromEntries((detail.parameters || []).map((p) => [p.name, getParamDefault(p)])))
      setOverrideDomain(docInfo?.domain || '')
    } catch (error) {
      yakitFailed(`${t('ApiDoc.historyLoadFailed')}: ${error instanceof Error ? error.message : error}`)
      onClose()
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    if (!visible) return
    loadOperationDetail()
  }, [visible])

  const doConstructRequest = useMemoizedFn(async () => {
    if (!docId || !operation) return
    setSubmitting(true)
    try {
      const overrideIsHttps = docInfo?.isHttps ?? false
      const requestBodyContentType = Object.keys(operationDetail?.requestBody?.content || {})[0]
      const query = [
        { Key: 'op', Value: 'build' },
        { Key: 'method', Value: operation.method.toUpperCase() },
        { Key: 'path', Value: operation.path },
        { Key: 'overrideDomain', Value: overrideDomain || docInfo?.domain || '' },
      ]
      if (overrideIsHttps) query.push({ Key: 'overrideIsHttps', Value: 'true' })
      if (requestBodyContentType) query.push({ Key: 'requestBodyContentType', Value: requestBodyContentType })

      const resources = await openApiRequest(
        'POST',
        docId,
        query,
        JSON.stringify({
          overrideDomain: overrideDomain || docInfo?.domain,
          overrideIsHttps,
          requestBodyContentType,
          parameterValues: resolveParams(operationDetail?.parameters, parameterValues),
        }),
      )
      const request = getExtra(resources[0]?.Extra, 'request')
      if (!request) throw new Error('empty request')

      const domain = overrideDomain.trim()
      if (domain) {
        await onSetRemoteValuesBase({
          cacheHistoryDataKey: CacheDropDownGV.WebFuzzerApiDocBaseHostList,
          newValue: domain,
          isCacheDefaultValue: false,
        })
      }
      onConstructRequest(request, getExtra(resources[0]?.Extra, 'is_https') === 'true')
      onClose()
    } catch (error) {
      yakitFailed(`${t('ApiDoc.sendToFuzzerFailed')}: ${error instanceof Error ? error.message : error}`)
    } finally {
      setSubmitting(false)
    }
  })

  const validateRequiredParams = useMemoizedFn(() => {
    const missing = (operationDetail?.parameters || []).filter(
      (param) => param.required && !parameterValues[param.name]?.trim(),
    )
    if (!missing.length) return true
    yakitNotify('warning', t('ApiDoc.requiredFieldMissing', { names: missing.map((item) => item.name).join(', ') }))
    return false
  })

  const onOk = useMemoizedFn(async () => {
    if (!validateRequiredParams()) return
    await doConstructRequest()
  })

  const onCloseWithConfirm = useMemoizedFn(() => {
    if (loading || submitting) return
    const m = YakitModalConfirm({
      onOkText: (modalT) => modalT('YakitButton.confirm'),
      content: (modalT) => modalT('ApiDoc.closeConstructConfirm'),
      onCancel: () => {
        m.destroy()
        onClose()
      },
      onOk: async () => {
        if (!validateRequiredParams()) {
          m.destroy()
          return
        }
        m.destroy()
        await doConstructRequest()
      },
    })
  })

  const parameterGroupEntries = useMemo(() => {
    const groups = (operationDetail?.parameters || []).reduce<Record<string, ApiDocOperationParameter[]>>(
      (acc, param) => {
        const group = (param.in || 'other').trim().toLowerCase() || 'other'
        if (!acc[group]) acc[group] = []
        acc[group].push(param)
        return acc
      },
      {},
    )
    return Object.entries(groups)
  }, [operationDetail?.parameters])
  const responses = (operationDetail?.responses || []).filter((item) => isValidStatusCode(item.statusCode))
  const method = operationDetail?.method || operation?.method || ''
  const path = operationDetail?.path || operation?.path || ''
  const summary = operationDetail?.summary || operationDetail?.description || '-'

  return (
    <YakitModal
      visible={visible}
      title={t('ApiDoc.modalTitle')}
      subTitle={t('ApiDoc.modalSubTitle')}
      width={600}
      destroyOnClose
      maskClosable={false}
      confirmLoading={submitting}
      onCancel={onCloseWithConfirm}
      onCloseX={onCloseWithConfirm}
      onOk={onOk}
      okText={t('ApiDoc.constructRequest')}
      cancelButtonProps={{ style: { display: 'none' } }}
      footerExtra={
        <div className={styles['api-detail-footer-host']}>
          <span className={styles['api-detail-footer-host-addon']}>{t('ApiDoc.baseHost')}</span>
          <div className={styles['api-detail-footer-host-input']}>
            <YakitAutoComplete
              cacheHistoryDataKey={CacheDropDownGV.WebFuzzerApiDocBaseHostList}
              isCacheDefaultValue={false}
              value={overrideDomain}
              placeholder={docInfo?.domain}
              allowClear
              onChange={(value = '') => setOverrideDomain(String(value))}
            />
          </div>
        </div>
      }
    >
      <YakitSpin spinning={loading}>
        <div className={styles['api-detail']}>
          <div className={styles['api-detail-block']}>
            <div className={styles['api-detail-title']}>{t('ApiDoc.basicInfo')}</div>
            <div className={styles['api-detail-table']}>
              <div className={styles['api-detail-row']}>
                <span className={styles['api-detail-label']}>{t('ApiDoc.method')}</span>
                <span className={styles['api-detail-value']}>
                  <YakitTag border={false} size="small" style={getApiMethodTagStyle(method)}>
                    {method}
                  </YakitTag>
                </span>
                <span className={styles['api-detail-label']}>{t('ApiDoc.path')}</span>
                <span className={styles['api-detail-value']}>{path}</span>
              </div>
              <div className={styles['api-detail-row']}>
                <span className={styles['api-detail-label']}>{t('ApiDoc.summary')}</span>
                <span className={classNames(styles['api-detail-value'], styles['api-detail-value-full'])}>
                  {summary}
                </span>
              </div>
            </div>
          </div>

          {!!parameterGroupEntries.length && (
            <div className={styles['api-detail-block']}>
              <div className={styles['api-detail-title']}>{t('ApiDoc.parameters')}</div>
              <div className={styles['api-detail-params']}>
                <YakitCollapse
                  className={styles['api-detail-param-collapse']}
                  defaultActiveKey={parameterGroupEntries.map(([group]) => group)}
                >
                  {parameterGroupEntries.map(([group, groupParams]) => (
                    <YakitPanel
                      key={group}
                      header={<span className={styles['api-detail-param-group-title']}>{group}</span>}
                    >
                      <div className={styles['api-detail-param-group-body']}>
                        {groupParams.map((param) => (
                          <div key={`${param.in}-${param.name}`} className={styles['api-detail-field']}>
                            <div className={styles['api-detail-field-row']}>
                              <span className={styles['api-detail-field-label']}>
                                {param.required && <span className={styles['api-detail-required']}>*</span>}
                                {param.name}
                                {param.description && (
                                  <Tooltip title={param.description}>
                                    <OutlineInformationcircleIcon className={styles['api-detail-info-icon']} />
                                  </Tooltip>
                                )}
                                :
                              </span>
                              <YakitInput
                                size="small"
                                placeholder={param.type || param.name}
                                value={parameterValues[param.name] || ''}
                                onChange={(e) =>
                                  setParameterValues((prev) => ({ ...prev, [param.name]: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </YakitPanel>
                  ))}
                </YakitCollapse>
              </div>
            </div>
          )}

          {!!responses.length && (
            <div className={styles['api-detail-block']}>
              <div className={styles['api-detail-title']}>{t('ApiDoc.expectedResponses')}</div>
              <div className={styles['api-detail-tags']}>
                {responses.map((resp) => (
                  <YakitTag key={resp.statusCode} size="small">
                    {resp.statusCode.trim() === 'default' ? t('ApiDoc.defaultResponse') : resp.statusCode}{' '}
                    {resp.description}
                  </YakitTag>
                ))}
              </div>
            </div>
          )}
        </div>
      </YakitSpin>
    </YakitModal>
  )
})
