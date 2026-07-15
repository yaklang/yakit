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
  const [parsing, setParsing] = useState(false)
  const [parsePercent, setParsePercent] = useState(0)
  const [parseMessage, setParseMessage] = useState('')
  const [overrideDomain, setOverrideDomain] = useState('')
  const [overrideIsHttps, setOverrideIsHttps] = useState(false)
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0)
  const currentRouteKey = usePageInfo((s) => s.getCurrentPageTabRouteKey(), shallow)
  const uploadTokenRef = useRef('')
  const parseTaskIdRef = useRef('')

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
        if (!data?.task_id || data.task_id !== parseTaskIdRef.current) return
        const percent = Math.max(0, Math.min(100, Math.round((data.percent || 0) * 100)))
        setParsePercent(percent)
        setParseMessage(data.message || data.stage || '')
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
    return () => {
      cancelOpenApiRequest(uploadTokenRef.current)
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
  })

  const resetParseState = useMemoizedFn(() => {
    setParsing(false)
    setParsePercent(0)
    setParseMessage('')
    parseTaskIdRef.current = ''
    uploadTokenRef.current = ''
  })

  const applyDocument = useMemoizedFn((result: DocResult) => {
    setDocId(result.docId)
    setDocInfo(result.docInfo)
    setOperations(result.operations)
    setOverrideDomain((prev) => result.docInfo.domain || prev)
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
    await cancelOpenApiRequest(uploadTokenRef.current)
    yakitNotify('info', t('ApiDoc.parseCanceled'))
  })

  const onUpload = useMemoizedFn(async () => {
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
      uploadTokenRef.current = token
      parseTaskIdRef.current = parseTaskId
      setLoading(true)
      setParsing(true)
      setParsePercent(1)
      setParseMessage(t('ApiDoc.parsing'))

      const filePath = data.filePaths[0]
      const content = await ipcRenderer.invoke('read-file-content', filePath)
      const fileName = filePath.replace(/\\/g, '/').split('/').pop() || ''
      const result = await uploadApiDoc(content, {
        fileName,
        overrideDomain: overrideDomain || undefined,
        overrideIsHttps,
        parseTaskId,
        token,
      })
      applyDocument(result)
      setHistoryRefreshToken((n) => n + 1)
      setParsePercent(100)
      yakitNotify('success', t('ApiDoc.uploadSuccess'))
      if (result.docInfo.parseWarnings?.length) {
        yakitNotify('warning', t('ApiDoc.uploadSuccessWithWarnings', { count: result.docInfo.parseWarnings.length }))
      }
    } catch (error) {
      if (isOpenApiRequestCanceled(error)) {
        yakitNotify('info', t('ApiDoc.parseCanceled'))
      } else {
        showError('ApiDoc.uploadFailed', error)
      }
    } finally {
      setLoading(false)
      resetParseState()
    }
  })

  return (
    <div className={styles['api-doc']} style={{ display: visible ? undefined : 'none' }}>
      <div className={styles['header']}>
        <div className={styles['header-top']}>
          <div className={styles['header-title']}>
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
            {parsing ? (
              <YakitButton
                type="text2"
                size="small"
                danger
                icon={<OutlineStopIcon />}
                onClick={onStopParse}
                title={t('ApiDoc.stopParse')}
              />
            ) : (
              <YakitButton
                type="text2"
                size="small"
                icon={<OutlineUploadIcon />}
                loading={loading}
                onClick={onUpload}
                title={t('ApiDoc.upload')}
              />
            )}
          </div>
        </div>
        {!!docInfo?.version && (
          <div className={styles['version']}>
            {t('ApiDoc.version')}: {docInfo.version}
          </div>
        )}
        {parsing && (
          <div className={styles['parse-progress']}>
            <div className={styles['parse-progress-text']}>
              <span>{parseMessage || t('ApiDoc.parsing')}</span>
              <span>{parsePercent}%</span>
            </div>
            <Progress
              percent={parsePercent}
              size="small"
              showInfo={false}
              strokeColor="var(--Colors-Use-Blue-Primary)"
            />
          </div>
        )}
      </div>

      <div className={styles['body']}>
        {!hasDoc ? (
          <div className={styles['empty']}>
            {parsing ? (
              <div className={styles['parse-empty']}>
                <div className={styles['parse-empty-title']}>{t('ApiDoc.parsing')}</div>
                <Progress
                  percent={parsePercent}
                  format={(percent) => `${percent ?? 0}%`}
                  strokeColor="var(--Colors-Use-Blue-Primary)"
                />
                <div className={styles['parse-empty-msg']}>{parseMessage}</div>
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
