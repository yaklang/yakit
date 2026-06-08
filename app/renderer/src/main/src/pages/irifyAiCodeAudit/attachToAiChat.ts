import emiter from '@/utils/eventBus/eventBus'
import { AIMentionCommandParams } from '@/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { TREE_DRAG_KEY } from '@/pages/ai-agent/aiChatWelcome/hooks/useAIChatDrop'

/** Aligns with backend `AttachedCodeSelection` (Type=selected, Key=content). */
export interface AttachedCodeSelectionPayload {
  path: string
  startLine: number
  endLine: number
  language: string
  content: string
}

export function buildFileTreeDragData(path: string, isFolder: boolean) {
  return JSON.stringify({ path, isFolder })
}

export function applyFileTreeDragToDataTransfer(dataTransfer: DataTransfer, path: string, isFolder: boolean) {
  dataTransfer.effectAllowed = 'copy'
  dataTransfer.setData(TREE_DRAG_KEY, buildFileTreeDragData(path, isFolder))
}

export function emitAttachPathToAiChat(path: string, isFolder: boolean) {
  const params: AIMentionCommandParams = {
    mentionId: path,
    mentionType: isFolder ? 'folder' : 'file',
    mentionName: path,
  }
  emiter.emit(
    'setAIInputByType',
    JSON.stringify({
      type: 'mention',
      params,
    }),
  )
}

export function emitAttachCodeSelectionToAiChat(payload: AttachedCodeSelectionPayload) {
  emiter.emit(
    'setAIInputByType',
    JSON.stringify({
      type: 'codeSelection',
      params: payload,
    }),
  )
}
