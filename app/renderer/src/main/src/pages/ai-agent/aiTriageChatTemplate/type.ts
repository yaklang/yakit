import { RefObject } from 'react'
import { AIStartParams } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIForge } from '../type/forge'
import { AITool } from '../type/aiTool'
import { CustomPluginExecuteFormValue } from '@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType'

export interface AIForgeInfoOptProps {
  info: AIForge
  activeForge?: AIForge
  onClick?: (info: AIForge) => void
}

export interface AIForgeFormSubmitParamsProps {
  request: AIStartParams
  formValue: CustomPluginExecuteFormValue | Record<string, CustomPluginExecuteFormValue[]>
}
export interface AIForgeFormProps {
  wrapperRef?: RefObject<HTMLDivElement>
  info: AIForge
  onBack: () => void
  onSubmit: (params: AIForgeFormSubmitParamsProps) => void
}

export interface AIToolFormProps {
  wrapperRef?: RefObject<HTMLDivElement>
  info: AITool
  onBack: () => void
  onSubmit: (question: string) => void
}
