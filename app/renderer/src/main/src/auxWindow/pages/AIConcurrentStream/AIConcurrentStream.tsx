import type React from 'react'
import { lazy, memo, startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { yakitAuxWindow } from '@/services/electronBridge'
import {
  type ConcurrentStreamFramePayload,
  isConcurrentStreamFrame,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import {
  AIChatQSDataTypeEnum,
  type AIYakExecFileRecord,
  type AIChatQSData,
  type ChatStream,
} from '@/pages/ai-re-act/hooks/aiRender'
import { fetchConcurrentStreamContents } from './fetchConcurrentStreamContents'
import styles from './AIConcurrentStream.module.scss'
import AIConcurrentStreamContent, {
  type AIConcurrentStreamDispatcher,
  type AIConcurrentStreamStore,
} from './useContext/AIConcurrentStreamContent'
import { useDebounceFn, useInterval, useMemoizedFn } from 'ahooks'
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

/** 有活跃流（未 end 的 STREAM 项）时的轮询间隔 */
const ACTIVE_POLL_INTERVAL = 2000
/** 空闲时的兜底轮询间隔：可捕获后续新起的活动（如下一批子 Agent） */
const IDLE_POLL_INTERVAL = 10000

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
  // 后台轮询间隔（ms）；undefined 表示未开始（首次数据尚未拉到）
  const [pollInterval, setPollInterval] = useState<number | undefined>(undefined)
  // 拉取进行中的标记：避免轮询与手动刷新并发堆叠请求
  const fetchingRef = useRef<boolean>(false)
  // 是否首次拉取：仅首次展示骨架屏，后续刷新原地 diff 更新，避免整页闪烁
  const initialLoadRef = useRef<boolean>(true)

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
    if (fetchingRef.current) return
    fetchingRef.current = true
    if (initialLoadRef.current) setLoading(true)
    fetchConcurrentStreamContents(frame)
      .then((entries) => {
        const prevRaw = rawDataRef.current
        const nextRaw = entries.rawData
        // 主窗口暂时不可达（IPC 超时/主窗口忙）时返回空数据，直接应用会把已渲染内容清空；
        // 已有数据的情况下跳过空响应，等待下一次拉取恢复
        if (nextRaw.size === 0 && prevRaw.size > 0) return
        // diff 旧 rawData：只对内容发生变化的 token 递增版本号，
        // 未变化的 token 版本保持不变，对应卡片的 memo 依旧命中、不重渲染。
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
        // 是否仍有活跃流：有则快轮询跟进 stdout 增量 / tool_call_watcher 挂载的"跳过"按钮，
        // 无则降频兜底，可捕获后续新起的活动（如下一批子 Agent）
        let hasActiveStream = false
        nextRaw.forEach((item) => {
          if (item?.type !== AIChatQSDataTypeEnum.STREAM) return
          if ((item as ChatStream)?.data?.status !== 'end') hasActiveStream = true
        })
        setPollInterval(hasActiveStream ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL)
      })
      .finally(() => {
        fetchingRef.current = false
        setTimeout(() => {
          initialLoadRef.current = false
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
  // 子窗口数据是主动拉取的快照，主窗口数据变化不会推送过来；
  // 周期性拉取保证长时间运行的工具流（stdout 增量、tool_call_watcher 挂载的"跳过"按钮）
  // 能及时出现在子窗口，而不是只能等手动刷新
  useInterval(() => {
    if (!frame || fetchingRef.current) return
    fetchContents(frame)
  }, pollInterval)
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
