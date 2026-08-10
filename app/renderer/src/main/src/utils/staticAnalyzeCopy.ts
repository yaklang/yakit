import type { CodeScoreSmokingEvaluateResultProps } from '@/pages/plugins/funcTemplateType'
import type { YakStaticAnalyzeErrorResult } from '@/utils/editorMarkers'
import { Uint8ArrayToString } from '@/utils/str'

/** Plugin types that support StaticAnalyzeError rich copy formatting. */
export const STATIC_ANALYZE_COPY_PLUGIN_TYPES = new Set(['yak', 'mitm', 'port-scan', 'codec'])

export function canFetchStaticAnalyzeCopy(pluginType?: string): boolean {
  return !!pluginType && STATIC_ANALYZE_COPY_PLUGIN_TYPES.has(pluginType)
}

export function isStaticCodeDetectionItem(item: CodeScoreSmokingEvaluateResultProps): boolean {
  return (item.Item || '').includes('静态代码检测')
}

/** Fallback copy text when StaticAnalyzeError RawMessage is unavailable. */
export function formatSmokingEvaluateResultFallback(item: CodeScoreSmokingEvaluateResultProps): string {
  const lines: string[] = []
  if (item.Item) {
    lines.push(item.Item)
  }
  if (item.Suggestion) {
    lines.push(item.Suggestion)
  }
  const { StartLine, StartColumn, EndLine, EndColumn } = item.Range || {}
  if (StartLine && StartColumn && EndLine && EndColumn) {
    lines.push(`位置: [${StartLine}:${StartColumn}-${EndLine}:${EndColumn}]`)
  }
  return lines.join('\n')
}

/** Rich copy text from StaticAnalyzeErrorResult.RawMessage (hints + code context). */
export function getStaticAnalyzeRawCopyText(result: YakStaticAnalyzeErrorResult): string {
  return Uint8ArrayToString(result.RawMessage || new Uint8Array()).trim()
}

export function joinSmokingEvaluateResultsFallback(results: CodeScoreSmokingEvaluateResultProps[]): string {
  return results
    .map((item) => formatSmokingEvaluateResultFallback(item))
    .filter(Boolean)
    .join('\n\n')
}

function normalizeMessage(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function rangeKey(startLine?: number, startColumn?: number, endLine?: number, endColumn?: number): string {
  if (!startLine || !startColumn || !endLine || !endColumn) {
    return ''
  }
  return `${startLine}:${startColumn}-${endLine}:${endColumn}`
}

/** Match a smoking-evaluate static-analysis item to a StaticAnalyzeError result. */
export function findStaticAnalyzeCopyForSmokingItem(
  item: CodeScoreSmokingEvaluateResultProps,
  analyzeResults: YakStaticAnalyzeErrorResult[] = [],
): string | undefined {
  const itemRange = rangeKey(item.Range?.StartLine, item.Range?.StartColumn, item.Range?.EndLine, item.Range?.EndColumn)
  const itemMessage = normalizeMessage(item.Suggestion || '')

  for (const result of analyzeResults) {
    const copyText = getStaticAnalyzeRawCopyText(result)
    if (!copyText) {
      continue
    }
    const resultRange = rangeKey(result.StartLineNumber, result.StartColumn, result.EndLineNumber, result.EndColumn)
    // Prefer Message for matching; RawMessage is reserved for rich copy text.
    const resultMessage = normalizeMessage(Uint8ArrayToString(result.Message || new Uint8Array()))
    if (itemRange && resultRange && itemRange === resultRange) {
      return copyText
    }
    if (itemMessage && resultMessage && itemMessage === resultMessage) {
      return copyText
    }
  }
  return undefined
}
