import React, { useEffect, useRef, useState } from 'react'
import { Progress } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { ImportExportProgressProps, ImportExportStreamResponse } from '../HTTPFlowTable.constants'

const ImportExportProgress: React.FC<ImportExportProgressProps> = React.memo((props) => {
  const { visible, onClose, getContainer, title, subTitle, token, openStream } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
  const [importExportStream, setImportExportStream] = useState<ImportExportStreamResponse[]>([])
  const importExportStreamRef = useRef<ImportExportStreamResponse[]>([])
  const activeRef = useRef<{ controller: AbortController; closed: boolean }>()

  const closeModal = useMemoizedFn((failed = false) => {
    const active = activeRef.current
    if (!active || active.closed) return
    active.closed = true
    active.controller.abort()
    const data = importExportStreamRef.current.slice()
    onClose(!failed && data[data.length - 1]?.Percent === 1, data)
  })
  useEffect(() => {
    const active = { controller: new AbortController(), closed: false }
    activeRef.current = active
    importExportStreamRef.current = []
    setImportExportStream([])
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    const update = () => setImportExportStream(importExportStreamRef.current.slice())
    const timer = setInterval(update, 300)
    const onError = (error: Error) => {
      if (active.controller.signal.aborted) return
      yakitNotify('error', error.message)
      closeModal(true)
    }
    void openStream({
      token,
      signal: active.controller.signal,
      onData(data) {
        importExportStreamRef.current.push(data)
      },
      onError,
      onEnd() {
        update()
        closeTimer = setTimeout(() => closeModal(), 500)
      },
    }).catch(onError)
    return () => {
      active.closed = true
      active.controller.abort()
      clearInterval(timer)
      clearTimeout(closeTimer)
    }
  }, [token])

  return (
    <YakitModal
      open={visible}
      getContainer={getContainer}
      type="white"
      title={title}
      onCancel={() => closeModal()}
      width={680}
      closable={true}
      maskClosable={false}
      destroyOnHidden={true}
      bodyStyle={{ padding: 0 }}
      footerStyle={{ justifyContent: 'flex-end' }}
      footer={
        <YakitButton type={'outline2'} onClick={() => closeModal()}>
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
