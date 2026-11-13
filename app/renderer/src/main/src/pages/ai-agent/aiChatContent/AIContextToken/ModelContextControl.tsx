import { useEffect, useRef, useState } from 'react'
import { Tooltip } from 'antd'
import { QuestionMarkCircleOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './ModelContextControl.module.scss'
import { formatContextTokens, MIN_CONTEXT_THRESHOLD_TOKENS } from './contextTokens'
export { formatContextTokens } from './contextTokens'

const DEFAULT_THRESHOLD = 500 * 1000
const LARGE_THRESHOLD_WARNING = 750 * 1000
export const contextUsagePercent = (context: AIAgentGrpcApi.ModelContext) =>
  Math.round((Math.max(0, context.prompt_tokens) / context.threshold_tokens) * 100)
const usageTone = (context: AIAgentGrpcApi.ModelContext) => {
  const percent = contextUsagePercent(context)
  return percent >= 100 ? styles.danger : percent >= 80 ? styles.warning : ''
}

export function ContextUsageRing({ context }: { context?: AIAgentGrpcApi.ModelContext }) {
  const percent = context ? Math.min(100, contextUsagePercent(context)) : 0
  return (
    <svg
      viewBox="0 0 28 28"
      className={`${styles.ring} ${context ? usageTone(context) : styles.unknown}`}
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="9" className={styles.ringTrack} />
      {context && (
        <circle
          cx="14"
          cy="14"
          r="9"
          pathLength="100"
          className={styles.ringValue}
          strokeDasharray={`${percent} 100`}
          transform="rotate(-90 14 14)"
        />
      )}
      <circle cx="14" cy="14" r="2" fill="currentColor" opacity=".55" />
    </svg>
  )
}

export default function ModelContextControl({
  context,
  onChange,
  onAutoAdjustChange,
  status,
  timeoutError = false,
}: {
  context: AIAgentGrpcApi.ModelContext
  onChange?: (tokens: number) => boolean
  onAutoAdjustChange?: (enabled: boolean) => boolean
  status?: 'error'
  timeoutError?: boolean
}) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; value: number; startX: number; startValue: number; width: number } | null>(
    null,
  )
  const [preview, setPreview] = useState<number | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  useEffect(() => {
    drag.current = null
    setPreview(null)
    setDraft(null)
  }, [context.provider, context.model, context.context_key, context.threshold_tokens])

  const threshold = preview ?? context.threshold_tokens
  // The global manual floor must not inherit the old 102,400 value from runtime/history snapshots.
  const min = MIN_CONTEXT_THRESHOLD_TOKENS
  // Keep the scale stable across ordinary edits, expanding only for an existing larger threshold.
  const max = Math.max(
    1000 * 1000,
    Math.ceil(Math.max(context.threshold_tokens, min + 1000) / (1000 * 1000)) * 1000 * 1000,
  )
  const clamp = (value: number) => Math.min(max, Math.max(min, Math.round(value)))
  const ratio = Math.max(0, Math.min(1, (threshold - min) / (max - min)))
  const percent = contextUsagePercent({ ...context, threshold_tokens: threshold })
  const commit = (value: number) => {
    const next = clamp(value)
    if (next !== context.threshold_tokens) onChange?.(next)
    setPreview(null)
  }
  const move = (clientX: number) => {
    const geometry = drag.current
    if (!geometry?.width) return
    geometry.value = Math.min(
      max,
      clamp(
        Math.round((geometry.startValue + ((clientX - geometry.startX) / geometry.width) * (max - min)) / 1000) * 1000,
      ),
    )
    setPreview(geometry.value)
  }
  const finishInput = () => {
    if (draft === null) return
    const tokens = Math.round(Number(draft) * 1000)
    if (draft.trim() && Number.isSafeInteger(tokens)) commit(tokens)
    setDraft(null)
  }
  const warningThreshold = draft !== null && draft.trim() ? Number(draft) * 1000 : threshold
  const notice =
    status === 'error'
      ? timeoutError
        ? 'contextUpdateTimeout'
        : 'contextRequestFailed'
      : warningThreshold > LARGE_THRESHOLD_WARNING
        ? 'contextTooLarge'
        : ''
  const warn = ['contextTooLarge', 'contextRequestFailed', 'contextUpdateTimeout'].includes(notice)

  const automaticAdjustment = !context.disable_auto_adjust && (context.source === 'learned' || context.pending)
  const adjustmentReason = t(
    context.pending
      ? 'AIContextToken.contextAdjustmentPending'
      : context.change?.reason === 'confirmed' && context.change.previous_threshold_tokens > context.threshold_tokens
        ? 'AIContextToken.contextAdjustmentReason'
        : 'AIContextToken.contextAdjustmentSaved',
    {
      previous: formatContextTokens(context.change?.previous_threshold_tokens ?? context.threshold_tokens),
      threshold: formatContextTokens(context.threshold_tokens),
    },
  )

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        <strong>{t('AIContextToken.contextLabel')}</strong>
        <span className={styles.metrics} title={t('AIContextToken.usageOverThreshold')}>
          {formatContextTokens(context.prompt_tokens)} / {formatContextTokens(threshold)}
          <span className={usageTone({ ...context, threshold_tokens: threshold })}>({percent}%)</span>
        </span>
      </div>
      <div
        className={styles.usageTrack}
        role="meter"
        aria-label={t('AIContextToken.usageOverThreshold')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percent)}
        aria-valuetext={`${percent}%`}
      >
        <div
          className={`${styles.usageFill} ${usageTone({ ...context, threshold_tokens: threshold })}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <label className={styles.inputRow}>
        <span>{t('AIContextToken.compressionThreshold')}</span>
        <span className={styles.inputBox}>
          <input
            type="number"
            min={min / 1000}
            max={max / 1000}
            step="0.001"
            value={draft ?? threshold / 1000}
            disabled={!onChange}
            aria-label={t('AIContextToken.compressionThreshold')}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={finishInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                finishInput()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(null)
              }
            }}
          />
          <span>K</span>
        </span>
      </label>
      <div className={styles.slider} ref={track}>
        <div className={styles.sliderRail} />
        <div className={styles.sliderFill} style={{ width: `${ratio * 100}%` }} />
        <button
          type="button"
          role="slider"
          aria-label={t('AIContextToken.compressionThreshold')}
          aria-orientation="horizontal"
          aria-valuemin={Math.min(min, context.threshold_tokens)}
          aria-valuemax={max}
          aria-valuenow={threshold}
          aria-valuetext={`${formatContextTokens(threshold)} tokens`}
          disabled={!onChange}
          className={styles.handle}
          style={{ left: `${ratio * 100}%` }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !onChange) return
            const rect = track.current?.getBoundingClientRect()
            if (!rect?.width) return
            event.preventDefault()
            event.currentTarget.focus()
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = {
              pointerId: event.pointerId,
              value: threshold,
              startX: event.clientX,
              startValue: threshold,
              width: rect.width,
            }
          }}
          onPointerMove={(event) => {
            if (drag.current?.pointerId === event.pointerId) move(event.clientX)
          }}
          onPointerUp={(event) => {
            if (!drag.current || drag.current.pointerId !== event.pointerId) return
            const value = drag.current.value
            drag.current = null
            event.currentTarget.releasePointerCapture(event.pointerId)
            if (value !== context.threshold_tokens) commit(value)
            else setPreview(null)
          }}
          onLostPointerCapture={() => {
            drag.current = null
            setPreview(null)
          }}
          onPointerCancel={() => {
            drag.current = null
            setPreview(null)
          }}
          onKeyDown={(event) => {
            const deltas: Record<string, number> = {
              ArrowUp: 1000,
              ArrowRight: 1000,
              ArrowDown: -1000,
              ArrowLeft: -1000,
              PageUp: 10 * 1000,
              PageDown: -10 * 1000,
            }
            if (deltas[event.key] || event.key === 'Home' || event.key === 'End') {
              event.preventDefault()
              commit(
                event.key === 'Home' ? min : event.key === 'End' ? max : Math.min(max, threshold + deltas[event.key]),
              )
            }
          }}
        >
          <span className={styles.thumb}>
            <svg viewBox="0 0 12 16" width="12" height="16" aria-hidden="true">
              {[4, 8].flatMap((x) =>
                [4, 8, 12].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" />),
              )}
            </svg>
          </span>
        </button>
      </div>
      <div className={styles.scale}>
        <span>{formatContextTokens(min)}</span>
        <button
          type="button"
          className={styles.reset}
          disabled={!onChange || (context.threshold_tokens === DEFAULT_THRESHOLD && draft === null)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraft(null)
            commit(DEFAULT_THRESHOLD)
          }}
        >
          {t('AIContextToken.resetContextThreshold')}
        </button>
        <span>{formatContextTokens(max)}</span>
      </div>
      <div className={styles.autoRow}>
        <div className={styles.autoLabel}>
          <span>{t('AIContextToken.autoAdjust')}</span>
          <Tooltip title={t('AIContextToken.autoAdjustHelp')} trigger={['hover', 'focus']}>
            <button type="button" className={styles.autoHelp} aria-label={t('AIContextToken.autoAdjustHelpLabel')}>
              <QuestionMarkCircleOutlined size={14} color="currentColor" />
            </button>
          </Tooltip>
        </div>
        <YakitSwitch
          size="small"
          aria-label={t('AIContextToken.autoAdjust')}
          checked={!context.disable_auto_adjust}
          disabled={!onAutoAdjustChange}
          onChange={(enabled) => onAutoAdjustChange?.(enabled)}
        />
      </div>
      <div className={styles.footer} aria-live="polite">
        {notice ? (
          <div className={styles.notice}>
            <div role={warn ? 'alert' : 'status'} className={warn ? styles.warning : styles.hint}>
              {t(`AIContextToken.${notice}`)}
            </div>
          </div>
        ) : (
          <div className={styles.metadata}>
            <span className={styles.model} title={`${context.model} · ${t('AIContextToken.perModel')}`}>
              {context.model}
            </span>
            {automaticAdjustment && (
              <Tooltip title={adjustmentReason} trigger={['hover', 'focus']}>
                <span className={styles.adjustment} tabIndex={0}>
                  {t(context.pending ? 'AIContextToken.contextAdjusting' : 'AIContextToken.contextAdjusted')}
                </span>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
