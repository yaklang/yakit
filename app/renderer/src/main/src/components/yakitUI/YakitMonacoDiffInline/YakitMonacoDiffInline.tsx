import React, { memo, useEffect, useRef } from 'react'
import { useUpdateEffect } from 'ahooks'
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api'

import { useEditorFontSize } from '@/store/editorFontSize'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import styles from './YakitMonacoDiffInline.module.scss'

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

/** 根据 i18n.language 选取浮条文案；不走 i18n keys，避免依赖业务命名空间 */
function pickLabels(lng: string): {
  nav: (current: number, total: number) => string
  keep: string
  undo: string
} {
  const isEn = (lng || '').toLowerCase().startsWith('en')
  return {
    nav: (current, total) => `${current} / ${total}`,
    keep: isEn ? 'Keep' : '保留',
    undo: isEn ? 'Undo' : '撤销',
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

/**
 * 内联 diff 审阅器：以行级 hunk 为单位在 modified 末行下方挂浮条，
 * 提供「撤销 / 保留」逐块决策。文案可由调用方注入。
 */
export const YakitMonacoDiffInline = memo(function YakitMonacoDiffInlineInner(props: YakitMonacoDiffInlineProps) {
  const { reuseKey, original, incoming, hunks, onDecision, language = 'http' } = props

  const { i18n } = useI18nNamespaces([])
  const lng = i18n.language

  const { initFontSize, fontSize } = useEditorFontSize()
  const editorHostRef = useRef<HTMLDivElement>(null)
  const monaco = monacoEditor.editor
  const diffEditorRef = useRef<monacoEditor.editor.IStandaloneDiffEditor | null>(null)

  useEffect(() => {
    initFontSize()
  }, [initFontSize])

  useEffect(() => {
    if (!editorHostRef.current) return

    let disposed = false
    const disposables: monacoEditor.IDisposable[] = []
    let overlayEl: HTMLDivElement | null = null
    const overlayBars: Array<{
      lineNumber: number
      stackIndex: number
      dom: HTMLDivElement
    }> = []

    const diffEditor = monaco.createDiffEditor(editorHostRef.current, {
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

    const originalModel = monaco.createModel(original, language)
    const modifiedModel = monaco.createModel(incoming, language)
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })

    const modEditor = diffEditor.getModifiedEditor()

    const clearWidgets = () => {
      overlayBars.splice(0, overlayBars.length).forEach(({ dom }) => dom.remove())
      if (overlayEl) overlayEl.remove()
      overlayEl = null
    }

    const mountHunkWidgets = (items: YakitMonacoDiffInlineHunk[]) => {
      if (disposed) return
      clearWidgets()

      if (items.length === 0) return

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
          /** Monaco typings 未声明 width，但运行时该字段存在；仅用类型断言读取以避免 TS 报错 */
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

      disposables.push(modEditor.onDidLayoutChange(() => updatePositions()))
      disposables.push(modEditor.onDidScrollChange(() => updatePositions()))
      requestAnimationFrame(() => updatePositions())

      const stackByLine = new Map<number, number>()
      const modMax = modifiedModel.getLineCount()
      const labels = pickLabels(lng)

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
          onDecision(i, 'reject')
        })
        keepBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          onDecision(i, 'accept')
        })

        overlayEl?.appendChild(bar)
        overlayBars.push({ lineNumber, stackIndex, dom: bar })
      })
    }

    let diffMounted = false
    const tryMountFromDiff = () => {
      if (disposed || diffMounted) return true
      const ch = diffEditor.getLineChanges()
      if (ch !== null) {
        diffMounted = true
        mountHunkWidgets(hunks)
        return true
      }
      return false
    }

    if (!tryMountFromDiff()) {
      const diffEditorAny = diffEditor as monacoEditor.editor.IStandaloneDiffEditor & {
        onDidUpdateDiff?: (listener: () => void) => monacoEditor.IDisposable
      }
      const sub = diffEditorAny.onDidUpdateDiff?.(() => {
        if (tryMountFromDiff()) {
          sub?.dispose()
        }
      })
      if (sub) disposables.push(sub)
      let frames = 0
      const poll = () => {
        if (disposed) return
        if (tryMountFromDiff()) return
        frames++
        if (frames > 240) return
        requestAnimationFrame(poll)
      }
      requestAnimationFrame(poll)
    }

    return () => {
      disposed = true
      clearWidgets()
      disposables.forEach((d) => d.dispose())
      diffEditor.dispose()
      originalModel.dispose()
      modifiedModel.dispose()
      diffEditorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuseKey, original, incoming, hunks, language, onDecision, lng])

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
