import { useLayoutEffect, useRef } from 'react'
import type { editor, IRange } from 'monaco-editor'
import { getHiddenHTTPHeaderRanges } from './hiddenHTTPHeaders'

// Monaco 0.40 provides this view-only API on CodeEditorWidget, but omits it from monaco.d.ts.
type HeaderVisibilityEditor = editor.IStandaloneCodeEditor & {
  setHiddenAreas: (ranges: IRange[], source: object) => void
}

export function useHiddenHTTPHeaders(
  editor: editor.IStandaloneCodeEditor | undefined,
  enabled: boolean,
  isResponse: boolean,
  headerNames?: readonly string[],
  onDocumentChange?: () => void,
) {
  // Monaco retains empty sources, so reuse the same key across toggles and list edits.
  const hiddenAreaSource = useRef({})
  useLayoutEffect(() => {
    if (!enabled || !editor?.getModel()) return
    const packetEditor = editor as HeaderVisibilityEditor
    // A separate source keeps the HTTP header ranges independent of normal body folding.
    const source = hiddenAreaSource.current
    let disposed = false
    let revealed = false
    const update = () => {
      if (disposed || revealed) return
      const model = packetEditor.getModel()
      packetEditor.setHiddenAreas(model ? getHiddenHTTPHeaderRanges(model, isResponse, headerNames) : [], source)
    }
    const change = () => {
      if (disposed || revealed) return
      if (onDocumentChange) {
        // Clear before notifying React; later events in this transaction must not refold.
        revealed = true
        packetEditor.setHiddenAreas([], source)
        onDocumentChange()
      } else update()
    }
    const subscriptions = [
      packetEditor.onDidChangeModelContent(change),
      packetEditor.onDidChangeModel(change),
      packetEditor.onDidDispose(() => {
        disposed = true
      }),
    ]
    update()
    return () => {
      subscriptions.forEach((subscription) => subscription.dispose())
      if (!disposed) packetEditor.setHiddenAreas([], source)
    }
  }, [editor, enabled, isResponse, headerNames, onDocumentChange])
}
