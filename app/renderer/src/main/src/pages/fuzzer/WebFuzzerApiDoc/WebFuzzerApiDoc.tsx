import React, { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import { Progress, Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { shallow } from 'zustand/shallow'
import styles from './WebFuzzerApiDoc.module.scss'
import { OutlineBookopenIcon, OutlineClockIcon, OutlineStopIcon, OutlineUploadIcon } from '@/assets/icon/outline'
import { YakURLResource } from '@/pages/yakURLTree/data'
import {
  ApiDocInfo,
  ApiDocOperationSummary,
  cancelOpenApiRequest,
  getApiMethodTagStyle,
  getExtra,
  isOpenApiRequestCanceled,
  openApiRequest,
  OpenAPIParseProgress,
  toNumber,
} from './apiDoc'
import { WebFuzzerApiDocHistory } from './WebFuzzerApiDocHistory'
import { WebFuzzerApiDocModal } from './WebFuzzerApiDocModal'
import YakitCollapse from '@/components/yakitUI/YakitCollapse/YakitCollapse'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { usePageInfo } from '@/store/pageInfo'
import { randomString } from '@/utils/randomUtil'
import emiter from '@/utils/eventBus/eventBus'

const { YakitPanel } = YakitCollapse
const { ipcRenderer } = window.require('electron')

type DocResult = { docId: string; docInfo: ApiDocInfo; operations: ApiDocOperationSummary[] }
type ParseStatus = 'idle' | 'parsing' | 'canceling'
type ParseTask = { id: string; token: string; canceled: boolean }

const parseDocInfo = (docId: string, resource: YakURLResource): ApiDocInfo => {
  const extra = resource.Extra || []
  let parseWarnings: string[] = []
  const rawWarnings = getExtra(extra, 'parse_warnings')
  if (rawWarnings) {
    try {
      parseWarnings = JSON.parse(rawWarnings)
    } catch {
      parseWarnings = []
    }
  }
  return {
    docId,
    title: getExtra(extra, 'title') || resource.VerboseName,
    version: getExtra(extra, 'version'),
    specVersion: getExtra(extra, 'specVersion'),
    domain: getExtra(extra, 'domain'),
    isHttps: getExtra(extra, 'is_https') === 'true',
    operationCount: toNumber(getExtra(extra, 'operation_count')),
    parseWarnings,
  }
}

const parseOperation = (resource: YakURLResource): ApiDocOperationSummary => {
  const extra = resource.Extra || []
  const tags = getExtra(extra, 'tags')
  return {
    method: getExtra(extra, 'method'),
    path: getExtra(extra, 'path'),
    operationId: getExtra(extra, 'operationId'),
    summary: getExtra(extra, 'summary') || resource.VerboseName,
    tags: tags ? tags.split(',').filter(Boolean) : [],
  }
}

const toDocResult = (docId: string, resources: YakURLResource[]): DocResult => {
  const docResource = resources.find((item) => item.ResourceType === 'openapi-document')
  if (!docResource) throw new Error('api doc not found')
  return {
    docId,
    docInfo: parseDocInfo(docId, docResource),
    operations: resources.filter((item) => item.ResourceType === 'openapi-operation').map(parseOperation),
  }
}

const loadApiDoc = (docId: string) => openApiRequest('GET', docId).then((resources) => toDocResult(docId, resources))

const uploadApiDoc = async (
  content: string,
  options?: {
    fileName?: string
    overrideDomain?: string
    overrideIsHttps?: boolean
    parseTaskId?: string
    token?: string
  },
) => {
  const query: { Key: string; Value: string }[] = []
  if (options?.fileName) query.push({ Key: 'fileName', Value: options.fileName })
  if (options?.overrideDomain) query.push({ Key: 'overrideDomain', Value: options.overrideDomain })
  if (options?.overrideIsHttps) query.push({ Key: 'overrideIsHttps', Value: 'true' })
  if (options?.parseTaskId) query.push({ Key: 'parse_task_id', Value: options.parseTaskId })

  const resources = await openApiRequest('POST', 'upload', query, content, options?.token)
  if (!resources.length) throw new Error('upload api doc failed: empty response')
  const docResource = resources.find((item) => item.ResourceType === 'openapi-document') || resources[0]
  return toDocResult(docResource.ResourceName, resources)
}

export const WebFuzzerApiDoc: React.FC<{
  visible: boolean
  onApplyRequest: (request: string, isHttps: boolean) => void
}> = React.memo(({ visible, onApplyRequest }) => {
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [activeKey, setActiveKey] = useState<string[]>([])
  const [modalOperation, setModalOperation] = useState<ApiDocOperationSummary>()
  const [docId, setDocId] = useState('')
  const [docInfo, setDocInfo] = useState<ApiDocInfo>()
  const [operations, setOperations] = useState<ApiDocOperationSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parseProgress, setParseProgress] = useState({ percent: 0, message: '' })
  const [overrideDomain, setOverrideDomain] = useState('')
  const [overrideIsHttps, setOverrideIsHttps] = useState(false)
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0)
  const currentRouteKey = usePageInfo((s) => s.getCurrentPageTabRouteKey(), shallow)
  const parseTaskRef = useRef<ParseTask>()
  const mountedRef = useRef(true)
  const parsing = parseStatus !== 'idle'
  const canceling = parseStatus === 'canceling'
  const { percent: parsePercent, message: parseMessage } = parseProgress

  const getPopupContainer = useMemoizedFn(
    () => document.getElementById(`main-operator-page-body-${currentRouteKey}`) || document.body,
  )

  const untagged = t('ApiDoc.untagged')
  const apiGroups = useMemo(() => {
    const groups = new Map<string, ApiDocOperationSummary[]>()
    operations.forEach((op) => {
      const tag = op.tags?.[0] || untagged
      groups.set(tag, [...(groups.get(tag) || []), op])
    })
    return [...groups.entries()].map(([title, items]) => ({
      key: title,
      title,
      items: items.map((op) => ({ id: `${op.method}-${op.path}`, operation: op })),
    }))
  }, [operations, untagged])

  const filteredGroups = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase()
    if (!kw) return apiGroups
    return apiGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(({ operation }) =>
          `${operation.summary || ''} ${operation.path} ${operation.method}`.toLowerCase().includes(kw),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [apiGroups, searchKeyword])

  const displayGroups = searchKeyword.trim() ? filteredGroups : apiGroups
  const hasDoc = operations.length > 0
  const noSearchResult = hasDoc && !!searchKeyword.trim() && filteredGroups.length === 0

  useEffect(() => {
    setActiveKey(displayGroups.map((group) => group.key))
  }, [displayGroups])

  useEffect(() => {
    const onProgress = (raw: string) => {
      try {
        const data = JSON.parse(raw) as OpenAPIParseProgress
        const task = parseTaskRef.current
        if (!task || task.canceled || data.task_id !== task.id) return
        const { current = 0, total = 0, percent: progressPercent = 0 } = data
        const rawPercent =
          total > 0 ? (current / total) * 100 : progressPercent > 1 ? progressPercent : progressPercent * 100
        setParseProgress({
          percent: Math.max(0, Math.min(100, Math.round(rawPercent || 0))),
          message: data.message || data.stage || '',
        })
      } catch {
        // ignore malformed push
      }
    }
    emiter.on('onOpenAPIParseProgress', onProgress)
    return () => {
      emiter.off('onOpenAPIParseProgress', onProgress)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (parseTaskRef.current) {
        parseTaskRef.current.canceled = true
        cancelOpenApiRequest(parseTaskRef.current.token)
      }
    }
  }, [])

  const showError = useMemoizedFn((key: string, error: any) => {
    yakitFailed(`${t(key)}: ${error?.message || error}`)
  })

  const resetDoc = useMemoizedFn(() => {
    setDocId('')
    setDocInfo(undefined)
    setOperations([])
    setSearchInput('')
    setSearchKeyword('')
    setOverrideDomain('')
    setOverrideIsHttps(false)
  })

  const resetParseState = useMemoizedFn(() => {
    setParseStatus('idle')
    setParseProgress({ percent: 0, message: '' })
  })

  const applyDocument = useMemoizedFn((result: DocResult) => {
    setDocId(result.docId)
    setDocInfo(result.docInfo)
    setOperations(result.operations)
    // 切换/上传文档时，overrideDomain 应重置为当前文档自身的 domain，
    // 不能保留上一个文档的 domain，否则上传新文档会把旧 host 串到新文档上
    setOverrideDomain(result.docInfo.domain || '')
    setOverrideIsHttps(result.docInfo.isHttps)
  })

  const loadDocument = useMemoizedFn(async (id: string) => {
    if (docId === id && operations.length) return
    setLoading(true)
    try {
      applyDocument(await loadApiDoc(id))
    } catch (error) {
      showError('ApiDoc.historyLoadFailed', error)
    } finally {
      setLoading(false)
    }
  })

  const onStopParse = useMemoizedFn(async () => {
    const task = parseTaskRef.current
    if (!task || task.canceled) return
    task.canceled = true
    setParseStatus('canceling')
    setParseProgress((prev) => ({ ...prev, message: t('ApiDoc.canceling') }))
    await cancelOpenApiRequest(task.token)
  })

  const onUpload = useMemoizedFn(async () => {
    if (parseTaskRef.current) return
    const task: ParseTask = { id: '', token: '', canceled: false }
    parseTaskRef.current = task
    try {
      const data = await handleOpenFileSystemDialog({
        title: t('ApiDoc.uploadTitle'),
        properties: ['openFile'],
        filters: [
          { name: 'OpenAPI', extensions: ['json', 'yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (data.canceled || !data.filePaths?.length) return

      const token = randomString(16)
      const parseTaskId = randomString(16)
      task.id = parseTaskId
      task.token = token
      setParseStatus('parsing')
      setParseProgress({ percent: 1, message: t('ApiDoc.parsing') })

      const filePath = data.filePaths[0]
      const content = await ipcRenderer.invoke('read-file-content', filePath)
      if (task.canceled) {
        throw new Error('openapi parse canceled')
      }
      const fileName = filePath.replace(/\\/g, '/').split('/').pop() || ''
      // 上传新文档时不带上一个文档的 overrideDomain，避免旧 host 串到新文档。
      // 只有当前 UI 输入框有值且与当前文档 domain 不同时才覆盖（用户显式修改）。
      const userDomainOverride = overrideDomain && overrideDomain !== docInfo?.domain ? overrideDomain : undefined
      const result = await uploadApiDoc(content, {
        fileName,
        overrideDomain: userDomainOverride,
        overrideIsHttps,
        parseTaskId,
        token,
      })
      if (task.canceled) {
        throw new Error('openapi parse canceled')
      }
      applyDocument(result)
      setHistoryRefreshToken((n) => n + 1)
      yakitNotify('success', t('ApiDoc.uploadSuccess'))
      if (result.docInfo.parseWarnings?.length) {
        yakitNotify('warning', t('ApiDoc.uploadSuccessWithWarnings', { count: result.docInfo.parseWarnings.length }))
      }
    } catch (error) {
      if (!mountedRef.current) {
        return
      }
      if (task.canceled || isOpenApiRequestCanceled(error)) {
        yakitNotify('info', t('ApiDoc.parseCanceled'))
      } else {
        showError('ApiDoc.uploadFailed', error)
      }
    } finally {
      parseTaskRef.current = undefined
      if (mountedRef.current) resetParseState()
    }
  })

  return (
    <div className={styles['api-doc']} style={{ display: visible ? undefined : 'none' }}>
      <div className={styles['header']}>
        <div className={styles['header-top']}>
          <div className={styles['header-title']} style={parsing ? { visibility: 'hidden' } : {}}>
            {docInfo?.title && (
              <>
                <OutlineBookopenIcon className={styles['header-icon']} />
                <span className={classNames(styles['doc-name'], 'content-ellipsis')}>{docInfo.title}</span>
              </>
            )}
            {!!docId && (
              <YakitTag color="blue" size="small" fullRadius>
                {docInfo?.operationCount ?? operations.length} APIs
              </YakitTag>
            )}
          </div>
          <div className={styles['header-actions']}>
            <Tooltip
              trigger={['click']}
              destroyTooltipOnHide
              overlayClassName={styles['history-tooltip']}
              getPopupContainer={getPopupContainer}
              title={
                <div className={styles['history-tooltip-content']}>
                  <WebFuzzerApiDocHistory
                    refreshToken={historyRefreshToken}
                    onSelect={(item) => loadDocument(item.sessionId)}
                    onDeleted={(sessionId) => docId === sessionId && resetDoc()}
                  />
                </div>
              }
            >
              <YakitButton type="text2" size="small" icon={<OutlineClockIcon />} disabled={parsing} />
            </Tooltip>
            <YakitButton
              type="text2"
              size="small"
              icon={<OutlineUploadIcon />}
              loading={loading}
              onClick={onUpload}
              title={t('ApiDoc.upload')}
              disabled={parsing}
            />
          </div>
        </div>
        {!!docInfo?.version && (
          <div className={styles['version']} style={parsing ? { visibility: 'hidden' } : {}}>
            {t('ApiDoc.version')}: {docInfo.version}
          </div>
        )}
      </div>

      <div className={styles['body']}>
        {!hasDoc || parsing ? (
          <div className={styles['empty']}>
            {parsing ? (
              <div className={styles['parse-empty']}>
                <div className={styles['parse-empty-title']}>{t('ApiDoc.parsing')}</div>
                <Progress
                  percent={parsePercent}
                  format={(percent) => `${percent ?? 0}%`}
                  strokeColor="var(--Colors-Use-Blue-Primary)"
                />
                <div className={classNames(styles['parse-empty-msg'], 'content-ellipsis')}>{parseMessage}</div>
                <YakitButton type="outline1" danger onClick={onStopParse}>
                  {t('ApiDoc.stopParse')}
                </YakitButton>
              </div>
            ) : (
              <YakitEmpty title={t('ApiDoc.emptyHint')} />
            )}
          </div>
        ) : (
          <>
            <div className={styles['search']}>
              <YakitInput.Search
                allowClear
                placeholder={t('YakitInput.searchKeyWordPlaceholder')}
                value={searchInput}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchInput(value)
                  if (!value) setSearchKeyword('')
                }}
                onSearch={(value) => setSearchKeyword(value.trim())}
              />
            </div>
            {noSearchResult ? (
              <div className={styles['empty']}>
                <YakitEmpty title={t('YakitEmpty.searchEmpty')} />
              </div>
            ) : (
              <div className={styles['list']}>
                <YakitCollapse activeKey={activeKey} onChange={(key) => setActiveKey(key as string[])}>
                  {displayGroups.map((group) => (
                    <YakitPanel
                      key={group.key}
                      header={
                        <div className={styles['group-header']}>
                          <span>{group.title}</span>
                          <span className={styles['group-count']}>{group.items.length}</span>
                        </div>
                      }
                    >
                      {group.items.map(({ id, operation }) => {
                        const desc = operation.summary || operation.path
                        return (
                          <div key={id} className={styles['api-item']} onClick={() => setModalOperation(operation)}>
                            <YakitTag border={false} size="small" style={getApiMethodTagStyle(operation.method)}>
                              {operation.method}
                            </YakitTag>
                            <Tooltip title={desc}>
                              <span className={classNames(styles['api-desc'], 'content-ellipsis')}>{desc}</span>
                            </Tooltip>
                          </div>
                        )
                      })}
                    </YakitPanel>
                  ))}
                </YakitCollapse>
                <div className={styles['to-end']}>{t('YakitEmpty.end_of_list')}</div>
              </div>
            )}
          </>
        )}
      </div>

      <WebFuzzerApiDocModal
        visible={!!modalOperation}
        docId={docId}
        docInfo={docInfo}
        operation={modalOperation}
        onClose={() => setModalOperation(undefined)}
        onConstructRequest={onApplyRequest}
      />
    </div>
  )
})
