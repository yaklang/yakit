import { useCreation } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { type FC, memo, useEffect, useRef, useState } from 'react'

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

const durationCache = new Map<string, ThoughtDurationCache>()

const ThoughtDuration: FC<ThoughtDurationProps> = memo((props) => {
  const { persistKey, status } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  const cached = persistKey ? durationCache.get(persistKey) : undefined
  const seenStartRef = useRef(cached?.seenStart ?? false)
  const [seconds, setSeconds] = useState(cached?.seconds ?? 1)

  if (status === 'start') seenStartRef.current = true

  useEffect(() => {
    if (!persistKey || !seenStartRef.current) return
    durationCache.set(persistKey, { seconds, seenStart: true })
  }, [persistKey, seconds])

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
