export type GoalCondition = 'iterations' | 'acceptance' | 'duration'

export interface GoalStopConditionFieldsProps {
  condition: GoalCondition | null
  onConditionChange: (condition: GoalCondition) => void
  iterations: number
  onIterationsChange: (value: number) => void
  acceptance: string
  onAcceptanceChange: (value: string) => void
  durationSeconds: number
  customDuration: boolean
  onDurationPick: (key: string) => void
  onCustomDurationChange: (seconds: number) => void
  minDurationSeconds?: number
}
