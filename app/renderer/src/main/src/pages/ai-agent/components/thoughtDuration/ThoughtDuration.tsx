import { useCreation } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { type FC, memo, useEffect, useRef, useState } from 'react'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'

export interface ThoughtDurationProps {
  /** 稳定 id：单条用 stream token，组用第一条子 token，避免合并成组时重挂丢失秒数 */
  persistKey: string
  /** 流状态：start 开始计时，end 结束；进入时已是 end 则不展示（历史） */
  status?: 'start' | 'end'
}

type ThoughtDurationCache = {
  startedAt: number
  seconds: number
  frozen: boolean
  seenStart: boolean
}

/** sessionId -> persistKey -> 计时缓存；会话卸池时清掉 */
const durationCache = new Map<string, Map<string, ThoughtDurationCache>>()

export const clearThoughtDurationCache = (sessionId?: string) => {
  if (!sessionId) {
    durationCache.clear()
    return
  }
  durationCache.delete(sessionId)
}

/** 开始瞬间展示 1 秒，之后按墙钟取整 */
const deriveSeconds = (startedAt: number) => Math.max(1, 1 + Math.floor((Date.now() - startedAt) / 1000))

const ThoughtDuration: FC<ThoughtDurationProps> = memo((props) => {
  const { persistKey, status } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const sessionId = useCurrentSessionId()
  const sessionCache = sessionId ? durationCache.get(sessionId) : undefined
  const cached = persistKey ? sessionCache?.get(persistKey) : undefined
  const seenStartRef = useRef(cached?.seenStart ?? false)
  const startedAtRef = useRef(cached?.startedAt ?? 0)
  const prevStatusRef = useRef(status)
  const [seconds, setSeconds] = useState(() => {
    if (!cached) return 1
    if (cached.frozen) return cached.seconds
    if (status === 'start' && cached.startedAt) return deriveSeconds(cached.startedAt)
    return cached.seconds
  })

  if (status === 'start') {
    seenStartRef.current = true
    if (!startedAtRef.current) startedAtRef.current = Date.now()
  }

  useEffect(() => {
    if (!sessionId || !persistKey || !seenStartRef.current) return
    let map = durationCache.get(sessionId)
    if (!map) {
      map = new Map()
      durationCache.set(sessionId, map)
    }
    map.set(persistKey, {
      startedAt: startedAtRef.current,
      seconds,
      frozen: status === 'end',
      seenStart: true,
    })
  }, [sessionId, persistKey, seconds, status])

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status
    // 本实例从 start → end 才用墙钟冻结；滚回来已是 end 时沿用缓存，避免把结束后的时间算进去
    if (prev === 'start' && status === 'end' && startedAtRef.current) {
      setSeconds(deriveSeconds(startedAtRef.current))
    }
  }, [status])

  useEffect(() => {
    if (status !== 'start' || !startedAtRef.current) return
    const tick = () => setSeconds(deriveSeconds(startedAtRef.current))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [status])

  const text = useCreation(() => {
    if (seconds < 60) return t('AIChatListItem.thoughtDuration', { seconds })
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    if (rest === 0) return t('AIChatListItem.thoughtDurationMinutes', { minutes })
    return t('AIChatListItem.thoughtDurationMinutesSeconds', { minutes, seconds: rest })
  }, [seconds, t])

  if (!seenStartRef.current) return null

  return <> {text}</>
})

export default ThoughtDuration
