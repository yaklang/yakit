import { type AIOnlineModelListProps } from '@/pages/ai-agent/aiModelList/AIModelListType'
import { type SaveAIToolRequest } from '@/pages/ai-agent/type/aiTool'
import { type ForwardedRef } from 'react'

export interface AIToolEditorProps {
  pageId: string
  isModify?: boolean
  mountContainer?: AIOnlineModelListProps['mountContainer']
}
export interface AIToolEditorInfoFormRef {
  setFormValues: (values: SaveAIToolRequest) => void
  getFormValues: () => Promise<SaveAIToolRequest | null>
}
export interface AIToolEditorInfoFormProps {
  ref?: ForwardedRef<AIToolEditorInfoFormRef>
  content: string
  mountContainer?: AIOnlineModelListProps['mountContainer']
}

export type EditorAIToolTab = 'code' | 'execResult'
