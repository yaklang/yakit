import React, { useMemo } from 'react'

import TaskDetailsPopover from './TaskDetailsPopover'

export interface HistoryAIReActTaskDetailsInfo {
  key: string
  label: string
  goal: string
}

export interface UseHistoryAIReActTaskDetailsOptions {
  taskLabel?: string
}

export function useHistoryAIReActTaskDetails(options?: UseHistoryAIReActTaskDetailsOptions) {
  const detailsRightIcon = useMemo(
    () => <TaskDetailsPopover taskLabel={options?.taskLabel} />,
    [options?.taskLabel],
  )

  return {
    detailsRightIcon,
  }
}
