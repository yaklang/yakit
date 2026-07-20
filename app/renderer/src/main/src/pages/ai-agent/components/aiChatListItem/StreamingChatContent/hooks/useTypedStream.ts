// hooks/useTypedStream.ts
import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'

export interface UseTypedStreamOptions {
  /**
   * 实时读取最新目标内容的 getter。
   * 必须是 getter 而非字符串 prop：逻辑上 stream chunk 对 rawData.contents 中的同一对象做原地累加
   * （见 aiStream.ts 的 handleStream：itemData.data.content += chunk），引用不变、不触发重渲染。
   * 若传字符串 prop，闭包会被冻结在挂载那一刻的快照，自驱动打字链与 poll 都读不到增长 → 打字失效。
   * getter 形式（如 () => itemData.data.content）每次调用都读到当前累加后的最新长度，无需父组件重渲染。
   */
  getContent: () => string
  /**
   * 实时读取最新流状态的 getter（'start' | 'end' | undefined）。
   * 同样必须是 getter，理由同 getContent。
   */
  getStatus: () => 'start' | 'end' | undefined
  /** 单步最小输出字符数（下限），默认 2 */
  step?: number
  /** 单步最大输出字符数（上限，保证每次渲染长度不会突然过大），默认 18 */
  maxStep?: number
  /** 打字间隔时间（毫秒，每次渲染间隔），默认 30（约 33fps，平滑且开销可控） */
  interval?: number
  /**
   * 目标排空帧数，默认 9。
   * catchUpFrames * interval ≈ 270ms，接近逻辑数据轮询间隔，
   * 让每批数据连续地铺满到下一批到来，消除"卡一会→突然输出一大段"的卡顿。
   */
  catchUpFrames?: number
}

export interface UseTypedStreamResult {
  /** 用于页面显示的 content（已应用打字效果） */
  content: string
  /** 是否正在打字 */
  isTyping: boolean
}

/**
 * 获取流式聊天内容并应用平滑打字效果，仅返回用于显示的 content。
 * 其余原始字段（reference、NodeId、status、ContentType、selectors 等）请通过 useStreamingChatContent 获取。
 *
 * 数据通道设计（关键）：
 * - 调用方传入 getter（getContent / getStatus），而非字符串快照。
 * - 逻辑上 stream chunk 对 rawData.contents 中的同一对象做原地累加（见 aiStream.ts 的 handleStream），
 *   既不换引用也不 bump renderNum，React 感知不到 content 增长。
 * - 若传字符串 prop，本 hook 闭包会被冻结在挂载那一刻的快照，自驱动打字链与 poll 都读不到增长 → 打字失效，
 *   且只有 status: start→end 时 effect 才重跑 → 命中终态对齐 → 长文一次性爆发。
 * - getter 形式每次调用都读到当前累加后的最新长度，无需父组件重渲染，零 clone、零值比较。
 *
 * 行为语义：
 * - 实时流式（status === 'start'）：启用打字效果，逐字揭示。
 * - 历史记录（挂载时已是 'end'）：跳过打字，直接展示完整内容。
 * - 流结束（status === 'end'）：交给打字机按 maxStep 节奏把剩余积压逐步打完，自然收尾，杜绝一帧爆发。
 * - 挂载时数据未到位（item 不存在 / status 为 undefined）：不提前退出，靠心跳探测拉起。
 *
 * 追上不停摆：打字追上当前目标后，若流未结束，scheduleStep 以 interval 节奏持续心跳探测
 *   rawData.contents 中原地累加（引用不变、不 bump renderNum）的新 chunk，下一拍即恢复推进。
 *   原先靠 300ms setInterval poll 拉起，导致"追上→静默最多 300ms→突然输出一大段"的卡顿；心跳把探测延迟降到 interval。
 */
export function useTypedStream(options: UseTypedStreamOptions): UseTypedStreamResult {
  const { getContent, getStatus, step = 2, maxStep = 18, interval = 30, catchUpFrames = 9 } = options

  const [displayed, setDisplayed] = useState<string>(() => getContent())
  const [isTyping, setIsTyping] = useState<boolean>(false)

  // refs：避免在自驱动定时器闭包里依赖会变的 state，消除 effect 抖动与重复订阅
  const finishedRef = useRef(false) // 流已结束 → 排空后停止
  const displayedLenRef = useRef(0) // 已显示长度（与 displayed 同步，供闭包读取）
  const typingRef = useRef(false) // isTyping 的 ref 镜像，切换时才 setState
  const timerRef = useRef<number | null>(null) // 打字单步定时器

  // getter 用 ref 承载：防御性同步最新闭包，使本 hook 不受父组件重渲染时机影响
  const getContentRef = useRef(getContent)
  const getStatusRef = useRef(getStatus)
  getContentRef.current = getContent
  getStatusRef.current = getStatus

  // 配置项用 ref 承载：effect 不依赖配置，变化在下一步即生效，无需重建整个调度
  const stepRef = useRef(step)
  const maxStepRef = useRef(maxStep)
  const intervalRef = useRef(interval)
  const catchUpFramesRef = useRef(catchUpFrames)
  stepRef.current = step
  maxStepRef.current = maxStep
  intervalRef.current = interval
  catchUpFramesRef.current = catchUpFrames

  // 实时读最新内容与状态（通过 getter 读活属性，无 clone）
  const readLatest = useMemoizedFn((): { content: string; status: 'start' | 'end' | undefined } => {
    return { content: getContentRef.current(), status: getStatusRef.current() }
  })

  // 仅在状态真正切换时 setState，避免无谓重渲染
  const setTyping = useMemoizedFn((v: boolean) => {
    if (typingRef.current !== v) {
      typingRef.current = v
      setIsTyping(v)
    }
  })

  const clearTimer = useMemoizedFn(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  })

  // 单步推进：读最新目标 → 自适应步长揭示 → 未追上则继续调度，追上则按节奏心跳探测
  // 追上时不停摆：流未结束期间以 interval 节奏继续 scheduleStep 探测逻辑数据原地累加的新 chunk，
  //   一旦 content.length 增长，下一拍立即恢复推进，消除"追上→静默等 poll→突然输出一大段"的卡顿。
  // finishedRef 为 true 时（流已结束）排空即彻底停，按 maxStep 节奏收尾，杜绝一帧爆发。
  const scheduleStep = useMemoizedFn(() => {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      const { content, status } = readLatest()
      if (status === 'end') finishedRef.current = true

      const total = content.length
      const len = displayedLenRef.current
      if (len >= total) {
        // 已追上当前目标
        if (finishedRef.current) {
          // 流已结束：彻底停
          setTyping(false)
          return
        }
        // 流未结束：停 typing，但保持心跳探测逻辑数据新 chunk（原地累加不触发重渲染，靠这里感知）
        // 探测频率为 interval（约 30ms），远低于原 pollInterval(300ms)，卡顿感消除
        setTyping(false)
        scheduleStep()
        return
      }
      // 自适应步长：clamp(ceil(剩余 / catchUpFrames), step, maxStep)
      // 既追得上逻辑数据批次，又保证单帧不超过 maxStep，杜绝"一帧爆发一大段"
      const remaining = total - len
      const dynamicStep = Math.min(
        maxStepRef.current,
        Math.max(stepRef.current, Math.ceil(remaining / catchUpFramesRef.current)),
      )
      const next = Math.min(len + dynamicStep, total)
      displayedLenRef.current = next
      setDisplayed(content.slice(0, next))
      setTyping(next < total)
      // 自驱动：仍积压则继续，追上则交由上面分支的心跳保持节奏
      scheduleStep()
    }, intervalRef.current)
  })

  // 把历史态直接对齐到完整内容（仅用于挂载即 end 的历史记录分支，不进入打字循环）
  const alignToFull = useMemoizedFn((content: string) => {
    if (displayedLenRef.current !== content.length) {
      displayedLenRef.current = content.length
      setDisplayed(content)
    }
    setTyping(false)
  })

  useEffect(() => {
    // 重置本次调度的运行态（每次 effect 重跑都从干净状态开始）
    finishedRef.current = false
    displayedLenRef.current = 0
    typingRef.current = false

    // 初始采样：判定本组件是否需要打字（历史记录已是 end → 跳过打字直接对齐）
    const initial = readLatest()
    if (initial.status === 'end') finishedRef.current = true

    // 历史记录或已结束：直接展示完整，不启用任何调度
    if (finishedRef.current) {
      alignToFull(initial.content)
      return
    }

    // 先跑一帧（挂载即可能已有积压）；打字追上后由 scheduleStep 自身心跳保持探测，
    // 无需独立的 setInterval poll——心跳节奏即 interval（约 30ms），远比原 pollInterval(300ms) 贴合，
    // 消除"追上→静默等 poll→突然输出一大段"的卡顿。
    scheduleStep()

    return () => {
      clearTimer()
    }
    // 不依赖 content/status：通过 getter 实时读活属性，自驱动链 + 心跳探测跨渲染持续运行。
    // 不依赖配置项：通过 ref 承载，变化在下一步即生效。
    // readLatest/scheduleStep/alignToFull/clearTimer 均为 useMemoizedFn 稳定引用，无需列入。
    // 仅挂载时建立一次调度；token 切换由父组件卸载/重建实例承担（key 绑定 token）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { content: displayed, isTyping }
}
