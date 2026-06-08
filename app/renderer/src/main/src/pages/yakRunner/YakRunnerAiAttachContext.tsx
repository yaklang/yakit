import React, { createContext, useContext, MutableRefObject } from 'react'

/** 与左侧工作区同步，供 `HistoryAIReActChatProvider.transformInputEvent` 读取工程根路径 */
export interface YakRunnerAiAttachRef {
  projectRootAbsPath?: string
}

export const YakRunnerAiAttachContext = createContext<MutableRefObject<YakRunnerAiAttachRef> | null>(null)

export const YakRunnerAiAttachProvider: React.FC<{
  children: React.ReactNode
  attachRef: MutableRefObject<YakRunnerAiAttachRef>
}> = ({ children, attachRef }) => (
  <YakRunnerAiAttachContext.Provider value={attachRef}>{children}</YakRunnerAiAttachContext.Provider>
)

export function useYakRunnerAiAttachRef() {
  return useContext(YakRunnerAiAttachContext)
}
