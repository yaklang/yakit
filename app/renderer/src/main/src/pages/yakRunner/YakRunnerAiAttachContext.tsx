import React, { createContext, useContext } from 'react'

export interface YakRunnerEditorSelectionAttach {
  path: string
  startLine: number
  endLine: number
  language: string
  content: string
}

/** 与左侧 Yak Runner 工作区同步，供右侧 AI 请求读取（发送时读 `.current`） */
export interface YakRunnerWorkbenchAiAttachRef {
  workspacePath?: string
  editorFilePath?: string
  selection?: YakRunnerEditorSelectionAttach
}

const YakRunnerAiAttachContext = createContext<React.MutableRefObject<YakRunnerWorkbenchAiAttachRef> | null>(null)

export const YakRunnerAiAttachProvider: React.FC<{
  attachRef: React.MutableRefObject<YakRunnerWorkbenchAiAttachRef>
  children: React.ReactNode
}> = ({ attachRef, children }) => {
  return <YakRunnerAiAttachContext.Provider value={attachRef}>{children}</YakRunnerAiAttachContext.Provider>
}

export function useYakRunnerAiAttachRef(): React.MutableRefObject<YakRunnerWorkbenchAiAttachRef> | null {
  return useContext(YakRunnerAiAttachContext)
}
