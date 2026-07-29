export interface ScheduleIdleTaskOptions {
  /** requestIdleCallback 最长等待时间（ms），超时后强制执行 */
  timeout?: number
  /** 无 requestIdleCallback 时的 setTimeout 延迟（ms） */
  fallbackDelay?: number
}

/**
 * 将非首帧任务延后到浏览器空闲时执行，缩短切页同步路径。
 * 返回 cancel 函数，组件卸载或依赖变更时应调用。
 */
export function scheduleIdleTask(task: () => void, options?: ScheduleIdleTaskOptions): () => void {
  const timeout = options?.timeout ?? 2000
  const fallbackDelay = options?.fallbackDelay ?? 1
  let cancelled = false

  const run = () => {
    if (cancelled) return
    task()
  }

  let idleId: number | undefined
  let timerId: ReturnType<typeof setTimeout> | undefined

  if (typeof requestIdleCallback === 'function') {
    idleId = requestIdleCallback(run, { timeout })
  } else {
    timerId = setTimeout(run, fallbackDelay)
  }

  return () => {
    cancelled = true
    if (idleId !== undefined && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(idleId)
    }
    if (timerId !== undefined) {
      clearTimeout(timerId)
    }
  }
}
