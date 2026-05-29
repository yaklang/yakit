import type { AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'

/** 与 yaklang loop_code_security_audit / AttachedResourceTypeFile 一致 */
export const CODE_AUDIT_ATTACHED_TYPE_FILE = 'file' as const

/** 与 AttachedResourceKeyCodeAuditTargetPath 一致 */
export const CODE_AUDIT_ATTACHED_KEY_TARGET_PATH = 'code_audit_target_path' as const

/** @name 构造一条代码审计目标目录附件（须为已规范的项目根目录绝对路径） */
export function buildCodeAuditTargetAttachment(projectRootAbsPath: string): AttachedResourceInfo {
  return {
    Key: CODE_AUDIT_ATTACHED_KEY_TARGET_PATH as AttachedResourceInfo['Key'],
    Type: CODE_AUDIT_ATTACHED_TYPE_FILE as AttachedResourceInfo['Type'],
    Value: projectRootAbsPath,
  }
}

/** @name 向 AIInputEvent.AttachedResourceInfo 追加代码审计目标（不修改 FreeInput） */
export function appendCodeAuditTargetAttachmentToEvent(
  event: AIInputEvent,
  projectRootAbsPath: string | undefined | null,
): AIInputEvent {
  const path = (projectRootAbsPath || '').trim()
  if (!path) return event
  const item = buildCodeAuditTargetAttachment(path)
  const existing = event.AttachedResourceInfo || []
  const dup = existing.some((e) => e.Type === item.Type && e.Key === item.Key && e.Value === item.Value)
  if (dup) return event
  return { ...event, AttachedResourceInfo: [...existing, item] }
}
