import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseStreamingTypewriterOptions {
  /** 每次输出的字符数，默认 1 */
  step?: number
  /** 打字间隔时间（毫秒），默认 16 (约60fps) */
  interval?: number
  /** 是否启用打字效果，默认 true */
  enabled?: boolean
  /**
   * 流是否已经结束。
   * 流结束后必须保证最终展示的内容等于完整目标内容，
   * 不能被打字机的中间截断状态污染。
   */
  finished?: boolean
  /** 打字完成回调（当显示内容追上目标内容时触发） */
  onCatchUp?: () => void
}

export interface UseStreamingTypewriterResult {
  /** 当前显示的文本 */
  displayedContent: string
  /** 是否正在打字（显示内容还没追上目标内容） */
  isTyping: boolean
  /** 立即显示全部内容 */
  finish: () => void
}

/**
 * 平滑流式打字效果 Hook
 * 用于将后端大块推送的内容平滑成逐字输出
 *
 * @param targetContent 目标文本内容（后端推送的完整内容）
 * @param options 配置选项
 *
 * @example
 * ```tsx
 * const { displayedContent, isTyping } = useStreamingTypewriter(backendContent, {
 *     step: 2,         // 每次输出2个字符
 *     interval: 16,    // 16ms 间隔（约60fps）
 *     enabled: shouldType, // 由 useStreamingChatContent 返回的 shouldType 控制
 * })
 * ```
 */
export function useStreamingTypewriter(
  targetContent: string,
  options: UseStreamingTypewriterOptions = {},
): UseStreamingTypewriterResult {
  const { step = 1, interval = 16, enabled = true, finished = false, onCatchUp } = options

  // 当前显示的内容长度
  const [displayedLength, setDisplayedLength] = useState<number>(0)

  const timerRef = useRef<number | null>(null)
  const targetContentRef = useRef<string>(targetContent)
  const onCatchUpRef = useRef(onCatchUp)

  // 更新引用
  targetContentRef.current = targetContent
  onCatchUpRef.current = onCatchUp

  // 清除定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 立即显示全部内容
  const finish = useCallback(() => {
    clearTimer()
    setDisplayedLength(targetContentRef.current.length)
  }, [clearTimer])

  // 核心打字逻辑
  // 采用「单步 + effect 自驱动」模式：每个定时器只推进一步，
  // 推进后通过 setState 触发重渲染，effect 依据最新 displayedLength 决定是否再调度下一步。
  // 关键点：
  //   1. 不在 setState updater 内部产生副作用（调度定时器），避免 StrictMode/并发模式下重复调度导致定时器泄漏与乱序。
  //   2. 每次 effect 重跑都通过 cleanup 清理上一个定时器，保证任意时刻最多只有一个待执行定时器，彻底消除竞争。
  useEffect(() => {
    // 禁用打字效果，或流已结束时，直接停止打字（最终内容由 displayedContent 兜底为完整内容）
    if (!enabled || finished) {
      clearTimer()
      setDisplayedLength(targetContent.length)
      return
    }

    // 已追上目标内容：停止并触发回调
    if (displayedLength >= targetContent.length) {
      clearTimer()
      onCatchUpRef.current?.()
      return
    }

    // 调度单步推进
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setDisplayedLength((prev) => Math.min(prev + step, targetContentRef.current.length))
    }, interval)

    return () => {
      clearTimer()
    }
  }, [targetContent, displayedLength, enabled, finished, step, interval, clearTimer])

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  // 流结束后强制以完整内容为准，避免任何残留的截断切片污染最终渲染
  const displayedContent = !enabled || finished ? targetContent : targetContent.slice(0, displayedLength)

  const isTyping = enabled && !finished && displayedLength < targetContent.length

  return {
    displayedContent,
    isTyping,
    finish,
  }
}
