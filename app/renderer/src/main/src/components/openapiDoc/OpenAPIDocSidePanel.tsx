import React, { useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { OutlineSearchIcon, OutlineUploadIcon } from '@/assets/icon/outline'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { OpenAPIDocState, OpenAPIOperationSummary } from './openapiDocType'
import { uploadOpenAPIDocument } from './openapiYakURL'
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

interface OpenAPIDocSidePanelProps {
  state: OpenAPIDocState
  onUpdate: (patch: Partial<OpenAPIDocState>) => void
  onSelectOperation: (operation: OpenAPIOperationSummary) => void
}

export const OpenAPIDocSidePanel: React.FC<OpenAPIDocSidePanelProps> = ({ state, onUpdate, onSelectOperation }) => {
  const { t } = useI18nNamespaces(['history'])
  const [keyword, setKeyword] = useState('')

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
        overrideDomain: state.overrideDomain || undefined,
        overrideIsHttps: state.overrideIsHttps,
      })
      onUpdate({
        docId: result.docId,
        docInfo: result.docInfo,
        operations: result.operations,
        parseWarnings: result.docInfo.parseWarnings || [],
        overrideDomain: result.docInfo.domain || state.overrideDomain,
        overrideIsHttps: result.docInfo.isHttps,
        isHttps: result.docInfo.isHttps,
        selectedOperation: undefined,
        operationDetail: undefined,
        parameterValues: {},
        requestRaw: '',
        responseRaw: '',
        loading: false,
      })
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
        <YakitButton type="primary" icon={<OutlineUploadIcon />} onClick={onUpload} loading={state.loading}>
          {t('HTTPHistory.openapiDoc.upload')}
        </YakitButton>
      </div>
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
          {!state.docId ? (
            <div className={styles['openapi-doc-side-empty']}>
              <YakitEmpty description={t('HTTPHistory.openapiDoc.emptyHint')} />
            </div>
          ) : (
            <div className={styles['openapi-doc-tree']}>
              {groupedOperations.map(([tag, ops]) => (
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
              ))}
            </div>
          )}
        </YakitSpin>
      </div>
    </div>
  )
}
