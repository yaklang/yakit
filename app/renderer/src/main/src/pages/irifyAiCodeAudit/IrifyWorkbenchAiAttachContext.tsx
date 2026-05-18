import React, { createContext, useContext, MutableRefObject } from 'react'

/** 与左侧 Irify 工作区同步，供右侧 AI 请求读取（发送时读 `.current`） */
export interface IrifyWorkbenchAiAttachRef {
  /** 用户选择的项目根目录绝对路径（代码审计 AttachedResourceInfo） */
  projectRootAbsPath?: string
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
