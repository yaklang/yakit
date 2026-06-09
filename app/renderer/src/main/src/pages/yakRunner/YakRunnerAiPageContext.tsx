import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'

import {
  applyYaklangCodeChangeToYakRunnerPage,
  registerYakRunnerPageCasualCodeReview,
  type YakRunnerCasualCodeReviewPayload,
} from '@/pages/yakRunner/yakRunnerAiCodeApplyBridge'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'

export interface YakRunnerAiPageContextValue {
  pageId: string
  casualReviewHead: { id: string; payload: YakRunnerCasualCodeReviewPayload } | null
  onCasualRoundApplyMerged: (mergedCode: string, done?: boolean) => void
  editorApplyNonce: number
}

const YakRunnerAiPageContext = createContext<YakRunnerAiPageContextValue | null>(null)

export function useYakRunnerAiPage(): YakRunnerAiPageContextValue | null {
  return useContext(YakRunnerAiPageContext)
}

export const YakRunnerAiPageBridge: React.FC<{ pageId: string; children: React.ReactNode }> = ({
  pageId,
  children,
}) => {
  const casualReviewQueueIdRef = useRef(0)
  const casualReviewSessionIdRef = useRef<string | null>(null)
  const [casualReviewQueue, setCasualReviewQueue] = useState<
    { id: string; payload: YakRunnerCasualCodeReviewPayload }[]
  >([])
  const [editorApplyNonce, setEditorApplyNonce] = useState(0)

  const onCasualCodeReviewEnqueued = useMemoizedFn((payload: YakRunnerCasualCodeReviewPayload) => {
    const incoming = payload.change.code?.content ?? ''
    const normIncoming = String(incoming).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const normOriginal = String(payload.original ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
    if (normOriginal === normIncoming) {
      if (casualReviewSessionIdRef.current != null) {
        setCasualReviewQueue([])
        casualReviewSessionIdRef.current = null
      }
      return
    }
    if (casualReviewSessionIdRef.current == null) {
      casualReviewQueueIdRef.current += 1
      casualReviewSessionIdRef.current = `yr-${casualReviewQueueIdRef.current}`
    }
    const id = casualReviewSessionIdRef.current
    setCasualReviewQueue([{ id, payload }])
  })

  const onCasualRoundApplyMerged = useMemoizedFn((mergedCode: string, done?: boolean) => {
    const head = casualReviewQueue[0]
    if (!head) return
    const change: AIAgentGrpcApi.YaklangCodeChange = {
      ...head.payload.change,
      code: {
        ...head.payload.change.code,
        content: mergedCode,
      },
    }
    applyYaklangCodeChangeToYakRunnerPage(pageId, change, { skipReplaceDedup: true })
    setEditorApplyNonce((n) => n + 1)
    if (done) {
      setCasualReviewQueue([])
      casualReviewSessionIdRef.current = null
    }
  })

  useLayoutEffect(() => {
    if (!pageId) return
    return registerYakRunnerPageCasualCodeReview(pageId, onCasualCodeReviewEnqueued)
  }, [pageId, onCasualCodeReviewEnqueued])

  const value: YakRunnerAiPageContextValue = {
    pageId,
    casualReviewHead: casualReviewQueue[0] ?? null,
    onCasualRoundApplyMerged,
    editorApplyNonce,
  }

  return <YakRunnerAiPageContext.Provider value={value}>{children}</YakRunnerAiPageContext.Provider>
}
