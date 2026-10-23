import type { PlanItemDetailsData } from '@/pages/ai-re-act/hooks/aiRender'

export interface AITaskSkillListProps {
  skills: PlanItemDetailsData['skills'] | undefined
  taskId: string
}
