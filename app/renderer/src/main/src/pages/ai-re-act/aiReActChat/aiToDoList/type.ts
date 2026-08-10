import type { TodoListCardData } from '../../hooks/aiRender'
import type { AIAgentGrpcApi } from '../../hooks/grpcApi'

export interface AIToDoListProps {
  className?: string
  todoData: TodoListCardData
  /** 禁止展开收起 */
  bannedExpand?: boolean
}
export interface AIToDoListDetailProps {
  todoData: TodoListCardData
}
export interface AIToDoListItemProps {
  item: AIAgentGrpcApi.TodoListUpdateItem
}
