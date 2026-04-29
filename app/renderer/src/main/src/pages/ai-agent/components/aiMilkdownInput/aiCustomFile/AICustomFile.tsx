import React, { useEffect, useRef, useState } from 'react'
import { AICustomFileProps } from './type'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation, useMemoizedFn } from 'ahooks'
import styles from './AICustomFile.module.scss'
import classNames from 'classnames'

import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { Progress } from 'antd'

const { ipcRenderer } = window.require('electron')

export const AICustomFile: React.FC<AICustomFileProps> = React.memo((props) => {
  const { sessionId, chatDataStoreKey } = props
  const { node, contentRef, view, selected, setAttrs } = useNodeViewContext()

  const [showSrc, setShowSrc] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  const tokenRef = useRef<string>(randomString(8))
  const attrs = useCreation(() => {
    return node.attrs
  }, [node.attrs])
  const editable = useCreation(() => {
    return view.editable
  }, [view.editable])
  useEffect(() => {
    // blob:开头需要上传，其他情况直接展示
    if (editable && attrs?.src && attrs?.src.startsWith('blob')) {
      onSaveLocal(attrs?.src)
    } else {
      setShowSrc(attrs?.src)
    }
  }, [editable])

  const handleIpcFinish = useMemoizedFn((e, path: string) => {
    setProgress(100)
    setAttrs({ src: path })
    setShowSrc(path)
  })

  useEffect(() => {
    const token = tokenRef.current
    ipcRenderer.on(`save-ai-image-progress-${token}`, (e, progress: number) => {
      setProgress(progress)
    })
    ipcRenderer.on(`save-ai-image-finish-${token}`, handleIpcFinish)
    ipcRenderer.on(`save-ai-image-err-${token}`, (e, err) => {
      yakitNotify('error', `save-ai-image-err: ${err}`)
    })
    return () => {
      ipcRenderer.removeAllListeners(`save-ai-image-progress-${token}`)
      ipcRenderer.removeAllListeners(`save-ai-image-finish-${token}`)
      ipcRenderer.removeAllListeners(`save-ai-image-err-${token}`)
    }
  }, [])

  const onSaveLocal = useMemoizedFn(async (blobUrl: string) => {
    setShowSrc(blobUrl)
    try {
      const response = await fetch(blobUrl)
      const blob = await response.blob()

      const mimeType = blob.type || 'image/png'
      const suffix = mimeType.split('/')[1] || 'png'

      const arrayBuffer = await blob.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      setProgress(0)
      const filename = `image_${Date.now()}.${suffix}`
      setAttrs({ alt: filename })
      ipcRenderer.invoke(
        'save-ai-image',
        {
          buffer,
          filename,
          sessionID: sessionId,
          chatDataStoreKey,
        },
        tokenRef.current,
      )
    } catch (error) {
      yakitNotify('error', `AICustomFile-图片上传失败: ${error}`)
    }
  })
  const isUpdate = useCreation(() => {
    return progress > 0 && progress < 100
  }, [progress])

  return (
    <div
      className={classNames(styles['ai-custom-file'], {
        [styles['ai-custom-file-selected']]: selected,
        [styles['ai-custom-file-update']]: isUpdate,
      })}
      ref={contentRef}
      contentEditable={false}
    >
      {isUpdate && <Progress type="circle" percent={progress} className={styles['progress']} width={30} />}
      <img src={!!showSrc ? `atom://${showSrc}` : ''} alt={attrs.alt || '暂无图片'} />
    </div>
  )
})
