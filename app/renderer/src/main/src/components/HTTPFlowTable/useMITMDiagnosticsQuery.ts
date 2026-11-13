import { useEffect, useState } from 'react'
import type { MITMDiagnosticsQuery, MITMDiagnosticsResponse } from './MITMDiagnostics.types'

interface QueryState {
  query: MITMDiagnosticsQuery
  result?: MITMDiagnosticsResponse
  failed?: boolean
}

export const useMITMDiagnosticsQuery = (
  query: MITMDiagnosticsQuery | undefined,
  refresh = false,
  revision?: string,
) => {
  const [state, setState] = useState<QueryState>()

  useEffect(() => {
    if (!query) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      try {
        const { ipcRenderer } = window.require('electron')
        const result: MITMDiagnosticsResponse = await ipcRenderer.invoke('mitmV2-get-diagnostics', query)
        if (!active) return
        if (result.SessionId && result.SessionId !== query.SessionId) {
          setState({ query, result: { Ended: true } })
          return
        }
        setState({ query, result })
        if (result.Ended || result.Unsupported || result.Missing) return
      } catch {
        if (!active) return
        setState((prev) => ({ query, failed: true, result: prev?.query === query ? prev?.result : undefined }))
      }
      if (refresh && active) timer = setTimeout(load, 3000)
    }
    void load()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, refresh, revision])

  return state?.query === query ? state : undefined
}
