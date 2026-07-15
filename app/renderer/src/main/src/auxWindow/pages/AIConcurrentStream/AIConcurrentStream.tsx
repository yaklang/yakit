import React, { Suspense, memo, startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { yakitAuxWindow } from '@/services/electronBridge'
import ConcurrentStreamSkeleton from '@/auxWindow/components/ConcurrentStreamSkeleton/ConcurrentStreamSkeleton'
import {
  type ConcurrentStreamFramePayload,
  isConcurrentStreamFrame,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import styles from './AIConcurrentStream.module.scss'
import AIChildWindowTaskDefaultGroupCard from '@/pages/ai-agent/components/AITaskDefaultGroupCard/aiChildWindowTaskDefaultGroupCard/AIChildWindowTaskDefaultGroupCard'
import AIChildWindowConcurrentStreamCard from '@/pages/ai-agent/components/ConcurrentStreamCard/aiChildWindowConcurrentStreamCard/AIChildWindowConcurrentStreamCard'
import AIConcurrentStreamContent, {
  AIConcurrentStreamDispatcher,
  AIConcurrentStreamStore,
} from './useContext/AIConcurrentStreamContent'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'

// const ConcurrentStreamCard = lazy(() => import('@/pages/ai-agent/components/ConcurrentStreamCard/ConcurrentStreamCard'))
// const AITaskDefaultGroupCard = lazy(
//   () => import('@/pages/ai-agent/components/AITaskDefaultGroupCard/AITaskDefaultGroupCard'),
// )

const { ipcRenderer } = window.require('electron')

interface AIConcurrentStreamProps {
  windowId: string
}

const AIConcurrentStream: React.FC<AIConcurrentStreamProps> = memo(({ windowId }) => {
  const [frame, setFrame] = useState<ConcurrentStreamFramePayload | null>(null)
  const [contentVersion, setContentVersion] = useState(0)

  // rawData 用 ref 存储，更新不触发渲染；
  // 组件及子组件的重渲染由 contentVersion（renderNum）驱动
  const rawDataRef = useRef<Map<string, AIChatQSData>>(new Map())

  useEffect(() => {
    if (!windowId) return

    const applyFrame = (payload: ConcurrentStreamFramePayload) => {
      if (!isConcurrentStreamFrame(payload)) return
      const framePayload = payload
      // 直接使用 frame 里的 rawData 存入 ref
      rawDataRef.current = framePayload.rawData ?? new Map()
      startTransition(() => {
        setFrame({
          ...framePayload,
          rawData: new Map(),
        })
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

  /** deprecated 目前数据都是通过 openAIConcurrentStream发送到子窗口，如需沿用下面的逻辑，需要将获取数据的方法改为新版 */
  // useEffect(() => {
  //   if (!frame || contentVersion === 0) return

  //   let cancelled = false
  //   setLoadingContents(true)

  //   fetchConcurrentStreamContents(frame)
  //     .then((entries) => {
  //       if (!cancelled) setContentEntries(entries)
  //     })
  //     .catch(() => {
  //       if (!cancelled) setContentEntries([])
  //     })
  //     .finally(() => {
  //       if (!cancelled) setLoadingContents(false)
  //     })

  //   return () => {
  //     cancelled = true
  //   }
  // }, [frame, contentVersion])

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
  if (!frame) {
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
