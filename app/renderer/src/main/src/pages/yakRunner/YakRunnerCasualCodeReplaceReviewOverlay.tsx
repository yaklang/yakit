import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'

import { YakitMonacoDiffInline } from '@/components/yakitUI/YakitMonacoDiffInline/YakitMonacoDiffInline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { computeCasualLineHunks, mergeCasualLineHunks } from '@/pages/fuzzer/webFuzzerCasualLineMerge'
import { getFileSuffixFromPath, monacaLanguageType } from '@/pages/yakRunner/utils'
import {
  resolveYaklangCodeChangePath,
  type YakRunnerCasualCodeReplaceReviewPayload,
} from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'

import styles from './YakRunnerCasualCodeReplaceReviewOverlay.module.scss'

function norm(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function guessLanguageFromPath(path?: string, fallbackSuffix?: string): string {
  const suffix = fallbackSuffix?.trim() || (path ? getFileSuffixFromPath(path) : '')
  return monacaLanguageType(suffix) || 'yak'
}

function basename(path?: string): string {
  if (!path?.trim()) return 'Code'
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
}

export interface YakRunnerCasualCodeReplaceReviewOverlayProps {
  roundKey: string
  payload: YakRunnerCasualCodeReplaceReviewPayload
  onApplyRound: (mergedCode: string, done?: boolean) => void
}

const YakRunnerCasualCodeReplaceReviewOverlay = memo(function YakRunnerCasualCodeReplaceReviewOverlayInner(
  props: YakRunnerCasualCodeReplaceReviewOverlayProps,
) {
  const { roundKey, payload, onApplyRound } = props
  const { t } = useI18nNamespaces(['webFuzzer', 'yakRunner'])

  const sessionSnapshot = payload.original
  const incoming = payload.change.code?.content ?? ''
  const filePath = resolveYaklangCodeChangePath(payload.change) || payload.fileName
  const diffLanguage = guessLanguageFromPath(filePath, payload.language)

  const [reviewBaseline, setReviewBaseline] = useState(sessionSnapshot)
  const [draftIncoming, setDraftIncoming] = useState(incoming)
  const hunks = useMemo(() => computeCasualLineHunks(reviewBaseline, draftIncoming), [reviewBaseline, draftIncoming])
  const [showAcceptMeta, setShowAcceptMeta] = useState(false)
  const acceptMetaHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoDoneRef = useRef(false)
  const hunksRef = useRef(hunks)
  const reviewBaselineRef = useRef(reviewBaseline)
  const draftIncomingRef = useRef(draftIncoming)
  const prevIncomingRef = useRef<string | null>(null)

  const handleAcceptMetaEnter = useMemoizedFn(() => {
    if (acceptMetaHideTimerRef.current) {
      clearTimeout(acceptMetaHideTimerRef.current)
      acceptMetaHideTimerRef.current = null
    }
    setShowAcceptMeta(true)
  })

  const handleAcceptMetaLeave = useMemoizedFn(() => {
    if (acceptMetaHideTimerRef.current) {
      clearTimeout(acceptMetaHideTimerRef.current)
    }
    acceptMetaHideTimerRef.current = setTimeout(() => {
      setShowAcceptMeta(false)
      acceptMetaHideTimerRef.current = null
    }, 80)
  })

  useEffect(() => {
    return () => {
      if (acceptMetaHideTimerRef.current) {
        clearTimeout(acceptMetaHideTimerRef.current)
        acceptMetaHideTimerRef.current = null
      }
    }
  }, [])

  hunksRef.current = hunks

  useEffect(() => {
    reviewBaselineRef.current = reviewBaseline
  }, [reviewBaseline])

  useEffect(() => {
    draftIncomingRef.current = draftIncoming
  }, [draftIncoming])

  useEffect(() => {
    autoDoneRef.current = false
    reviewBaselineRef.current = sessionSnapshot
    draftIncomingRef.current = incoming
    setReviewBaseline(sessionSnapshot)
    setDraftIncoming(incoming)
    prevIncomingRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, sessionSnapshot])

  useEffect(() => {
    if (prevIncomingRef.current === null) {
      prevIncomingRef.current = incoming
      return
    }
    if (prevIncomingRef.current === incoming) return
    prevIncomingRef.current = incoming
    // 同一会话内新的 AI 提案：以最新 payload.original（含已保留 hunks）为 diff 基线
    reviewBaselineRef.current = sessionSnapshot
    setReviewBaseline(sessionSnapshot)
    draftIncomingRef.current = incoming
    setDraftIncoming(incoming)
  }, [incoming, sessionSnapshot])

  useEffect(() => {
    if (hunks.length !== 0) {
      autoDoneRef.current = false
      return
    }
    if (norm(reviewBaseline) !== norm(draftIncoming)) return
    if (autoDoneRef.current) return
    autoDoneRef.current = true
    onApplyRound(reviewBaselineRef.current, true)
  }, [hunks, reviewBaseline, draftIncoming, onApplyRound])

  const setChangeDecision = useMemoizedFn((idx: number, v: 'accept' | 'reject') => {
    const hs = hunksRef.current
    if (!hs[idx]) return
    const rb = reviewBaselineRef.current
    const di = draftIncomingRef.current
    const decMap: Record<string, 'accept' | 'reject'> = {}
    hs.forEach((h, j) => {
      decMap[h.id] = j === idx ? v : v === 'accept' ? 'reject' : 'accept'
    })
    if (v === 'accept') {
      const merged = mergeCasualLineHunks(rb, hs, decMap)
      reviewBaselineRef.current = merged
      setReviewBaseline(merged)
      onApplyRound(merged, false)
      return
    }
    const nextDraft = mergeCasualLineHunks(rb, hs, decMap)
    draftIncomingRef.current = nextDraft
    setDraftIncoming(nextDraft)
  })

  const handleRejectAll = useMemoizedFn(() => {
    const rb = reviewBaselineRef.current
    draftIncomingRef.current = rb
    setDraftIncoming(rb)
    onApplyRound(rb, true)
  })

  const handleAcceptAll = useMemoizedFn(() => {
    const hs = hunksRef.current
    const rb = reviewBaselineRef.current
    const decMap: Record<string, 'accept' | 'reject'> = {}
    hs.forEach((h) => {
      decMap[h.id] = 'accept'
    })
    const merged = mergeCasualLineHunks(rb, hs, decMap)
    reviewBaselineRef.current = merged
    draftIncomingRef.current = merged
    setReviewBaseline(merged)
    setDraftIncoming(merged)
    onApplyRound(merged, true)
  })

  const acceptMetaPreview = useMemo(() => {
    const change = payload.change
    const { code, ...rest } = change
    const { content: _content, ...codeMeta } = code || {}
    return {
      ...rest,
      code: codeMeta,
    }
  }, [payload.change])

  const bulkExtra =
    hunks.length > 0 ? (
      <div className={styles.bulkExtra}>
        <YakitButton size={'small'} type="outline1" onClick={handleRejectAll}>
          {t('HTTPFuzzerPage.aiCasualRejectAll')}
        </YakitButton>
        <div className={styles.bulkAcceptWrap}>
          <YakitButton
            onClick={handleAcceptAll}
            size={'small'}
            onMouseEnter={handleAcceptMetaEnter}
            onMouseLeave={handleAcceptMetaLeave}
          >
            {t('HTTPFuzzerPage.aiCasualAcceptAll')}
          </YakitButton>
          {showAcceptMeta && (
            <div
              className={styles.acceptMetaCard}
              onMouseEnter={handleAcceptMetaEnter}
              onMouseLeave={handleAcceptMetaLeave}
            >
              <div className={styles.acceptMetaTitle}>
                <div>{t('HTTPFuzzerPage.aiCasualAcceptAllMetaTitle')}</div>
                <CopyComponents
                  className={classNames(styles['copy-icon-style'])}
                  copyText={JSON.stringify(acceptMetaPreview, null, 2)}
                />
              </div>
              {Object.keys(acceptMetaPreview ?? {}).map((it) => {
                const value = (acceptMetaPreview as Record<string, unknown>)?.[it]
                return (
                  <div key={it}>
                    {it}: {value !== undefined && value !== null ? JSON.stringify(value, null, 2) : '-'}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    ) : null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.cardStretch}>
        <div className={styles.cardHeader}>
          <span>{basename(filePath)}</span>
          {bulkExtra}
        </div>
        <div className={styles.diffWrap}>
          <YakitMonacoDiffInline
            reuseKey={roundKey}
            original={reviewBaseline}
            incoming={draftIncoming}
            hunks={hunks}
            onDecision={setChangeDecision}
            language={diffLanguage}
          />
        </div>
      </div>
    </div>
  )
})

YakRunnerCasualCodeReplaceReviewOverlay.displayName = 'YakRunnerCasualCodeReplaceReviewOverlay'

export { YakRunnerCasualCodeReplaceReviewOverlay }
