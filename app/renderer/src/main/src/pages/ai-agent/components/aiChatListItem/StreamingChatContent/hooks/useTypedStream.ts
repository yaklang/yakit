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
 *
 * 数据通道设计（关键）：
 * - 调用方传入 getter（getContent / getStatus），而非字符串快照。
 * - 逻辑上 stream chunk 对 rawData.contents 中的同一对象做原地累加（见 aiStream.ts 的 handleStream），
 *   既不换引用也不 bump renderNum，React 感知不到 content 增长。
 * - getter 形式每次调用都读到当前累加后的最新长度，无需父组件重渲染。
 *
 * 行为语义（对齐官方 useStreamingChatContent.shouldType）：
 * - 本生命周期亲眼见过 status === 'start' 才启用打字（shouldType）。
 * - 挂载时已是 'end'（IDB/缓存历史）：shouldType 为 false，直接展示完整内容。
 * - 流结束后（finished）：直接对齐完整内容，不把积压再慢慢打完。
 * - 未见过 start 时内容仍可能增长：心跳对齐全文，但不跑打字动画。
 */
export function useTypedStream(options: UseTypedStreamOptions): UseTypedStreamResult {
  const { getContent, getStatus, step = 2, maxStep = 18, interval = 30, catchUpFrames = 9 } = options

  const [displayed, setDisplayed] = useState<string>(() => getContent())
  const [isTyping, setIsTyping] = useState<boolean>(false)

  // refs：避免在自驱动定时器闭包里依赖会变的 state，消除 effect 抖动与重复订阅
  const finishedRef = useRef(false) // 流已结束
  const shouldTypeRef = useRef(false) // 是否见过 start（对齐官方 shouldType）
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

  // 对齐到完整内容（历史 / finished / 未见过 start）
  const alignToFull = useMemoizedFn((content: string) => {
    if (displayedLenRef.current !== content.length) {
      displayedLenRef.current = content.length
      setDisplayed(content)
    }
    setTyping(false)
  })

  // 单步推进：读最新目标 → shouldType 判定 → 自适应步长揭示或对齐全文
  const scheduleStep = useMemoizedFn(() => {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      const { content, status } = readLatest()
      // 对齐官方：只有亲眼见过 start 才打开打字开关
      if (status === 'start') shouldTypeRef.current = true
      if (status === 'end') finishedRef.current = true

      // 未见过 start：不打字，只对齐全文（缓存历史 / 未开始的流）
      if (!shouldTypeRef.current) {
        alignToFull(content)
        if (finishedRef.current) return
        scheduleStep()
        return
      }

      // 流已结束：对齐官方 finished 语义，直接展示完整内容，不排空打字
      if (finishedRef.current) {
        alignToFull(content)
        return
      }

      const total = content.length
      const len = displayedLenRef.current
      if (len >= total) {
        // 已追上当前目标，流未结束：心跳探测新 chunk
        setTyping(false)
        scheduleStep()
        return
      }
      // 自适应步长：clamp(ceil(剩余 / catchUpFrames), step, maxStep)
      const remaining = total - len
      const dynamicStep = Math.min(
        maxStepRef.current,
        Math.max(stepRef.current, Math.ceil(remaining / catchUpFramesRef.current)),
      )
      const next = Math.min(len + dynamicStep, total)
      displayedLenRef.current = next
      setDisplayed(content.slice(0, next))
      setTyping(next < total)
      scheduleStep()
    }, intervalRef.current)
  })

  useEffect(() => {
    // 重置本次调度的运行态（每次 effect 重跑都从干净状态开始）
    finishedRef.current = false
    shouldTypeRef.current = false
    displayedLenRef.current = 0
    typingRef.current = false

    const initial = readLatest()
    if (initial.status === 'start') shouldTypeRef.current = true
    if (initial.status === 'end') finishedRef.current = true

    // 挂载即 end（历史缓存）：跳过打字，直接对齐
    if (finishedRef.current && !shouldTypeRef.current) {
      alignToFull(initial.content)
      return
    }

    // 挂载即 end 且曾见 start（理论上少见）：同样对齐全文
    if (finishedRef.current) {
      alignToFull(initial.content)
      return
    }

    scheduleStep()

    return () => {
      clearTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { content: displayed, isTyping }
}
