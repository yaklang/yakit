import { AITaskStatus, type AITaskStatusType } from '@/pages/ai-re-act/hooks/grpcApi'
import type { ReactNode } from 'react'
import { TaskCancelIcon, TaskErrorIcon, TaskInProgressIcon, TaskSkippedIcon, TaskSuccessIcon } from '../aiTree/icon'

export const getAIStatusPresentation: (status?: AITaskStatusType) => [ReactNode, string] = (status) => {
  switch (status) {
    case AITaskStatus.success:
      return [
        <TaskSuccessIcon />,
        'linear-gradient(90deg, var(--Colors-Use-Success-Border) 0%, var(--Colors-Use-Success-Bg-Hover) 100%)',
      ]
    case AITaskStatus.inProgress:
      return [
        <TaskInProgressIcon />,
        'linear-gradient(90deg, var(--Colors-Use-Warning-Border) 0%, var(--Colors-Use-Warning-Bg-Hover) 100%)',
      ]
    case AITaskStatus.error:
      return [
        <TaskErrorIcon />,
        'linear-gradient(90deg, var(--Colors-Use-Error-Border) 0%, var(--Colors-Use-Error-Bg-Hover) 100%)',
      ]
    case AITaskStatus.skipped:
      return [
        <TaskSkippedIcon />,
        'linear-gradient(90deg, var(--Colors-Use-Error-Border) 0%, var(--Colors-Use-Error-Bg-Hover) 100%)',
      ]
    case AITaskStatus.cancel:
      return [
        <TaskCancelIcon />,
        'linear-gradient(90deg, var(--Colors-Use-Neutral-Border) 0%, var(--Colors-Use-Neutral-Bg-Hover) 100%)',
      ]
    default:
      return [null, 'var(--Colors-Use-Neutral-Bg-Hover)']
  }
}
