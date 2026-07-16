import React, { useEffect, useRef, useState } from 'react'
import { Progress } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { ImportExportProgressProps, ImportExportStreamResponse } from '../HTTPFlowTable.constants'

const { ipcRenderer } = window.require('electron')

const ImportExportProgress: React.FC<ImportExportProgressProps> = React.memo((props) => {
  const { visible, onClose, getContainer, title, subTitle, token, apiKey } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
  const timeRef = useRef<any>(null)
  const [importExportStream, setImportExportStream] = useState<ImportExportStreamResponse[]>([])
  const importExportStreamRef = useRef<ImportExportStreamResponse[]>([])

  const cancelImportExportHTTPFlowStream = () => {
    ipcRenderer.invoke(`cancel-${apiKey}`, token)
    ipcRenderer.removeAllListeners(`${token}-data`)
    ipcRenderer.removeAllListeners(`${token}-error`)
    ipcRenderer.removeAllListeners(`${token}-end`)
    clearInterval(timeRef.current)
  }
  useEffect(() => {
    const updateImportExportHTTPFlowStream = () => {
      setImportExportStream(importExportStreamRef.current.slice())
    }
    timeRef.current = setInterval(updateImportExportHTTPFlowStream, 300)
    ipcRenderer.on(`${token}-data`, async (e, data: ImportExportStreamResponse) => {
      importExportStreamRef.current.push(data)
    })
    ipcRenderer.on(`${token}-error`, (e, error) => {
      yakitNotify('error', `error: ${error}`)
      closeModal()
    })
    return () => {
      cancelImportExportHTTPFlowStream()
    }
  }, [token])

  const closeModal = useMemoizedFn(() => {
    onClose(importExportStream[importExportStream.length - 1]?.Percent === 1, importExportStream)
    cancelImportExportHTTPFlowStream()
  })
  useEffect(() => {
    if (importExportStream[importExportStream.length - 1]?.Percent === 1) {
      setTimeout(() => {
        closeModal()
      }, 500)
    }
  }, [JSON.stringify(importExportStream)])

  return (
    <YakitModal
      open={visible}
      getContainer={getContainer}
      type="white"
      title={title}
      onCancel={closeModal}
      width={680}
      closable={true}
      maskClosable={false}
      destroyOnClose={true}
      bodyStyle={{ padding: 0 }}
      footerStyle={{ justifyContent: 'flex-end' }}
      footer={
        <YakitButton type={'outline2'} onClick={closeModal}>
          {importExportStream[importExportStream.length - 1]?.Percent === 1
            ? t('YakitButton.finish')
            : t('YakitButton.cancel')}
        </YakitButton>
      }
    >
      <div style={{ padding: 15 }} className="yakit-progress-wrapper">
        {importExportStream[importExportStream.length - 1]?.Percent === undefined && <div>{subTitle}</div>}
        <Progress
          strokeColor="var(--Colors-Use-Main-Primary)"
          trailColor="var(--Colors-Use-Neutral-Bg)"
          percent={Math.trunc(importExportStream[importExportStream.length - 1]?.Percent * 100)}
          format={(percent) => `${percent}%`}
        />
      </div>
    </YakitModal>
  )
})

ImportExportProgress.displayName = 'ImportExportProgress'

export default ImportExportProgress
