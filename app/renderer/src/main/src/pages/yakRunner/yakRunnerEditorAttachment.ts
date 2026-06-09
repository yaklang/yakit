import type { AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'
import type { YakRunnerWorkbenchAiAttachRef } from './YakRunnerAiAttachContext'

function buildCodeSelectionResource(
  sel: NonNullable<YakRunnerWorkbenchAiAttachRef['selection']>,
): AttachedResourceInfo {
  return {
    Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_SELECTED,
    Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CONTENT,
    Value: JSON.stringify(sel),
  }
}

export function buildYakRunnerAttachedResources(attach?: YakRunnerWorkbenchAiAttachRef): AttachedResourceInfo[] {
  if (!attach) return []
  const resources: AttachedResourceInfo[] = []
  const workspace = attach.workspacePath?.trim()
  if (workspace) {
    resources.push({
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_DIRECTORY_PATH,
      Value: workspace,
    })
  }
  const editorFile = attach.editorFilePath?.trim()
  if (editorFile) {
    resources.push({
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_FILE,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_FILE_PATH,
      Value: editorFile,
    })
  }
  if (attach.selection?.content?.trim()) {
    resources.push(buildCodeSelectionResource(attach.selection))
  }
  return resources
}

export function appendYakRunnerAttachmentsToEvent(
  event: AIInputEvent,
  attach?: YakRunnerWorkbenchAiAttachRef,
): AIInputEvent {
  const extra = buildYakRunnerAttachedResources(attach)
  if (extra.length === 0) return event
  return {
    ...event,
    AttachedResourceInfo: [...(event.AttachedResourceInfo ?? []), ...extra],
  }
}
