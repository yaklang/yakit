import React, { memo, useMemo, useState } from 'react'
import classNames from 'classnames'

import { parseInlinePatch, type InlinePatchLine, type InlinePatchLineKind } from './parseInlinePatch'
import styles from './YakitInlinePatchDiff.module.scss'

export interface YakitInlinePatchDiffProps {
  content: string
  className?: string
}

const PREFIX: Record<Exclude<InlinePatchLineKind, 'section' | 'meta' | 'raw'>, string> = {
  context: '|',
  remove: '-',
  add: '+',
}

function RenderPatchText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === ' ') {
      nodes.push(
        <span key={`ws-${i}`} className={styles.ws}>
          ·
        </span>,
      )
      continue
    }
    nodes.push(ch)
  }
  return <>{nodes}</>
}

const PatchLineRow = memo(function PatchLineRowInner({ line }: { line: InlinePatchLine }) {
  if (line.kind === 'meta') {
    return <div className={classNames(styles.line, styles.meta)}>{line.text}</div>
  }
  if (line.kind === 'raw') {
    return (
      <div className={classNames(styles.line, styles.raw)}>
        <span className={styles.text}>
          <RenderPatchText text={line.text} />
        </span>
      </div>
    )
  }

  const lineClass = line.kind === 'context' ? styles.context : line.kind === 'remove' ? styles.remove : styles.add

  return (
    <div className={classNames(styles.line, lineClass)}>
      <span className={styles.prefix}>{PREFIX[line.kind]}</span>
      <span className={styles.text}>
        <RenderPatchText text={line.text} />
      </span>
    </div>
  )
})

const PatchSection = memo(function PatchSectionInner(props: {
  title: string
  lines: InlinePatchLine[]
  defaultCollapsed?: boolean
}) {
  const { title, lines, defaultCollapsed = false } = props
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHeader} onClick={() => setCollapsed((v) => !v)}>
        <span className={classNames(styles.caret, collapsed && styles.caretCollapsed)} aria-hidden>
          ▾
        </span>
        <span className={styles.sectionTitle}>@@ {title}</span>
      </button>
      {!collapsed && (
        <div className={styles.sectionBody}>
          {lines.map((line, idx) => (
            <PatchLineRow key={`${title}-${idx}`} line={line} />
          ))}
        </div>
      )}
    </div>
  )
})

/** 渲染 `*** Begin Patch` 风格的 AI 内联 diff 文本（Yak Runner AI 对话卡片） */
export const YakitInlinePatchDiff = memo(function YakitInlinePatchDiffInner(props: YakitInlinePatchDiffProps) {
  const { content, className } = props
  const doc = useMemo(() => parseInlinePatch(content), [content])

  return (
    <div className={classNames(styles.root, className)}>
      {doc.preamble.length > 0 && (
        <div className={styles.preamble}>
          {doc.preamble.map((line, idx) => (
            <PatchLineRow key={`pre-${idx}`} line={line} />
          ))}
        </div>
      )}
      {doc.sections.map((section, idx) => (
        <PatchSection key={`${section.title}-${idx}`} title={section.title} lines={section.lines} />
      ))}
    </div>
  )
})

YakitInlinePatchDiff.displayName = 'YakitInlinePatchDiff'
