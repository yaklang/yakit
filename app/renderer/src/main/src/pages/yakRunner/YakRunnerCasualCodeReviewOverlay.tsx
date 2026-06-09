import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'

import type { YakRunnerCasualCodeReviewPayload } from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'
import { YakitMonacoDiffInline } from '@/components/yakitUI/YakitMonacoDiffInline/YakitMonacoDiffInline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { computeCasualLineHunks, mergeCasualLineHunks } from '@/pages/fuzzer/webFuzzerCasualLineMerge'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'

import styles from './YakRunnerCasualCodeReviewOverlay.module.scss'

function norm(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

export interface YakRunnerCasualCodeReviewOverlayProps {
  roundKey: string
  payload: YakRunnerCasualCodeReviewPayload
  onApplyRound: (mergedCode: string, done?: boolean) => void
}

const YakRunnerCasualCodeReviewOverlay = memo(function YakRunnerCasualCodeReviewOverlayInner(
  props: YakRunnerCasualCodeReviewOverlayProps,
) {
  const { roundKey, payload, onApplyRound } = props
  const { t } = useI18nNamespaces(['yakRunner'])
  const sessionSnapshot = payload.original
  const incoming = payload.change.code?.content ?? ''

  const [reviewBaseline, setReviewBaseline] = useState(sessionSnapshot)
  const [draftIncoming, setDraftIncoming] = useState(incoming)
  const hunks = useMemo(() => computeCasualLineHunks(reviewBaseline, draftIncoming), [reviewBaseline, draftIncoming])
  const [diffNonce, setDiffNonce] = useState(0)
  const diffNonceRef = useRef(0)
  const autoDoneRef = useRef(false)
  const hunksRef = useRef(hunks)
  const reviewBaselineRef = useRef(reviewBaseline)
  const draftIncomingRef = useRef(draftIncoming)
  const prevIncomingRef = useRef<string | null>(null)

  const bumpDiffNonce = useMemoizedFn(() => {
    diffNonceRef.current += 1
    setDiffNonce(diffNonceRef.current)
  })

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
    bumpDiffNonce()
    prevIncomingRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, sessionSnapshot, bumpDiffNonce])

  useEffect(() => {
    if (prevIncomingRef.current === null) {
      prevIncomingRef.current = incoming
      return
    }
    if (prevIncomingRef.current === incoming) return
    prevIncomingRef.current = incoming
    draftIncomingRef.current = incoming
    bumpDiffNonce()
    setDraftIncoming(incoming)
  }, [incoming, bumpDiffNonce])

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
    const decMap: Record<string, 'accept' | 'reject'> = {}
    hs.forEach((h, j) => {
      decMap[h.id] = j === idx ? v : v === 'accept' ? 'reject' : 'accept'
    })
    if (v === 'accept') {
      const merged = mergeCasualLineHunks(rb, hs, decMap)
      reviewBaselineRef.current = merged
      setReviewBaseline(merged)
      bumpDiffNonce()
      onApplyRound(merged, false)
      return
    }
    const nextDraft = mergeCasualLineHunks(rb, hs, decMap)
    draftIncomingRef.current = nextDraft
    setDraftIncoming(nextDraft)
    bumpDiffNonce()
  })

  const handleRejectAll = useMemoizedFn(() => {
    const rb = reviewBaselineRef.current
    draftIncomingRef.current = rb
    setDraftIncoming(rb)
    bumpDiffNonce()
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
    bumpDiffNonce()
    onApplyRound(merged, true)
  })

  const bulkExtra =
    hunks.length > 0 ? (
      <div className={styles['bulkExtra']}>
        <YakitButton size="small" type="outline1" onClick={handleRejectAll}>
          {t('YakRunner.aiCasualRejectAll')}
        </YakitButton>
        <YakitButton size="small" onClick={handleAcceptAll}>
          {t('YakRunner.aiCasualAcceptAll')}
        </YakitButton>
      </div>
    ) : null

  return (
    <div className={styles['overlay']} role="dialog" aria-modal="true">
      <div className={styles['cardStretch']}>
        <div className={styles['header']}>
          <span>{t('YakRunner.aiCasualReviewTitle')}</span>
          {bulkExtra}
        </div>
        <div className={styles['diffWrap']}>
          <YakitMonacoDiffInline
            key={`${roundKey}:${diffNonce}:${draftIncoming}`}
            reuseKey={roundKey}
            original={reviewBaseline}
            incoming={draftIncoming}
            hunks={hunks}
            onDecision={setChangeDecision}
            language="yak"
          />
        </div>
      </div>
    </div>
  )
})

YakRunnerCasualCodeReviewOverlay.displayName = 'YakRunnerCasualCodeReviewOverlay'

export { YakRunnerCasualCodeReviewOverlay }
