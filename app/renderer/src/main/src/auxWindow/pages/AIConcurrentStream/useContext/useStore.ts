import { useContext } from 'react'
import AIConcurrentStreamValue, { AIConcurrentStreamStore } from './AIConcurrentStreamContent'

export default function useAIConcurrentStreamStore(): AIConcurrentStreamStore {
  const { store } = useContext(AIConcurrentStreamValue)
  return store
}
