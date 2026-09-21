import { useContext } from 'react'
import ChatIPCContext from './ChatIPCContent'

export default function useChatIPCDispatcher() {
  return useContext(ChatIPCContext).dispatcher
}
