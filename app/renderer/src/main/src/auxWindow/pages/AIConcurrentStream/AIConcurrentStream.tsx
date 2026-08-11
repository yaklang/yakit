import type React from 'react'
import { lazy, memo, startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { yakitAuxWindow } from '@/services/electronBridge'
import {
  type ConcurrentStreamFramePayload,
  isConcurrentStreamFrame,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { type AIYakExecFileRecord, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { fetchConcurrentStreamContents } from './fetchConcurrentStreamContents'
import styles from './AIConcurrentStream.module.scss'
import AIConcurrentStreamContent, {
  type AIConcurrentStreamDispatcher,
  type AIConcurrentStreamStore,
} from './useContext/AIConcurrentStreamContent'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import { useDebounceFn } from 'ahooks'
import ConcurrentStreamSkeleton from '@/auxWindow/components/ConcurrentStreamSkeleton/ConcurrentStreamSkeleton'

// 子卡片按需加载，避免重型卡片（AINodeItem 及其下游 review/report/fuzz 等子卡）
// 全量进入 aux bundle，拉长 did-finish-load 与首次开窗耗时。
const AIChildWindowTaskDefaultGroupCard = lazy(
  () =>
    import('@/pages/ai-agent/components/aiChildWindowItem/aiChildWindowTaskDefaultGroupCard/AIChildWindowTaskDefaultGroupCard'),
)
const AIChildWindowConcurrentStreamCard = lazy(
  () =>
    import('@/pages/ai-agent/components/ConcurrentStreamCard/aiChildWindowConcurrentStreamCard/AIChildWindowConcurrentStreamCard'),
)

interface AIConcurrentStreamProps {
  windowId: string
}

const AIConcurrentStream: React.FC<AIConcurrentStreamProps> = memo(({ windowId }) => {
  const [frame, setFrame] = useState<ConcurrentStreamFramePayload | null>(null)
  const [contentVersion, setContentVersion] = useState(0)
  const [loading, setLoading] = useState<boolean>(true)

  // rawData/execFileRecord/childrenTokens 用 ref 存储，更新不触发渲染；
  // 组件及子组件的重渲染由 contentVersion（renderNum）驱动
  const rawDataRef = useRef<Map<string, AIChatQSData>>(new Map())
  const execFileRecordRef = useRef<Map<string, AIYakExecFileRecord[]>>(new Map())
  const childrenTokensRef = useRef<string[]>([])

  useEffect(() => {
    if (!windowId) return

    const applyFrame = (payload: ConcurrentStreamFramePayload) => {
      if (!isConcurrentStreamFrame(payload)) return
      const newFrame: ConcurrentStreamFramePayload = {
        ...payload,
      }
      // 开窗时 frame 只携带轻量元数据
      startTransition(() => {
        setFrame((v) => ({
          ...v,
          ...newFrame,
          renderNum: (v?.renderNum || newFrame.renderNum || 0) + 1,
        }))
      })
      // 收到 frame 后，主动向主窗口拉取本次需要渲染的 rawData。
      fetchContents(newFrame)
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

  const fetchContents = useMemoizedFn((frame) => {
    setLoading(true)
    fetchConcurrentStreamContents(frame)
      .then((entries) => {
        rawDataRef.current = entries.rawData
        execFileRecordRef.current = entries.execFileRecord
        childrenTokensRef.current = entries.childrenTokens
      })
      .finally(() => {
        setTimeout(() => {
          setContentVersion((v) => v + 1)
          setLoading(false)
        }, 200)
      })
  })

  // 首次拉取立即执行；后续刷新走 500ms 去抖，合并短时间内的多次推送
  const getRawDataDebounced = useDebounceFn((frame) => fetchContents(frame), {
    wait: 500,
    leading: true,
  }).run
  const getRawData = useMemoizedFn((frame) => {
    getRawDataDebounced(frame)
  })

  // const isTaskDefaultGroup = useMemo(() => {
  //   if (!frame) return false
  //   // 优先用 frame 随身携带的 rootType，无需等待 rawData 拉取完成
  //   if (frame.rootType != null) return frame.rootType === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
  //   const root = rawDataRef.current.get(frame.token)
  //   return root?.type === AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP
  // }, [frame, contentVersion])

  // 刷新：通过 IPC 通知主窗口重新构建并推送最新 frame（含最新 rawData）
  const requestRefresh = useMemoizedFn(() => {
    if (!frame) return
    getRawData(frame)
  })
  const store: AIConcurrentStreamStore = useMemo(() => {
    return {
      session: frame?.session ?? '',
      token: frame?.token ?? '',
      chatType: frame?.chatType ?? 'task',
      childrenTokens: [...childrenTokensRef.current],
      rawData: rawDataRef.current,
      execFileRecord: execFileRecordRef.current,
      renderNum: contentVersion,
    }
  }, [contentVersion])
  const dispatcher: AIConcurrentStreamDispatcher = useMemo(() => {
    return {
      requestRefresh,
    }
  }, [])
  // frame 到达即可渲染卡片：rootType 已随 frame 下发，懒加载 chunk 与 rawData 拉取并行解析
  if (!frame || loading) {
    return <ConcurrentStreamSkeleton variant="page" />
  }

  return (
    <AIConcurrentStreamContent.Provider value={{ store, dispatcher }}>
      <div className={styles.page}>
        <div className={styles.divider} />
        <div className={styles.wrapper}>
          <Suspense fallback={<ConcurrentStreamSkeleton variant="card" />}>
            {/* {isTaskDefaultGroup ? (
              <AIChildWindowTaskDefaultGroupCard token={frame.token} />
            ) : (
              <AIChildWindowConcurrentStreamCard token={frame.token} />
            )} */}
            <AIChildWindowConcurrentStreamCard token={frame.token} />
          </Suspense>
        </div>
      </div>
    </AIConcurrentStreamContent.Provider>
  )
})

export default AIConcurrentStream
