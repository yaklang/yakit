import React, { useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { Tooltip } from 'antd'
import { ClockIcon } from '@/assets/newIcon'
import { OutlineBookopenIcon, OutlineSearchIcon, OutlineUploadIcon } from '@/assets/icon/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { usePageInfo } from '@/store/pageInfo'
import { shallow } from 'zustand/shallow'
import { OpenAPIDocHistory } from './OpenAPIDocHistory'
import {
  OpenAPIDocState,
  OpenAPIDocumentHistoryItem,
  OpenAPIDocumentInfo,
  OpenAPIOperationSummary,
} from './openapiDocType'
import { loadOpenAPIDocumentById, uploadOpenAPIDocument } from './openapiYakURL'
import styles from './OpenAPIDocPanel.module.scss'

const { ipcRenderer } = window.require('electron')

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
}

function getMethodColor(method: string) {
  return METHOD_COLORS[method.toUpperCase()] || '#999'
}

function getFileBaseName(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || ''
}

function buildDocumentStatePatch(
  result: {
    docId: string
    docInfo: OpenAPIDocumentInfo
    operations: OpenAPIOperationSummary[]
  },
  prev: Pick<OpenAPIDocState, 'overrideDomain' | 'overrideIsHttps'>,
): Partial<OpenAPIDocState> {
  return {
    docId: result.docId,
    docInfo: result.docInfo,
    operations: result.operations,
    parseWarnings: result.docInfo.parseWarnings || [],
    overrideDomain: result.docInfo.domain || prev.overrideDomain,
    overrideIsHttps: result.docInfo.isHttps,
    isHttps: result.docInfo.isHttps,
    selectedOperation: undefined,
    operationDetail: undefined,
    parameterValues: {},
    requestRaw: '',
    responseRaw: '',
  }
}

interface OpenAPIDocSidePanelProps {
  state: OpenAPIDocState
  onUpdate: (patch: Partial<OpenAPIDocState>) => void
  onSelectOperation: (operation: OpenAPIOperationSummary) => void
}

export const OpenAPIDocSidePanel: React.FC<OpenAPIDocSidePanelProps> = ({ state, onUpdate, onSelectOperation }) => {
  const { t } = useI18nNamespaces(['history', 'webFuzzer'])
  const [keyword, setKeyword] = useState('')
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0)
  const autoLoadedRef = useRef(false)
  const currentRouteKey = usePageInfo((s) => s.getCurrentPageTabRouteKey(), shallow)

  const getPopupContainer = useMemoizedFn(
    () => document.getElementById(`main-operator-page-body-${currentRouteKey}`) || document.body,
  )

  const loadDocument = useMemoizedFn(async (docId: string) => {
    if (state.docId === docId && state.operations.length) return
    onUpdate({ loading: true })
    try {
      const result = await loadOpenAPIDocumentById(docId)
      onUpdate({
        ...buildDocumentStatePatch(result, state),
        loading: false,
      })
    } catch (e: any) {
      onUpdate({ loading: false })
      yakitFailed(`${t('HTTPHistory.openapiDoc.historyLoadFailed')}: ${e?.message || e}`)
    }
  })

  const onHistoryItemsChange = useMemoizedFn((items: OpenAPIDocumentHistoryItem[]) => {
    if (autoLoadedRef.current || !items.length || state.docId) return
    autoLoadedRef.current = true
    loadDocument(items[0].sessionId)
  })

  const onHistorySelect = useMemoizedFn((item: OpenAPIDocumentHistoryItem) => {
    loadDocument(item.sessionId)
  })

  const onHistoryDeleted = useMemoizedFn((sessionId: string) => {
    if (state.docId !== sessionId) return
    onUpdate({
      docId: '',
      docInfo: undefined,
      operations: [],
      selectedOperation: undefined,
      operationDetail: undefined,
      parameterValues: {},
      requestRaw: '',
      responseRaw: '',
      parseWarnings: [],
    })
  })

  const groupedOperations = useMemo(() => {
    const groups = new Map<string, OpenAPIOperationSummary[]>()
    const kw = keyword.trim().toLowerCase()
    state.operations.forEach((op) => {
      if (kw) {
        const haystack = `${op.method} ${op.path} ${op.summary || ''} ${(op.tags || []).join(' ')}`.toLowerCase()
        if (!haystack.includes(kw)) return
      }
      const tag = op.tags?.[0] || t('HTTPHistory.openapiDoc.untagged')
      const list = groups.get(tag) || []
      list.push(op)
      groups.set(tag, list)
    })
    return Array.from(groups.entries())
  }, [keyword, state.operations, t])

  const onUpload = useMemoizedFn(async () => {
    try {
      const data = await handleOpenFileSystemDialog({
        title: t('HTTPHistory.openapiDoc.uploadTitle'),
        properties: ['openFile'],
        filters: [
          { name: 'OpenAPI', extensions: ['json', 'yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (data.canceled || !data.filePaths?.length) return
      const filePath = data.filePaths[0]
      onUpdate({ loading: true })
      const content = await ipcRenderer.invoke('read-file-content', filePath)
      const result = await uploadOpenAPIDocument(content, {
        fileName: getFileBaseName(filePath),
        overrideDomain: state.overrideDomain || undefined,
        overrideIsHttps: state.overrideIsHttps,
      })
      onUpdate({
        ...buildDocumentStatePatch(result, state),
        loading: false,
      })
      setHistoryRefreshToken((v) => v + 1)
      yakitNotify('success', t('HTTPHistory.openapiDoc.uploadSuccess'))
      if (result.docInfo.parseWarnings?.length) {
        yakitNotify(
          'warning',
          t('HTTPHistory.openapiDoc.uploadSuccessWithWarnings', { count: result.docInfo.parseWarnings.length }),
        )
      }
    } catch (e: any) {
      onUpdate({ loading: false })
      yakitFailed(`${t('HTTPHistory.openapiDoc.uploadFailed')}: ${e?.message || e}`)
    }
  })

  const isSelected = (op: OpenAPIOperationSummary) =>
    state.selectedOperation?.method === op.method && state.selectedOperation?.path === op.path

  return (
    <div className={styles['openapi-doc-side']}>
      <div className={styles['openapi-doc-side-header']}>
        <div className={styles['openapi-doc-side-header-title']}>
          <OutlineBookopenIcon />
          <span>{t('WebFuzzerPage.openapiDoc')}</span>
        </div>
        <div className={styles['openapi-doc-side-header-actions']}>
          <Tooltip
            trigger={['click']}
            destroyTooltipOnHide
            overlayClassName={styles['openapi-doc-history-tooltip']}
            getPopupContainer={getPopupContainer}
            title={
              <div className={styles['openapi-doc-history-tooltip-content']}>
                <OpenAPIDocHistory
                  activeDocId={state.docId}
                  refreshToken={historyRefreshToken}
                  onSelect={onHistorySelect}
                  onDeleted={onHistoryDeleted}
                  onItemsChange={onHistoryItemsChange}
                  getPopupContainer={getPopupContainer}
                />
              </div>
            }
          >
            <YakitButton type="text2" icon={<ClockIcon />} title="" />
          </Tooltip>
          <YakitButton
            type="text2"
            icon={<OutlineUploadIcon />}
            onClick={onUpload}
            loading={state.loading}
            title={t('HTTPHistory.openapiDoc.upload')}
          />
        </div>
      </div>

      {state.docId ? (
        <>
          <YakitInput
            className={styles['openapi-doc-side-search']}
            prefix={<OutlineSearchIcon />}
            placeholder={t('HTTPHistory.openapiDoc.searchPlaceholder')}
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className={styles['openapi-doc-side-body']}>
            <YakitSpin spinning={state.loading}>
              <div className={styles['openapi-doc-tree']}>
                {groupedOperations.length ? (
                  groupedOperations.map(([tag, ops]) => (
                    <div key={tag}>
                      <div className={styles['openapi-doc-tree-group-title']}>{tag}</div>
                      {ops.map((op) => (
                        <div
                          key={`${op.method}-${op.path}`}
                          className={classNames(styles['openapi-doc-tree-item'], {
                            [styles['openapi-doc-tree-item-active']]: isSelected(op),
                          })}
                          onClick={() => onSelectOperation(op)}
                        >
                          <span
                            className={styles['openapi-doc-tree-method']}
                            style={{ backgroundColor: getMethodColor(op.method) }}
                          >
                            {op.method}
                          </span>
                          <span className={styles['openapi-doc-tree-label']}>{op.summary || op.path}</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className={styles['openapi-doc-side-empty']}>
                    <YakitEmpty description={t('HTTPHistory.openapiDoc.noMatchingApi')} />
                  </div>
                )}
              </div>
            </YakitSpin>
          </div>
        </>
      ) : (
        <div className={styles['openapi-doc-side-empty']}>
          <YakitEmpty description={t('HTTPHistory.openapiDoc.emptyHint')} />
        </div>
      )}
    </div>
  )
}
