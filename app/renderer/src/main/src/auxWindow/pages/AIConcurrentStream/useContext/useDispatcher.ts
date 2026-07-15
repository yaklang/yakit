import { useContext } from 'react'
import AIConcurrentStreamValue, { AIConcurrentStreamDispatcher } from './AIConcurrentStreamContent'

export default function useAIConcurrentStreamDispatcher(): AIConcurrentStreamDispatcher {
  const { dispatcher } = useContext(AIConcurrentStreamValue)
  return dispatcher
}
