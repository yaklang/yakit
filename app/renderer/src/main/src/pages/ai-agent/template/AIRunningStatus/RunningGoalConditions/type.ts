import type { Ref } from 'react'

export interface RunningGoalConditionsProps {
  sessionId: string
  mode: 'never_ending' | 'disabled'
  ref: Ref<() => void>
}
