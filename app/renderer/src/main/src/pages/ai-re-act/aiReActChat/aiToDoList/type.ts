import { AIAgentGrpcApi } from '../../hooks/grpcApi'

export interface AIToDoListProps {
  className?: string
}
export interface AIToDoListItemProps {
  item: AIAgentGrpcApi.TodoListUpdateItem
}
