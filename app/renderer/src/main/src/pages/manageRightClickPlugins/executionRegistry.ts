import { v4 as uuidv4 } from 'uuid'
import type { RunContextMenuActionOptions } from './types'

const executions = new Map<string, RunContextMenuActionOptions>()

export const registerContextMenuExecution = (options: RunContextMenuActionOptions) => {
  const executionID = uuidv4()
  executions.set(executionID, options)
  return executionID
}

export const getContextMenuExecution = (executionID: string) => executions.get(executionID)

/** 用最新的插件数据（如编辑后重新拉取的 Params）更新已注册的执行上下文 */
export const updateContextMenuExecution = (executionID: string, patch: Partial<RunContextMenuActionOptions>) => {
  const current = executions.get(executionID)
  if (!current) return
  executions.set(executionID, { ...current, ...patch })
}

export const removeContextMenuExecution = (executionID: string) => {
  executions.delete(executionID)
}
