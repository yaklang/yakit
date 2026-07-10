import { memo, useEffect, useRef } from 'react'
import { useUpdateEffect } from 'ahooks'
import { monaco } from 'react-monaco-editor'
import type * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api'

import '@/utils/monacoSpec/fuzzHTTPMonacoSpec'
import '@/utils/monacoSpec/html'
import '@/utils/monacoSpec/syntaxflowEditor'
import '@/utils/monacoSpec/yakEditor'
import { applyYakitMonacoTheme } from '@/utils/monacoSpec/theme'
import { useTheme } from '@/hook/useTheme'
import { useEditorFontSize } from '@/store/editorFontSize'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
import styles from './YakitMonacoDiffInline.module.scss'

const tOriginal = i18n.getFixedT(null, ['yakitUi'])

export type YakitMonacoDiffInlineDecision = 'accept' | 'reject' | null

/** 行级 hunk 的最小结构（兼容上层根据 `diffLines` 合并后的块） */
export interface YakitMonacoDiffInlineHunk {
  /** baseline 中该 hunk 起始行索引（0-based） */
  origStart: number
  /** baseline 端被替换/删除的原行 */
  origLines: string[]
  /** 提案端用于替换/插入的新行 */
  newLines: string[]
}

export interface YakitMonacoDiffInlineProps {
  /** 同一会话内稳定的 key；变化时强制重挂 Monaco */
  reuseKey: string
  original: string
  incoming: string
  /** 与 `diffLines` 行级 hunk 对齐的审阅块（避免 Monaco getLineChanges 拆块） */
  hunks: YakitMonacoDiffInlineHunk[]
  onDecision: (hunkIndex: number, v: 'accept' | 'reject') => void
  language?: string
}

function pickLabels(): {
  nav: (current: number, total: number) => string
  keep: string
  undo: string
} {
  return {
    nav: (current, total) => `${current} / ${total}`,
    keep: tOriginal('YakitButton.keep'),
    undo: tOriginal('YakitButton.undo'),
  }
}

/** 由 hunks 顺序累加推算第 i 个 hunk 在 modified 端的末行（1-based），不依赖 Monaco ILineChange */
function modEndLineForHunk(hunks: YakitMonacoDiffInlineHunk[], i: number, modMax: number): number {
  const h = hunks[i]
  let prevOrigConsumed = 0
  let prevNewProduced = 0
  for (let j = 0; j < i; j++) {
    prevOrigConsumed += hunks[j].origLines.length
    prevNewProduced += hunks[j].newLines.length
  }
  const modStart1 = 1 + (h.origStart - prevOrigConsumed) + prevNewProduced
  const newLen = h.newLines.length
  const modEnd1 = newLen > 0 ? modStart1 + newLen - 1 : Math.max(1, modStart1 - 1)
  return Math.min(Math.max(1, modEnd1), modMax)
}

type DiffWidgetHost = {
  remountWidgets: (after?: () => void) => void
}

/**
 * 内联 diff 审阅器：以行级 hunk 为单位在 modified 末行下方挂浮条，
 * 提供「撤销 / 保留」逐块决策。文案可由调用方注入。
 */
export const YakitMonacoDiffInline = memo(function YakitMonacoDiffInlineInner(props: YakitMonacoDiffInlineProps) {
  const { reuseKey, original, incoming, hunks, onDecision, language = 'http' } = props

  const { i18n } = useI18nNamespaces([])
  const lng = i18n.language

  const { initFontSize, fontSize } = useEditorFontSize()
  const { theme } = useTheme()
  const editorHostRef = useRef<HTMLDivElement>(null)
  const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor | null>(null)
  const widgetHostRef = useRef<DiffWidgetHost | null>(null)
  const onDecisionRef = useRef(onDecision)
  const hunksRef = useRef(hunks)

  onDecisionRef.current = onDecision
  hunksRef.current = hunks

  useEffect(() => {
    initFontSize()
  }, [initFontSize])

  useEffect(() => {
    applyYakitMonacoTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!editorHostRef.current) return

    let disposed = false
    let widgetDisposables: monacoEditor.IDisposable[] = []
    let overlayEl: HTMLDivElement | null = null
    const overlayBars: Array<{
      lineNumber: number
      stackIndex: number
      dom: HTMLDivElement
    }> = []

    const diffEditor = monaco.editor.createDiffEditor(editorHostRef.current, {
      enableSplitViewResizing: false,
      renderSideBySide: false,
      originalEditable: false,
      readOnly: true,
      automaticLayout: true,
      wordWrap: 'on',
      fontSize,
      contextmenu: false,
    })
    diffEditorRef.current = diffEditor

    const originalModel = monaco.editor.createModel(original, language)
    const modifiedModel = monaco.editor.createModel(incoming, language)
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })

    let mountGen = 0

    const getModifiedModel = () => diffEditor.getModel()?.modified ?? null

    const clearWidgets = () => {
      widgetDisposables.forEach((d) => d.dispose())
      widgetDisposables = []
      overlayBars.splice(0, overlayBars.length).forEach(({ dom }) => dom.remove())
      if (overlayEl) overlayEl.remove()
      overlayEl = null
    }

    const mountHunkWidgets = (after?: () => void) => {
      if (disposed) return
      clearWidgets()

      const items = hunksRef.current
      if (items.length === 0) {
        after?.()
        return
      }

      const modifiedModel = getModifiedModel()
      const modEditor = diffEditor.getModifiedEditor()
      if (!modifiedModel || modifiedModel.isDisposed()) {
        after?.()
        return
      }

      overlayEl = document.createElement('div')
      overlayEl.style.position = 'absolute'
      overlayEl.style.inset = '0'
      overlayEl.style.pointerEvents = 'none'
      editorHostRef.current?.parentElement?.appendChild(overlayEl)

      const updatePositions = () => {
        if (!editorHostRef.current) return
        if (!overlayEl) return
        if (!overlayEl.parentElement) return

        const overlayRect = overlayEl.getBoundingClientRect()
        const editorDom = modEditor.getDomNode() as HTMLElement | null
        const editorRect = editorDom?.getBoundingClientRect()
        if (!editorRect) return

        const scrollTopOffset = editorRect.top - overlayRect.top
        const scrollLeftOffset = editorRect.left - overlayRect.left
        const marginX = 10
        const gapX = 8
        const gapY = 4
        const visibleRanges = modEditor.getVisibleRanges()
        const pad = 4
        const stackGap = 4
        const maxBottom = overlayRect.height - pad
        overlayBars.forEach((item) => {
          const visible = visibleRanges.some(
            (r) => item.lineNumber >= r.startLineNumber && item.lineNumber <= r.endLineNumber,
          )
          item.dom.style.display = visible ? 'inline-flex' : 'none'
          if (!visible) return

          const barHeight = item.dom.offsetHeight || 32
          const ln = item.lineNumber
          const visCol1 = modEditor.getScrolledVisiblePosition({
            lineNumber: ln,
            column: 1,
          })
          if (!visCol1) {
            item.dom.style.display = 'none'
            return
          }

          const maxCol = modifiedModel.getLineMaxColumn(ln)
          const lastCol = Math.max(1, maxCol > 1 ? maxCol - 1 : 1)
          const visTail =
            modEditor.getScrolledVisiblePosition({
              lineNumber: ln,
              column: lastCol,
            }) || visCol1
          const visTailWidth = (visTail as unknown as { width: number }).width
          const rowTop = scrollTopOffset + visTail.top
          const rowBottom = scrollTopOffset + visTail.top + visTail.height
          const textRight = scrollLeftOffset + visTail.left + visTailWidth
          const editorRight = scrollLeftOffset + editorRect.width - marginX

          const barBox = item.dom.getBoundingClientRect()
          const barW = barBox.width > 2 ? barBox.width : item.dom.offsetWidth || 220

          let leftPx = textRight + gapX
          const fitsRightOfText = leftPx + barW <= editorRight
          if (!fitsRightOfText) {
            leftPx = Math.max(scrollLeftOffset + marginX, editorRight - barW)
          }

          const stackOffset = item.stackIndex * (barHeight + stackGap)
          let baseTop: number
          if (fitsRightOfText) {
            baseTop = rowTop + Math.max(0, (visTail.height - barHeight) / 2)
          } else {
            baseTop = rowBottom + gapY
          }
          let topPx = baseTop + stackOffset

          if (topPx + barHeight > maxBottom) {
            const aboveTailRow = rowTop - barHeight - 2 - stackOffset
            const aboveFirstRow = scrollTopOffset + visCol1.top - barHeight - 2 - stackOffset
            if (aboveTailRow >= pad) {
              topPx = aboveTailRow
            } else if (aboveFirstRow >= pad) {
              topPx = aboveFirstRow
            } else {
              topPx = Math.max(pad, Math.min(topPx, maxBottom - barHeight))
            }
          }

          item.dom.style.top = `${Math.max(0, topPx)}px`
          const editorLeftMin = scrollLeftOffset + marginX
          const editorLeftMax = scrollLeftOffset + editorRect.width - barW - marginX
          leftPx = Math.max(editorLeftMin, Math.min(leftPx, editorLeftMax, overlayRect.width - barW - marginX))
          item.dom.style.left = `${leftPx}px`
          item.dom.style.right = 'auto'
        })
      }

      widgetDisposables.push(modEditor.onDidLayoutChange(() => updatePositions()))
      widgetDisposables.push(modEditor.onDidScrollChange(() => updatePositions()))
      requestAnimationFrame(() => updatePositions())

      const stackByLine = new Map<number, number>()
      const modMax = modifiedModel.getLineCount()
      const labels = pickLabels()

      const scrollToHunkIndex = (targetIdx: number) => {
        if (targetIdx < 0 || targetIdx >= items.length) return
        const max = modifiedModel.getLineCount()
        const ln = modEndLineForHunk(items, targetIdx, max)
        modEditor.revealLineInCenterIfOutsideViewport(ln)
        requestAnimationFrame(() => updatePositions())
      }

      items.forEach((h, i) => {
        const lineNumber = modEndLineForHunk(items, i, modMax)
        const stackIndex = stackByLine.get(lineNumber) ?? 0
        stackByLine.set(lineNumber, stackIndex + 1)

        const bar = document.createElement('div')
        bar.className = styles.floatingBar

        const prevBtn = document.createElement('button')
        prevBtn.type = 'button'
        prevBtn.className = styles.btnNav
        prevBtn.setAttribute('aria-label', 'prev-hunk')
        prevBtn.textContent = '‹'
        prevBtn.disabled = items.length < 2 || i === 0

        const nav = document.createElement('span')
        nav.className = styles.floatingNav
        nav.textContent = labels.nav(i + 1, items.length)

        const nextBtn = document.createElement('button')
        nextBtn.type = 'button'
        nextBtn.className = styles.btnNav
        nextBtn.setAttribute('aria-label', 'next-hunk')
        nextBtn.textContent = '›'
        nextBtn.disabled = items.length < 2 || i === items.length - 1

        const sep = document.createElement('span')
        sep.className = styles.floatingSep

        const undoBtn = document.createElement('button')
        undoBtn.type = 'button'
        undoBtn.className = styles.btnUndo
        undoBtn.textContent = labels.undo

        const keepBtn = document.createElement('button')
        keepBtn.type = 'button'
        keepBtn.className = styles.btnKeep
        keepBtn.textContent = labels.keep

        bar.append(prevBtn, nav, nextBtn, sep, undoBtn, keepBtn)
        bar.style.pointerEvents = 'auto'
        bar.style.display = 'none'

        prevBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          scrollToHunkIndex(i - 1)
        })
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          scrollToHunkIndex(i + 1)
        })

        undoBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onDecisionRef.current(i, 'reject')
        })
        keepBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onDecisionRef.current(i, 'accept')
        })

        overlayEl?.appendChild(bar)
        overlayBars.push({ lineNumber, stackIndex, dom: bar })
      })

      after?.()
    }

    const remountWidgets = (after?: () => void) => {
      if (disposed) return
      const gen = ++mountGen

      const tryMount = () => {
        if (disposed || gen !== mountGen) return false
        const modifiedModel = getModifiedModel()
        if (!modifiedModel || modifiedModel.isDisposed()) return false
        if (diffEditor.getLineChanges() !== null) {
          mountHunkWidgets(after)
          return true
        }
        return false
      }

      if (tryMount()) return

      const diffEditorAny = diffEditor as monacoEditor.editor.IStandaloneDiffEditor & {
        onDidUpdateDiff?: (listener: () => void) => monacoEditor.IDisposable
      }
      const sub = diffEditorAny.onDidUpdateDiff?.(() => {
        sub?.dispose()
        tryMount()
      })
      if (sub) widgetDisposables.push(sub)

      let frames = 0
      const poll = () => {
        if (disposed || gen !== mountGen) return
        if (tryMount()) return
        frames++
        if (frames > 240) {
          mountHunkWidgets(after)
          return
        }
        requestAnimationFrame(poll)
      }
      requestAnimationFrame(poll)
    }

    widgetHostRef.current = { remountWidgets }
    remountWidgets()

    return () => {
      disposed = true
      widgetHostRef.current = null
      clearWidgets()
      diffEditor.dispose()
      originalModel.dispose()
      modifiedModel.dispose()
      diffEditorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuseKey, language])

  useUpdateEffect(() => {
    const diffEditor = diffEditorRef.current
    if (!diffEditor) return
    const prevModels = diffEditor.getModel()
    const modEditor = diffEditor.getModifiedEditor()
    const scrollTop = modEditor.getScrollTop()
    const scrollLeft = modEditor.getScrollLeft()

    const originalModel = monaco.editor.createModel(original, language)
    const modifiedModel = monaco.editor.createModel(incoming, language)
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })
    prevModels?.original.dispose()
    prevModels?.modified.dispose()

    widgetHostRef.current?.remountWidgets(() => {
      modEditor.setScrollTop(scrollTop)
      modEditor.setScrollLeft(scrollLeft)
    })
  }, [original, incoming, hunks, language])

  useUpdateEffect(() => {
    widgetHostRef.current?.remountWidgets()
  }, [lng])

  useUpdateEffect(() => {
    diffEditorRef.current?.updateOptions({ fontSize })
  }, [fontSize])

  return (
    <div className={styles.outerHost}>
      <div ref={editorHostRef} className={styles.editorHost} />
    </div>
  )
})

YakitMonacoDiffInline.displayName = 'YakitMonacoDiffInline'
