import { useContext } from 'react'
import AIAgentContext, { type AIAgentContextStore } from './AIAgentContext'

export default function useAIAgentStore(): AIAgentContextStore {
  const { store } = useContext(AIAgentContext)
  return store
}
