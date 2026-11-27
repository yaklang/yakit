import type { AITaskInfoProps } from '@/pages/ai-re-act/hooks/aiRender'
import { AITaskStatus, type AIAgentGrpcApi, type AITaskStatusType } from '@/pages/ai-re-act/hooks/grpcApi'
import type { SubForgeRun } from '@/pages/ai-re-act/hooks/grpcStreamHandler/subForgeTaskTree'

const emptyTask = (): Omit<AITaskInfoProps, 'task_id' | 'name' | 'level' | 'isLeaf'> => ({
  goal: '',
  semantic_identifier: '',
  isRemove: false,
  tools: [],
  description: '',
  total_tool_call_count: 0,
  success_tool_call_count: 0,
  fail_tool_call_count: 0,
  summary: '',
})

const mapCallProgress = (run: SubForgeRun, active: boolean): AITaskStatusType => {
  const status = (!active || run.historical) && run.status === 'running' ? '' : run.status
  switch (status) {
    case 'running':
      return AITaskStatus.inProgress
    case 'succeeded':
      return AITaskStatus.success
    case 'failed':
    case 'timed_out':
      return AITaskStatus.error
    case 'cancelled':
      return AITaskStatus.skipped
    default:
      return AITaskStatus.created
  }
}

const mapNodeProgress = (
  progress: AIAgentGrpcApi.SubForgeTaskNode['progress'],
  callProgress: AITaskStatusType,
): AITaskStatusType => {
  if (progress === 'processing' && callProgress !== AITaskStatus.inProgress) return AITaskStatus.created
  if (progress === 'processing') return AITaskStatus.inProgress
  if (progress === 'completed') return AITaskStatus.success
  if (progress === 'aborted') return AITaskStatus.error
  if (progress === 'skipped') return AITaskStatus.skipped
  return AITaskStatus.created
}

const collectRealSuffixes = (node: AIAgentGrpcApi.SubForgeTaskNode, used: Set<string>) => {
  if (node.task_id) used.add(node.task_id)
  node.subtasks?.forEach((child) => collectRealSuffixes(child, used))
}

const nextFallbackSuffix = (seq: { n: number }, used: Set<string>) => {
  let suffix = `n${seq.n++}`
  while (used.has(suffix)) suffix = `n${seq.n++}`
  used.add(suffix)
  return suffix
}

const flattenNode = (
  node: AIAgentGrpcApi.SubForgeTaskNode,
  level: number,
  callProgress: AITaskStatusType,
  idPrefix: string,
  seq: { n: number },
  used: Set<string>,
): AITaskInfoProps[] => {
  const hasChildren = !!node.subtasks?.length
  const task: AITaskInfoProps = {
    ...emptyTask(),
    task_id: `${idPrefix}-${node.task_id || nextFallbackSuffix(seq, used)}`,
    name: node.name,
    goal: node.goal || '',
    progress: mapNodeProgress(node.progress, callProgress),
    level,
    isLeaf: false,
  }
  const children = (node.subtasks || []).flatMap((child) =>
    flattenNode(child, level + 1, callProgress, idPrefix, seq, used),
  )
  return hasChildren ? [task, ...children] : [task]
}

const matchesParentTask = (taskId: string, parentTaskId: string, coordinatorId: string) =>
  taskId === parentTaskId || taskId === `subforge-${coordinatorId}-${parentTaskId}`

const flattenRun = (
  run: SubForgeRun,
  level: number,
  active: boolean,
  title: string,
  runs: Record<string, SubForgeRun>,
  visiting: Set<string>,
): AITaskInfoProps[] => {
  const callProgress = mapCallProgress(run, active)
  const idPrefix = `subforge-${run.child_coordinator_id}`
  const used = new Set<string>()
  if (run.task_tree) collectRealSuffixes(run.task_tree, used)
  let children = run.task_tree ? flattenNode(run.task_tree, 2, callProgress, idPrefix, { n: 0 }, used) : []
  if (!visiting.has(run.child_coordinator_id)) {
    visiting = new Set(visiting)
    visiting.add(run.child_coordinator_id)
    children = insertSubForgeTasks(children, runs, run.child_coordinator_id, active, visiting)
  }
  return [
    {
      ...emptyTask(),
      task_id: idPrefix,
      name: title,
      progress: callProgress,
      level,
      isLeaf: false,
      subForgeHead: children.length > 0,
      subForgeChildren: children.length ? children : undefined,
    },
  ]
}

export const insertSubForgeTasks = (
  tasks: AITaskInfoProps[],
  runs: Record<string, SubForgeRun>,
  coordinatorId: string,
  active: boolean,
  visiting: Set<string> = new Set(),
): AITaskInfoProps[] => {
  const list = Object.values(runs)
    .filter((run) => run.parent_coordinator_id === coordinatorId)
    .sort((a, b) => a.child_coordinator_id.localeCompare(b.child_coordinator_id))
  if (!list.length) return tasks
  const visibleIds = new Set(tasks.map((task) => task.task_id))
  const parentVisible = (parentTaskId: string) =>
    visibleIds.has(parentTaskId) || visibleIds.has(`subforge-${coordinatorId}-${parentTaskId}`)
  const result: AITaskInfoProps[] = []
  for (const run of list) {
    if (!parentVisible(run.parent_task_id)) result.push(...flattenRun(run, 2, active, run.tool_name, runs, visiting))
  }
  for (const task of tasks) {
    result.push(task)
    for (const run of list) {
      if (matchesParentTask(task.task_id, run.parent_task_id, coordinatorId)) {
        result.push(...flattenRun(run, task.level + 1, active, run.tool_name, runs, visiting))
      }
    }
  }
  return result
}

export const isSubForgeTreeTask = (taskId: string) => taskId.startsWith('subforge-')
