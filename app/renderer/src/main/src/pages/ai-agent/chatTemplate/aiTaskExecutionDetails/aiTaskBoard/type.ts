import type { ReactNode } from 'react'
import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

export type AITaskBoardTodoItem = TodoListCardData['items'][number]

export interface AITaskBoardColumn {
  key: string
  title: string
  icon: ReactNode
  items: AITaskBoardTodoItem[]
}

export interface AITaskBoardProps {
  columns: AITaskBoardColumn[]
  className?: string
}

export interface AITaskBoardTodoCardProps {
  item: AITaskBoardTodoItem
}
