import React, { Suspense, lazy, memo, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { yakitAuxWindow } from '@/services/electronBridge'
import ConcurrentStreamSkeleton from '@/auxWindow/components/ConcurrentStreamSkeleton/ConcurrentStreamSkeleton'
import {
  type ConcurrentStreamFramePayload,
  isConcurrentStreamFrame,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { fetchConcurrentStreamContents } from './fetchConcurrentStreamContents'
import styles from './AIConcurrentStream.module.scss'
import AIConcurrentStreamContent, {
  AIConcurrentStreamDispatcher,
  AIConcurrentStreamStore,
} from './useContext/AIConcurrentStreamContent'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'

// 子卡片按需加载，避免重型卡片（AINodeItem 及其下游 review/report/fuzz 等子卡）
// 全量进入 aux bundle，拉长 did-finish-load 与首次开窗耗时。
const AIChildWindowTaskDefaultGroupCard = lazy(
  () =>
    import('@/pages/ai-agent/components/AITaskDefaultGroupCard/aiChildWindowTaskDefaultGroupCard/AIChildWindowTaskDefaultGroupCard'),
)
const AIChildWindowConcurrentStreamCard = lazy(
  () =>
    import('@/pages/ai-agent/components/ConcurrentStreamCard/aiChildWindowConcurrentStreamCard/AIChildWindowConcurrentStreamCard'),
)

const { ipcRenderer } = window.require('electron')

interface AIConcurrentStreamProps {
  windowId: string
}

const AIConcurrentStream: React.FC<AIConcurrentStreamProps> = memo(({ windowId }) => {
  const [frame, setFrame] = useState<ConcurrentStreamFramePayload | null>(null)
  const [contentVersion, setContentVersion] = useState(0)
  // rawData 是否仍在通过 fetch-concurrent-stream-contents 拉取中
  const [loadingContents, setLoadingContents] = useState(false)

  // rawData 用 ref 存储，更新不触发渲染；
  // 组件及子组件的重渲染由 contentVersion（renderNum）驱动
  const rawDataRef = useRef<Map<string, AIChatQSData>>(new Map())

  useEffect(() => {
    if (!windowId) return

    const applyFrame = (payload: ConcurrentStreamFramePayload) => {
      if (!isConcurrentStreamFrame(payload)) return
      const framePayload = payload
      // 开窗时 frame 只携带轻量元数据（rawData 为空 Map），
      // 真正的 rawData 由下方的懒拉取 effect 通过 IPC 向主窗口请求
      startTransition(() => {
        const newFrame = {
          ...framePayload,
          rawData: new Map(),
        }
        setFrame(newFrame)
        // 收到 frame 后，主动向主窗口拉取本次需要渲染的 rawData。
        getRawData(newFrame)
        setContentVersion((v) => v + 1)
      })
    }

    const offInit = yakitAuxWindow.onInit((msg) => {
      if (msg.windowId !== windowId) return
      applyFrame(msg.payload)
    })

    const offPush = yakitAuxWindow.onPush((msg) => {
      if (msg.windowId !== windowId) return
      applyFrame(msg.payload)
    })

    yakitAuxWindow.ready(windowId)

    return () => {
      offInit()
      offPush()
    }
  }, [windowId])

  const getRawData = useMemoizedFn((frame) => {
    setLoadingContents(true)

    fetchConcurrentStreamContents(frame)
      .then((entries) => {
        rawDataRef.current = entries
        setContentVersion((v) => v + 1)
      })
      .catch(() => {
        rawDataRef.current = new Map()
      })
      .finally(() => {
        setLoadingContents(false)
      })
  })

  const isTaskDefaultGroup = useMemo(() => {
    if (!frame) return false
    const root = rawDataRef.current.get(frame.token)
    return root?.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
  }, [frame, contentVersion])

  // 刷新：通过 IPC 通知主窗口重新构建并推送最新 frame（含最新 rawData）
  const requestRefresh = useMemoizedFn(() => {
    if (!frame) return
    ipcRenderer.send('request-ai-concurrent-stream-refresh', {
      type: 'openAIConcurrentStream',
      data: {
        session: frame.session,
        token: frame.token,
        chatType: frame.chatType,
      },
    })
  })
  const store: AIConcurrentStreamStore = useMemo(() => {
    return {
      session: frame?.session,
      token: frame?.token,
      chatType: frame?.chatType,
      childrenTokens: frame?.childrenTokens,
      rawData: rawDataRef.current,
      renderNum: contentVersion,
    }
  }, [frame, contentVersion])
  const dispatcher: AIConcurrentStreamDispatcher = useMemo(() => {
    return {
      requestRefresh,
    }
  }, [])
  // isTaskDefaultGroup 需要读 rawData 判断根节点类型，必须等 rawData 拉取完成
  if (!frame || loadingContents) {
    return <ConcurrentStreamSkeleton variant="page" />
  }

  return (
    <AIConcurrentStreamContent.Provider value={{ store, dispatcher }}>
      <div className={styles.page}>
        <div className={styles.divider} />
        <div className={styles.wrapper}>
          <Suspense fallback={<ConcurrentStreamSkeleton variant="card" />}>
            {isTaskDefaultGroup ? (
              // <AITaskDefaultGroupCard
              //   key={cardKey}
              //   isChildWindow
              //   onRefresh={requestRefresh}
              //   session={frame.session}
              //   token={frame.token}
              //   chatType={frame.chatType}
              //   elements={frame.elements}
              // />
              <AIChildWindowTaskDefaultGroupCard token={frame.token} />
            ) : (
              // <ConcurrentStreamCard
              //   key={cardKey}
              //   isChildWindow
              //   session={frame.session}
              //   token={frame.token}
              //   chatType={frame.chatType}
              //   elements={frame.elements}
              // />
              <AIChildWindowConcurrentStreamCard token={frame.token} />
            )}
          </Suspense>
        </div>
      </div>
    </AIConcurrentStreamContent.Provider>
  )
})

export default AIConcurrentStream
