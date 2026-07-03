import React, { createContext, useContext, MutableRefObject } from 'react'
import type { AIInputEvent, AttachedResourceInfo } from '@/pages/ai-re-act/hooks/grpcApi'
import { AttachedResourceKeyEnum, AttachedResourceTypeEnum } from '@/pages/ai-agent/defaultConstant'

/** 与左侧 Irify 工作区同步，供右侧 AI 请求读取（发送时读 `.current`） */
export interface IrifyWorkbenchAiAttachRef {
  /** 工作区根目录 → directory_path */
  projectRootAbsPath?: string
  /** 当前打开文件 → file_path */
  activeFilePath?: string
}

export const IrifyWorkbenchAiAttachContext = createContext<MutableRefObject<IrifyWorkbenchAiAttachRef> | null>(null)

export const IrifyWorkbenchAiAttachProvider: React.FC<{
  children: React.ReactNode
  attachRef: MutableRefObject<IrifyWorkbenchAiAttachRef>
}> = ({ children, attachRef }) => (
  <IrifyWorkbenchAiAttachContext.Provider value={attachRef}>{children}</IrifyWorkbenchAiAttachContext.Provider>
)

export function useIrifyWorkbenchAiAttachRef() {
  return useContext(IrifyWorkbenchAiAttachContext)
}

function appendIfMissing(existing: AttachedResourceInfo[], item: AttachedResourceInfo): AttachedResourceInfo[] {
  const duplicated = existing.some(
    (entry) => entry.Type === item.Type && entry.Key === item.Key && entry.Value === item.Value,
  )
  return duplicated ? existing : [...existing, item]
}

/** 追加 directory_path；file_path 暂不传给后端；selected+content 由输入框 codeBlock 附带 */
export function appendIrifyWorkbenchAttachments(
  event: AIInputEvent,
  ctx: IrifyWorkbenchAiAttachRef | null | undefined,
): AIInputEvent {
  const projectRoot = ctx?.projectRootAbsPath?.trim()
  // const activeFilePath = ctx?.activeFilePath?.trim()
  if (!projectRoot) return event

  let attached = event.AttachedResourceInfo || []

  if (projectRoot) {
    attached = appendIfMissing(attached, {
      Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
      Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_Directory_ID,
      Value: projectRoot,
    })
  }

  // 暂时不传递当前打开文件给后端
  // if (activeFilePath) {
  //   attached = appendIfMissing(attached, {
  //     Type: AttachedResourceTypeEnum.CONTEXT_PROVIDER_TYPE_CODE_BLOCK_File,
  //     Key: AttachedResourceKeyEnum.CONTEXT_PROVIDER_KEY_CODE_BLOCK_File_ID,
  //     Value: activeFilePath,
  //   })
  // }

  if (attached.length === (event.AttachedResourceInfo || []).length) return event
  return { ...event, AttachedResourceInfo: attached }
}
