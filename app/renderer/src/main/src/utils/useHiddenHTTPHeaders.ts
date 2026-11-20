import { useLayoutEffect, useRef } from 'react'
import type { editor, IRange } from 'monaco-editor'
import type { IFindController } from '@/components/yakitUI/YakitEditor/constants'
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
  onSearchReveal?: () => void,
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
    let hiddenRanges: IRange[] = []
    const findState = packetEditor.getContribution<IFindController>('editor.contrib.findController')?.getState()
    const reveal = (notify?: () => void) => {
      if (disposed || revealed) return
      // Clear before notifying React; later events in this transaction must not refold.
      revealed = true
      packetEditor.setHiddenAreas([], source)
      notify?.()
    }
    const revealSearchMatch = () => {
      const match = findState?.currentMatch
      if (
        findState?.isRevealed &&
        match &&
        hiddenRanges.some(
          (range) => match.startLineNumber <= range.endLineNumber && match.endLineNumber >= range.startLineNumber,
        )
      )
        reveal(onSearchReveal)
    }
    const update = () => {
      if (disposed || revealed) return
      const model = packetEditor.getModel()
      hiddenRanges = model ? getHiddenHTTPHeaderRanges(model, isResponse, headerNames) : []
      packetEditor.setHiddenAreas(hiddenRanges, source)
      revealSearchMatch()
    }
    const change = () => {
      if (disposed || revealed) return
      if (onDocumentChange) {
        reveal(onDocumentChange)
      } else update()
    }
    const replaceModel = () => {
      if (disposed) return
      // 切换报文不是用户编辑：重新应用当前保存的显示状态，避免新报文被强制展开。
      revealed = false
      update()
    }
    const subscriptions = [
      packetEditor.onDidChangeModelContent(change),
      packetEditor.onDidChangeModel(replaceModel),
      packetEditor.onDidDispose(() => {
        disposed = true
      }),
    ]
    if (findState) subscriptions.push(findState.onFindReplaceStateChange(revealSearchMatch))
    update()
    return () => {
      subscriptions.forEach((subscription) => subscription.dispose())
      if (!disposed) packetEditor.setHiddenAreas([], source)
    }
  }, [editor, enabled, isResponse, headerNames, onDocumentChange, onSearchReveal])
}
