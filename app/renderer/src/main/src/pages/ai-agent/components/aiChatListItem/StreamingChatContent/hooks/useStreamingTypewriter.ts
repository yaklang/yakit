import {useCallback, useEffect, useRef, useState} from "react"

export interface UseStreamingTypewriterOptions {
    /** 每次输出的字符数，默认 1 */
    step?: number
    /** 打字间隔时间（毫秒），默认 16 (约60fps) */
    interval?: number
    /** 是否启用打字效果，默认 true */
    enabled?: boolean
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
    options: UseStreamingTypewriterOptions = {}
): UseStreamingTypewriterResult {
    const {step = 1, interval = 16, enabled = true, onCatchUp} = options

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
    useEffect(() => {
        // 如果禁用打字效果，直接显示全部内容
        if (!enabled) {
            setDisplayedLength(targetContent.length)
            return
        }

        // 如果已经追上了目标内容
        if (displayedLength >= targetContent.length) {
            clearTimer()
            return
        }

        // 启动打字定时器
        const tick = () => {
            setDisplayedLength((prev) => {
                const target = targetContentRef.current
                const nextLength = Math.min(prev + step, target.length)
                
                // 如果追上了目标内容
                if (nextLength >= target.length) {
                    clearTimer()
                    onCatchUpRef.current?.()
                    return target.length
                }
                
                // 继续打字
                timerRef.current = window.setTimeout(tick, interval)
                return nextLength
            })
        }

        // 只有当没有正在运行的定时器时才启动
        if (timerRef.current === null) {
            timerRef.current = window.setTimeout(tick, interval)
        }

        return () => {
            // 注意：这里不清除定时器，因为 targetContent 变化时我们希望继续打字
        }
    }, [targetContent, displayedLength, enabled, step, interval, clearTimer])

    // 组件卸载时清除定时器
    useEffect(() => {
        return () => {
            clearTimer()
        }
    }, [clearTimer])

    // 计算当前显示的内容
    const displayedContent = enabled 
        ? targetContent.slice(0, displayedLength)
        : targetContent

    const isTyping = enabled && displayedLength < targetContent.length

    return {
        displayedContent,
        isTyping,
        finish
    }
}