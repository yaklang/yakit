import { useContext } from 'react'
import YakRunnerContext, { type YakRunnerContextDispatcher } from './YakRunnerContext'

export default function useDispatcher(): YakRunnerContextDispatcher {
  const { dispatcher } = useContext(YakRunnerContext)
  return dispatcher
}
