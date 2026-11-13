export type SubForgeStatus = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out'

export interface SubForgeTaskNode {
  task_id?: string
  name: string
  progress?: '' | 'processing' | 'completed' | 'aborted' | 'skipped'
  subtasks?: SubForgeTaskNode[]
}

export interface SubForgeTaskTree {
  parent_coordinator_id: string
  parent_task_id: string
  parent_task_uuid: string
  call_tool_id: string
  child_coordinator_id: string
  tool_name: string
  revision: number
  status: SubForgeStatus
  task_tree: SubForgeTaskNode | null
}

export interface SubForgeRun extends SubForgeTaskTree {
  historical: boolean
}

const statuses: string[] = ['running', 'succeeded', 'failed', 'cancelled', 'timed_out']
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function isTaskNode(value: unknown): value is SubForgeTaskNode {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    (value.subtasks === undefined || (Array.isArray(value.subtasks) && value.subtasks.every(isTaskNode)))
  )
}

export function parseSubForgeTaskTree(content: string): SubForgeTaskTree | undefined {
  let value: unknown
  try {
    value = JSON.parse(content)
  } catch {
    return
  }
  if (!isRecord(value)) return
  if (
    !['parent_coordinator_id', 'parent_task_id', 'parent_task_uuid', 'call_tool_id', 'child_coordinator_id'].every(
      (key) => typeof value[key] === 'string' && value[key] !== '',
    )
  )
    return
  if (
    typeof value.tool_name !== 'string' ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !statuses.includes(String(value.status)) ||
    (value.task_tree !== null && !isTaskNode(value.task_tree))
  )
    return
  return value as unknown as SubForgeTaskTree
}

/** History pages may arrive newest-first. A live snapshot wins an equal-revision replay. */
export function mergeSubForgeRun(
  previous: SubForgeRun | undefined,
  snapshot: SubForgeTaskTree,
  historical: boolean,
): SubForgeRun {
  if (
    previous &&
    (previous.revision > snapshot.revision ||
      (previous.revision === snapshot.revision && (!previous.historical || historical)))
  )
    return previous
  return { ...snapshot, historical }
}
