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
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import ConcurrentStreamSkeleton from '@/auxWindow/components/ConcurrentStreamSkeleton/ConcurrentStreamSkeleton'

// 子卡片按需加载，避免重型卡片（AINodeItem 及其下游 review/report/fuzz 等子卡）
// 全量进入 aux bundle，拉长 did-finish-load 与首次开窗耗时。
const AIChildWindowConcurrentStreamCard = lazy(
  () =>
    import('@/pages/ai-agent/components/ConcurrentStreamCard/aiChildWindowConcurrentStreamCard/AIChildWindowConcurrentStreamCard'),
)

interface AIConcurrentStreamProps {
  windowId: string
}

/**
 * 浅比较两个 AIChatQSData 是否等价（只比较常用字段，避免深比较开销）。
 * data 内部为流式原地累加的对象，引用不同即视为不等价时会产生大量误报增量，
 * 因此对 content / status / selectors / type 等关键字段做值级比较。
 */
function shallowEqualQSData(a: AIChatQSData, b: AIChatQSData): boolean {
  if (a.type !== b.type) return false
  if (a.id !== b.id) return false
  const da = a.data as Record<string, unknown> | undefined
  const db = b.data as Record<string, unknown> | undefined
  if (da === db) return true
  if (!da || !db) return false
  const keys = new Set([...Object.keys(da), ...Object.keys(db)])
  for (const key of keys) {
    if (key === 'reference') continue
    if (da[key] !== db[key]) return false
  }
  return true
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
  // 按 token 粒度的内容版本：每次拉取 diff 旧数据，只有变化的 token 递增版本。
  // 子卡片按各自 token 的版本订阅，避免全局 renderNum 递增导致全树重渲染
  // （全量重渲染会长时间占用主线程，拖动滚动条时更新被推迟到 mouseup，表现为"松手才跳位"）。
  const tokenVersionsRef = useRef<Map<string, number>>(new Map())

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
        // diff 旧 rawData：只对内容发生变化的 token 递增版本号，
        // 未变化的 token 版本保持不变，对应卡片的 memo 依旧命中、不重渲染。
        const prevRaw = rawDataRef.current
        const nextRaw = entries.rawData
        const versions = tokenVersionsRef.current
        /** 组 token 聚合：组内任一子节点变化时组版本也递增（组卡片扫 rawData 找子节点） */
        const bumpVersion = (token: string) => {
          versions.set(token, (versions.get(token) || 0) + 1)
        }
        nextRaw.forEach((next, token) => {
          const prev = prevRaw.get(token)
          if (prev === next) return
          if (prev && shallowEqualQSData(prev, next)) return
          bumpVersion(token)
          if (next?.parentGroupToken) bumpVersion(next.parentGroupToken)
        })
        prevRaw.forEach((prev, token) => {
          // 旧数据里存在、新数据里已删除的 token 同样视为变化
          if (!nextRaw.has(token)) {
            bumpVersion(token)
            if (prev?.parentGroupToken) bumpVersion(prev.parentGroupToken)
          }
        })
        rawDataRef.current = nextRaw
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
      tokenVersions: tokenVersionsRef.current,
    }
  }, [contentVersion, frame])
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
            <AIChildWindowConcurrentStreamCard token={frame.token} />
          </Suspense>
        </div>
      </div>
    </AIConcurrentStreamContent.Provider>
  )
})

export default AIConcurrentStream
