import { TodoListCardData } from '../../hooks/aiRender'
import { AIAgentGrpcApi } from '../../hooks/grpcApi'

export interface AIToDoListProps {
  className?: string
  todoData: TodoListCardData
}
export interface AIToDoListItemProps {
  item: AIAgentGrpcApi.TodoListUpdateItem
}
