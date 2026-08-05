import type { AIReActRecommendedSkill } from '../hooks/grpcApi'

export interface AIRecommendedSkillSelectProps {
  value?: AIReActRecommendedSkill
  onChange: (value?: AIReActRecommendedSkill) => void
  className?: string
  disabled?: boolean
}
