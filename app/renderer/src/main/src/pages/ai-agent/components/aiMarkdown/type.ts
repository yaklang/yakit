import { ModalInfoProps } from '../ModelInfo'
import { ReactNode } from 'react'

export interface AIMarkdownProps {
  content: string
  nodeLabel: string
  className?: string
  modalInfo: ModalInfoProps
  referenceNode: ReactNode
  /** 是否正在流式输出（用于开启流式淡入渲染效果，结束后关闭） */
  streaming?: boolean
}
