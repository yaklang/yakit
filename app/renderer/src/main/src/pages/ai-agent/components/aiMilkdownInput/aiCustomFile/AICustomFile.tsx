import React, { useEffect, useRef, useState } from 'react'
import type { AICustomFileProps } from './type'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { useCreation, useMemoizedFn } from 'ahooks'
import styles from './AICustomFile.module.scss'
import classNames from 'classnames'

import { yakitNotify } from '@/utils/notification'
import { ipc } from '@/services/ipc'
import { Progress } from 'antd'

export const AICustomFile: React.FC<AICustomFileProps> = React.memo((props) => {
  const { sessionId, chatDataStoreKey } = props
  const { node, contentRef, view, selected, setAttrs } = useNodeViewContext()

  const [showSrc, setShowSrc] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)

  const controllerRef = useRef<AbortController>()
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
    return () => controllerRef.current?.abort()
  }, [editable, attrs?.src, sessionId, chatDataStoreKey])

  const onSaveLocal = useMemoizedFn(async (blobUrl: string) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setShowSrc(blobUrl)
    try {
      const response = await fetch(blobUrl, { signal: controller.signal })
      const blob = await response.blob()

      const mimeType = blob.type || 'image/png'
      const suffix = mimeType.split('/')[1] || 'png'

      const arrayBuffer = await blob.arrayBuffer()
      if (controller.signal.aborted) return
      const buffer = new Uint8Array(arrayBuffer)
      setProgress(0)
      const filename = `image_${crypto.randomUUID()}.${suffix}`
      setAttrs({ alt: filename })
      if (!chatDataStoreKey) {
        yakitNotify('error', '图片保存失败: 无法识别当前 AI 存储路径')
        return
      }
      const savedPath = await ipc.invoke(
        'local',
        'save-ai-image',
        {
          buffer,
          filename,
          sessionID: sessionId,
          chatDataStoreKey,
        },
        { signal: controller.signal, onProgress: setProgress },
      )
      if (controller.signal.aborted) return
      setProgress(100)
      setAttrs({ src: savedPath })
      setShowSrc(savedPath)
    } catch (error) {
      if (controller.signal.aborted) return
      yakitNotify('error', `图片上传失败: ${error}`)
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
      <img src={showSrc ? `atom://${showSrc}` : ''} alt={attrs.alt || '暂无图片'} />
    </div>
  )
})
