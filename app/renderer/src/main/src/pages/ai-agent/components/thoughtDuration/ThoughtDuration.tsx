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
  seconds: number
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

const ThoughtDuration: FC<ThoughtDurationProps> = memo((props) => {
  const { persistKey, status } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const sessionId = useCurrentSessionId()
  const sessionCache = sessionId ? durationCache.get(sessionId) : undefined
  const cached = persistKey ? sessionCache?.get(persistKey) : undefined
  const seenStartRef = useRef(cached?.seenStart ?? false)
  const [seconds, setSeconds] = useState(cached?.seconds ?? 1)

  if (status === 'start') seenStartRef.current = true

  useEffect(() => {
    if (!sessionId || !persistKey || !seenStartRef.current) return
    let map = durationCache.get(sessionId)
    if (!map) {
      map = new Map()
      durationCache.set(sessionId, map)
    }
    map.set(persistKey, { seconds, seenStart: true })
  }, [sessionId, persistKey, seconds])

  useEffect(() => {
    if (status !== 'start') return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
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
