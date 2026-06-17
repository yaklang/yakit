import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { Selection } from '@/pages/yakRunner/RunnerTabs/RunnerTabsType'
import { AICodeRefRange } from './aiCustomCodeBlockPlugin'

export interface OpenCodeBlockRefParams {
  path: string
  name: string
  range?: AICodeRefRange | null
}

const buildHighlightRange = (range?: AICodeRefRange | null): Selection | undefined => {
  if (!range?.startLineNumber) return undefined
  return {
    startLineNumber: range.startLineNumber,
    startColumn: range.startColumn || 1,
    endLineNumber: range.endLineNumber || range.startLineNumber,
    endColumn: range.endColumn || 1,
  }
}

const getFileName = (path: string, name?: string) => {
  if (name) return name
  const normalized = path.replace(/[\\/]+$/, '')
  return normalized.split(/[\\/]/).pop() || path
}

/** 在 YakRunner / AI 代码审计等页面中打开代码块引用并定位到选中范围 */
export const openCodeBlockRef = (routeKey: string, params: OpenCodeBlockRefParams) => {
  const { path, range } = params
  if (!path) return

  const name = getFileName(path, params.name)
  const highLightRange = buildHighlightRange(range)
  const openFilePayload = JSON.stringify({
    params: {
      path,
      name,
      highLightRange,
    },
    isHistory: false,
  })

  const jumpPayload = highLightRange
    ? JSON.stringify({
        selections: highLightRange,
        path,
        isSelect: true,
      })
    : null

  switch (routeKey) {
    case YakitRoute.Irify_AI_Code_Audit:
      emiter.emit('onAiCodeAuditScrollToFileTree', path)
      emiter.emit('onAiCodeAuditOpenFileByPath', openFilePayload)
      if (jumpPayload) {
        setTimeout(() => {
          emiter.emit('onAiCodeAuditJumpEditorDetail', jumpPayload)
        }, 100)
      }
      break
    case YakitRoute.YakRunner_Audit_Code:
      emiter.emit('onCodeAuditScrollToFileTree', path)
      emiter.emit('onCodeAuditOpenFileByPath', openFilePayload)
      if (jumpPayload) {
        setTimeout(() => {
          emiter.emit('onCodeAuditJumpEditorDetail', jumpPayload)
        }, 100)
      }
      break
    case YakitRoute.YakScript:
    default:
      emiter.emit('onScrollToFileTree', path)
      emiter.emit('onOpenFileByPath', openFilePayload)
      if (jumpPayload) {
        setTimeout(() => {
          emiter.emit('onJumpEditorDetail', jumpPayload)
        }, 100)
      }
      break
  }
}
