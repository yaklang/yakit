export interface ScheduleIdleTaskOptions {
  /** requestIdleCallback 最长等待时间（ms），超时后强制执行 */
  timeout?: number
  /** 无 requestIdleCallback 时的 setTimeout 延迟（ms） */
  fallbackDelay?: number
}

export interface StartIdleVisibleIntervalOptions extends ScheduleIdleTaskOptions {
  /** 启动 interval 时是否立刻执行一次回调，默认 false（与原生 setInterval 一致） */
  runImmediately?: boolean
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

const isDocumentHidden = () => typeof document !== 'undefined' && document.hidden

/**
 * 空闲后再启动 interval；页面 hidden 时跳过 tick，重新可见时立刻补一次。
 * 不改变回调语义，只推迟启动、避免后台标签空转。
 */
export function startIdleVisibleInterval(
  callback: () => void,
  delay: number,
  options?: StartIdleVisibleIntervalOptions,
): () => void {
  let intervalId: ReturnType<typeof setInterval> | undefined
  let cancelled = false
  let started = false

  const tick = () => {
    if (cancelled || isDocumentHidden()) return
    callback()
  }

  const start = () => {
    if (cancelled || started) return
    started = true
    if (options?.runImmediately) tick()
    intervalId = setInterval(tick, delay)
  }

  const cancelIdle = scheduleIdleTask(start, options)

  const onVisibilityChange = () => {
    if (cancelled || !started || isDocumentHidden()) return
    tick()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  return () => {
    cancelled = true
    cancelIdle()
    if (intervalId !== undefined) {
      clearInterval(intervalId)
      intervalId = undefined
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }
}
