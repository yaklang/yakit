export const INLINE_PATCH_BEGIN = '*** Begin Patch'
export const INLINE_PATCH_END = '*** End Patch'

export type InlinePatchLineKind = 'meta' | 'section' | 'context' | 'remove' | 'add' | 'raw'

export interface InlinePatchLine {
  kind: InlinePatchLineKind
  /** 行正文（不含 +/-| 前缀） */
  text: string
}

export interface InlinePatchSection {
  title: string
  lines: InlinePatchLine[]
}

export interface InlinePatchDocument {
  fileName?: string
  preamble: InlinePatchLine[]
  sections: InlinePatchSection[]
}

export function isInlinePatchContent(content: string): boolean {
  return content.trimStart().startsWith(INLINE_PATCH_BEGIN)
}

function stripPatchPrefix(line: string, prefix: '|' | '-' | '+'): string {
  if (!line.startsWith(prefix)) return line
  const rest = line.slice(1)
  return rest.startsWith(' ') ? rest.slice(1) : rest
}

function parsePatchLine(raw: string): InlinePatchLine {
  const line = raw.replace(/\r$/, '')
  const trimmed = line.trimStart()

  if (trimmed.startsWith('***')) {
    const meta = trimmed.slice(3).trimStart()
    if (meta.startsWith('Update File:')) {
      return { kind: 'meta', text: trimmed }
    }
    return { kind: 'meta', text: trimmed }
  }
  if (trimmed.startsWith('@@')) {
    return { kind: 'section', text: trimmed.slice(2).trimStart() }
  }
  if (line.startsWith('|')) {
    return { kind: 'context', text: stripPatchPrefix(line, '|') }
  }
  if (line.startsWith('-')) {
    return { kind: 'remove', text: stripPatchPrefix(line, '-') }
  }
  if (line.startsWith('+')) {
    return { kind: 'add', text: stripPatchPrefix(line, '+') }
  }
  return { kind: 'raw', text: line }
}

function extractUpdateFileName(metaText: string): string | undefined {
  const m = metaText.match(/^Update File:\s*(.+)$/i)
  return m?.[1]?.trim()
}

/** 解析 AI 输出的 `*** Begin Patch` 内联 diff 文本（流式未完成时也尽量渲染） */
export function parseInlinePatch(content: string): InlinePatchDocument {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  const doc: InlinePatchDocument = {
    preamble: [],
    sections: [],
  }

  let currentSection: InlinePatchSection | null = null

  for (const raw of lines) {
    if (raw.trim() === '' && !currentSection && doc.sections.length === 0 && doc.preamble.length === 0) {
      continue
    }
    if (raw.trim() === INLINE_PATCH_END) {
      break
    }

    const parsed = parsePatchLine(raw)

    if (parsed.kind === 'section') {
      currentSection = { title: parsed.text, lines: [] }
      doc.sections.push(currentSection)
      continue
    }

    if (parsed.kind === 'meta') {
      const metaBody = parsed.text.replace(/^\*\*\*\s*/, '')
      if (metaBody.startsWith('Update File:')) {
        doc.fileName = extractUpdateFileName(metaBody)
      }
    }

    if (currentSection) {
      currentSection.lines.push(parsed)
    } else {
      doc.preamble.push(parsed)
    }
  }

  return doc
}
