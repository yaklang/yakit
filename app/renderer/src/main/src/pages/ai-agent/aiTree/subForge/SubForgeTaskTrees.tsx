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

const flattenNode = (
  node: AIAgentGrpcApi.SubForgeTaskNode,
  level: number,
  callProgress: AITaskStatusType,
  idPrefix: string,
  seq: { n: number },
): AITaskInfoProps[] => {
  const hasChildren = !!node.subtasks?.length
  const task: AITaskInfoProps = {
    ...emptyTask(),
    task_id: `${idPrefix}-${node.task_id || `n${seq.n++}`}`,
    name: node.name,
    goal: node.goal || '',
    progress: mapNodeProgress(node.progress, callProgress),
    level,
    isLeaf: false,
  }
  const children = (node.subtasks || []).flatMap((child) => flattenNode(child, level + 1, callProgress, idPrefix, seq))
  return hasChildren ? [task, ...children] : [task]
}

const flattenRun = (run: SubForgeRun, level: number, active: boolean, title: string): AITaskInfoProps[] => {
  const callProgress = mapCallProgress(run, active)
  const idPrefix = `subforge-${run.child_coordinator_id}`
  const children = run.task_tree ? flattenNode(run.task_tree, 2, callProgress, idPrefix, { n: 0 }) : []
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
): AITaskInfoProps[] => {
  const list = Object.values(runs)
    .filter((run) => run.parent_coordinator_id === coordinatorId)
    .sort((a, b) => a.child_coordinator_id.localeCompare(b.child_coordinator_id))
  if (!list.length) return tasks
  const visibleIds = new Set(tasks.map((task) => task.task_id))
  const result: AITaskInfoProps[] = []
  for (const run of list) {
    if (!visibleIds.has(run.parent_task_id)) result.push(...flattenRun(run, 2, active, run.tool_name))
  }
  for (const task of tasks) {
    result.push(task)
    for (const run of list) {
      if (run.parent_task_id === task.task_id) result.push(...flattenRun(run, task.level + 1, active, run.tool_name))
    }
  }
  return result
}

export const isSubForgeTreeTask = (taskId: string) => taskId.startsWith('subforge-')
