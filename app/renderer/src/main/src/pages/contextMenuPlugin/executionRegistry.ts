import { v4 as uuidv4 } from 'uuid'
import type { RunContextMenuActionOptions } from './types'

const executions = new Map<string, RunContextMenuActionOptions>()

export const registerContextMenuExecution = (options: RunContextMenuActionOptions) => {
  const executionID = uuidv4()
  executions.set(executionID, options)
  return executionID
}

export const getContextMenuExecution = (executionID: string) => executions.get(executionID)

export const removeContextMenuExecution = (executionID: string) => {
  executions.delete(executionID)
}
