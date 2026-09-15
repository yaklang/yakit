import { type SaveAIToolRequest } from '@/pages/ai-agent/type/aiTool'
import { type ForwardedRef } from 'react'
import type { ModalProps } from 'antd'

export interface AIToolEditorProps {
  pageId: string
  isModify?: boolean
  mountContainer?: ModalProps['getContainer']
}
export interface AIToolEditorInfoFormRef {
  setFormValues: (values: SaveAIToolRequest) => void
  getFormValues: () => Promise<SaveAIToolRequest | null>
}
export interface AIToolEditorInfoFormProps {
  ref?: ForwardedRef<AIToolEditorInfoFormRef>
  content: string
  mountContainer?: ModalProps['getContainer']
}

export type EditorAIToolTab = 'code' | 'execResult'
