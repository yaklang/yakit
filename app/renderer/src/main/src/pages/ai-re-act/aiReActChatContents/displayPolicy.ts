import type { AIOutputI18n } from '../hooks/grpcApi'

const REACT_FINISHED_NODE_IDS = new Set([
  'react_task_finish',
  'react_task_finished',
  'react-task-finish',
  'react-task-finished',
])

const REACT_FINISHED_LABEL = /react\s*(?:任务结束|task\s+finished)/i

/**
 * The engine's ReAct-finished event is still consumed by the state layer. This
 * policy only suppresses its informational stream row to avoid implying that
 * the whole user workflow has ended.
 */
export const shouldHideReActFinishedStream = (nodeId?: string, verbose?: AIOutputI18n) => {
  if (nodeId && REACT_FINISHED_NODE_IDS.has(nodeId.toLowerCase())) return true

  return Object.values(verbose || {}).some(
    (label) => typeof label === 'string' && REACT_FINISHED_LABEL.test(label.trim()),
  )
}
