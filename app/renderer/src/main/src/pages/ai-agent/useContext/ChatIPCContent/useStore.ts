import { useContext } from 'react'
import ChatIPCContext from './ChatIPCContent'

export default function useChatIPCStore() {
  return useContext(ChatIPCContext).store
}
