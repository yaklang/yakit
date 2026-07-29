import { AITaskStatus, type AITaskStatusType } from '@/pages/ai-re-act/hooks/grpcApi'
import type { ReactNode } from 'react'
import { TaskErrorIcon, TaskInProgressIcon, TaskSkippedIcon, TaskSuccessIcon } from '../aiTree/icon'

export interface AIStatusPresentation {
  icon: ReactNode | null
  bgColor: string
  stripeColor: string
}

/** 任务状态对应的图标、背景色、斜纹色 */
export const getAIStatusPresentation = (status?: AITaskStatusType): AIStatusPresentation => {
  switch (status) {
    case AITaskStatus.success:
      return {
        icon: <TaskSuccessIcon />,
        bgColor: 'linear-gradient(90deg, var(--Colors-Use-Success-Border) 0%, var(--Colors-Use-Success-Bg-Hover) 100%)',
        stripeColor: 'var(--Colors-Use-Success-Primary)',
      }
    case AITaskStatus.inProgress:
      return {
        icon: <TaskInProgressIcon />,
        bgColor: 'linear-gradient(90deg, var(--Colors-Use-Warning-Border) 0%, var(--Colors-Use-Warning-Bg-Hover) 100%)',
        stripeColor: 'var(--Colors-Use-Warning-Primary)',
      }
    case AITaskStatus.error:
      return {
        icon: <TaskErrorIcon />,
        bgColor: 'linear-gradient(90deg, var(--Colors-Use-Error-Border) 0%, var(--Colors-Use-Error-Bg-Hover) 100%)',
        stripeColor: 'var(--Colors-Use-Error-Primary)',
      }
    case AITaskStatus.skipped:
      return {
        icon: <TaskSkippedIcon />,
        bgColor: 'linear-gradient(90deg, var(--Colors-Use-Neutral-Border) 0%, var(--Colors-Use-Neutral-Bg-Hover) 100%)',
        stripeColor: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
      }
    case AITaskStatus.cancel:
      return {
        icon: <TaskSkippedIcon />,
        bgColor: 'linear-gradient(90deg, var(--Colors-Use-Neutral-Border) 0%, var(--Colors-Use-Neutral-Bg-Hover) 100%)',
        stripeColor: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
      }
    default:
      return {
        icon: null,
        bgColor: 'var(--Colors-Use-Neutral-Bg-Hover)',
        stripeColor: 'var(--Colors-Use-Neutral-Bg-Hover)',
      }
  }
}
