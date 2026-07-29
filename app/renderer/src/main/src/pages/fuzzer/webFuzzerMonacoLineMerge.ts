export type MonacoLineChangeLike = {
  originalStartLineNumber: number
  originalEndLineNumber: number
  modifiedStartLineNumber: number
  modifiedEndLineNumber: number
}

function norm(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function startIndexFromOriginal(lineNumber: number): number {
  if (lineNumber <= 0) return 0
  return lineNumber - 1
}

function spanLength(startLineNumber: number, endLineNumber: number): number {
  if (startLineNumber <= 0 || endLineNumber <= 0) return 0
  if (endLineNumber < startLineNumber) return 0
  return endLineNumber - startLineNumber + 1
}

function sliceStartIndex(lineNumber: number): number {
  if (lineNumber <= 0) return 0
  return lineNumber - 1
}

/** 与 Monaco `getLineChanges()` 结构一致；按每块 accept/reject 合并为最终 raw */
export function mergeByMonacoLineChanges(
  baseline: string,
  incoming: string,
  changes: MonacoLineChangeLike[],
  decisions: ('accept' | 'reject')[],
): string {
  const baseLines = norm(baseline).split('\n')
  const incLines = norm(incoming).split('\n')
  const out: string[] = []
  let cursor = 0

  const sortedIdx = changes
    .map((_, i) => i)
    .sort((ia, ib) => changes[ia].originalStartLineNumber - changes[ib].originalStartLineNumber)

  for (const ci of sortedIdx) {
    const c = changes[ci]
    const dec = decisions[ci]
    if (dec !== 'accept' && dec !== 'reject') {
      throw new Error(`mergeByMonacoLineChanges: missing decision for change #${ci}`)
    }

    const start = startIndexFromOriginal(c.originalStartLineNumber)
    while (cursor < start) {
      out.push(baseLines[cursor] ?? '')
      cursor++
    }

    const origLen = spanLength(c.originalStartLineNumber, c.originalEndLineNumber)
    const modLen = spanLength(c.modifiedStartLineNumber, c.modifiedEndLineNumber)

    if (dec === 'accept') {
      if (modLen > 0) {
        const modStart = sliceStartIndex(c.modifiedStartLineNumber)
        out.push(...incLines.slice(modStart, modStart + modLen))
      }
      cursor += origLen
    } else {
      if (origLen > 0) {
        out.push(...baseLines.slice(cursor, cursor + origLen))
      }
      cursor += origLen
    }
  }

  while (cursor < baseLines.length) {
    out.push(baseLines[cursor] ?? '')
    cursor++
  }

  return out.join('\n')
}
