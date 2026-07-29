import { diffLines } from 'diff'

export type CasualLineHunk = {
  id: string
  /** 在基准文本中该变更起始行（0-based，与 `baseline.split('\n')` 对齐） */
  origStart: number
  origLines: string[]
  newLines: string[]
}

function norm(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function partToLines(value: string): string[] {
  if (!value) return []
  const endsNl = value.endsWith('\n')
  const core = endsNl ? value.slice(0, -1) : value
  return core.split('\n')
}

/** 将基准与 AI 建议拆成行级变更块，供逐块引用/放弃 */
export function computeCasualLineHunks(baseline: string, incoming: string): CasualLineHunk[] {
  const base = norm(baseline)
  const inc = norm(incoming)
  const parts = diffLines(base, inc)
  const hunks: CasualLineHunk[] = []
  let origCursor = 0
  let hid = 0

  let i = 0
  while (i < parts.length) {
    const p = parts[i]
    if (!p.added && !p.removed) {
      origCursor += partToLines(p.value).length
      i++
      continue
    }
    if (p.removed) {
      const origLines = partToLines(p.value)
      const next = parts[i + 1]
      if (next?.added) {
        const newLines = partToLines(next.value)
        hunks.push({
          id: `h${hid++}`,
          origStart: origCursor,
          origLines,
          newLines,
        })
        origCursor += origLines.length
        i += 2
      } else {
        hunks.push({
          id: `h${hid++}`,
          origStart: origCursor,
          origLines,
          newLines: [],
        })
        origCursor += origLines.length
        i += 1
      }
      continue
    }
    if (p.added) {
      const newLines = partToLines(p.value)
      hunks.push({
        id: `h${hid++}`,
        origStart: origCursor,
        origLines: [],
        newLines,
      })
      i++
      continue
    }
    i++
  }
  return hunks
}

/** 按每块的引用/放弃生成合并后的请求正文 */
export function mergeCasualLineHunks(
  baseline: string,
  hunks: CasualLineHunk[],
  decisions: Record<string, 'accept' | 'reject'>,
): string {
  const base = norm(baseline)
  const baseLines = base ? base.split('\n') : []
  const sorted = [...hunks].sort((a, b) => a.origStart - b.origStart)
  let cursor = 0
  const result: string[] = []

  const emitBase = (until: number) => {
    while (cursor < until) {
      result.push(baseLines[cursor] ?? '')
      cursor++
    }
  }

  for (const h of sorted) {
    emitBase(h.origStart)
    const dec = decisions[h.id]
    if (dec !== 'accept' && dec !== 'reject') {
      throw new Error(`missing decision for hunk ${h.id}`)
    }
    if (h.origLines.length === 0) {
      if (dec === 'accept') {
        result.push(...h.newLines)
      }
      continue
    }
    if (dec === 'accept') {
      result.push(...h.newLines)
    } else {
      result.push(...h.origLines)
    }
    cursor += h.origLines.length
  }
  emitBase(baseLines.length)
  return result.join('\n')
}
