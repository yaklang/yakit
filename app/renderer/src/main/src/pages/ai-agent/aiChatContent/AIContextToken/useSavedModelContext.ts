import { useEffect, useRef, useState } from 'react'
import type { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import { requestModelContext, type ModelContextIdentity } from './modelContextApi'

/** Read and edit a model budget without creating an AI session. */
export function useSavedModelContext(identity: ModelContextIdentity, enabled: boolean) {
  const [result, setResult] = useState<{ key: string; context: AIAgentGrpcApi.ModelContext }>()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)
  const savingRef = useRef(false)
  const key = JSON.stringify([identity.provider, identity.model, identity.context_key, identity.config])

  useEffect(() => {
    const version = ++generation.current
    setError('')
    setSaving(false)
    savingRef.current = false
    if (!enabled || !identity.provider || !identity.model || (!identity.context_key && !identity.config)) {
      setLoading(false)
      return
    }
    setLoading(true)
    requestModelContext(identity)
      .then((context) => {
        if (version === generation.current) setResult({ key, context })
      })
      .catch((err) => {
        if (version === generation.current) setError(String(err))
      })
      .finally(() => {
        if (version === generation.current) setLoading(false)
      })
    return () => {
      generation.current++
    }
  }, [key, enabled, revision])

  const save = (tokens: number, disableAutoAdjust?: boolean) => {
    if (!enabled || loading || savingRef.current || result?.key !== key) return false
    const version = generation.current
    savingRef.current = true
    setSaving(true)
    setError('')
    const request =
      disableAutoAdjust === undefined
        ? requestModelContext(identity, tokens)
        : requestModelContext(identity, tokens, disableAutoAdjust)
    request
      .then((context) => {
        if (version === generation.current) setResult({ key, context })
      })
      .catch((err) => {
        if (version === generation.current) setError(String(err))
      })
      .finally(() => {
        if (version === generation.current) {
          savingRef.current = false
          setSaving(false)
        }
      })
    return true
  }

  return {
    context: result?.key === key ? result.context : undefined,
    loading,
    saving,
    error,
    save,
    refresh: () => {
      if (!savingRef.current) setRevision((value) => value + 1)
    },
  }
}
