import React, { useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { yakitFailed } from '@/utils/notification'
import { OpenAPIDocSidePanel } from './OpenAPIDocSidePanel'
import { loadOpenAPIOperationSelection, OpenAPIDocRightPanel } from './OpenAPIDocRightPanel'
import { initialOpenAPIDocState, OpenAPIDocState, OpenAPIOperationSummary } from './openapiDocType'
import styles from './OpenAPIDocPanel.module.scss'

export const OpenAPIDocPage: React.FC = () => {
  const [openapiDocState, setOpenapiDocState] = useState<OpenAPIDocState>(initialOpenAPIDocState())
  const updateOpenapiDocState = useMemoizedFn((patch: Partial<OpenAPIDocState>) => {
    setOpenapiDocState((prev) => ({ ...prev, ...patch }))
  })

  const onSelectOpenAPIOperation = useMemoizedFn(async (operation: OpenAPIOperationSummary) => {
    const docId = openapiDocState.docId
    if (!docId) return
    updateOpenapiDocState({
      selectedOperation: operation,
      loading: true,
    })
    try {
      const patch = await loadOpenAPIOperationSelection(docId, operation.method, operation.path)
      updateOpenapiDocState({ ...patch, selectedOperation: operation, loading: false })
    } catch (e: any) {
      updateOpenapiDocState({ loading: false })
      yakitFailed(e?.message || e)
    }
  })

  return (
    <div className={styles['openapi-doc-page']}>
      <YakitResizeBox
        isVer={false}
        firstRatio="22%"
        secondRatio="78%"
        firstMinSize={280}
        secondMinSize={480}
        firstNode={() => (
          <OpenAPIDocSidePanel
            state={openapiDocState}
            onUpdate={updateOpenapiDocState}
            onSelectOperation={onSelectOpenAPIOperation}
          />
        )}
        secondNode={() => <OpenAPIDocRightPanel state={openapiDocState} onUpdate={updateOpenapiDocState} />}
      />
    </div>
  )
}
