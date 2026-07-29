import { CodeScoreSmokingEvaluateResultProps } from '@/pages/plugins/funcTemplateType'
import { YakStaticAnalyzeErrorResult } from '@/utils/editorMarkers'
import { Uint8ArrayToString } from '@/utils/str'

/** Plugin types that support StaticAnalyzeError rich copy formatting. */
export const STATIC_ANALYZE_COPY_PLUGIN_TYPES = new Set(['yak', 'mitm', 'port-scan', 'codec'])

export function canFetchStaticAnalyzeCopy(pluginType?: string): boolean {
  return !!pluginType && STATIC_ANALYZE_COPY_PLUGIN_TYPES.has(pluginType)
}

export function isStaticCodeDetectionItem(item: CodeScoreSmokingEvaluateResultProps): boolean {
  return (item.Item || '').includes('静态代码检测')
}

/** Fallback copy text when backend FormattedCopyText is unavailable. */
export function formatSmokingEvaluateResultFallback(item: CodeScoreSmokingEvaluateResultProps): string {
  const formatted = (item.FormattedCopyText || '').trim()
  if (formatted) {
    return formatted
  }
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
    const copyText = (result.FormattedCopyText || '').trim()
    if (!copyText) {
      continue
    }
    const resultRange = rangeKey(result.StartLineNumber, result.StartColumn, result.EndLineNumber, result.EndColumn)
    const resultMessage = normalizeMessage(
      result.Message?.length ? Uint8ArrayToString(result.Message) : Uint8ArrayToString(result.RawMessage),
    )
    if (itemRange && resultRange && itemRange === resultRange) {
      return copyText
    }
    if (itemMessage && resultMessage && itemMessage === resultMessage) {
      return copyText
    }
  }
  return undefined
}
