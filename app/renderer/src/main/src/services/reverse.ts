import { ipc, type GrpcInput } from './ipc'
import { randomString } from '@/utils/randomUtil'

let active: AbortController | undefined
const updates = new Map<AbortController, ReturnType<typeof setTimeout>>()
const errors = new Set<(error: unknown) => void>()

export const isReverseServerRunning = () => Boolean(active && !active.signal.aborted)
export function onReverseServerError(listener: (error: unknown) => void) {
  errors.add(listener)
  return () => {
    errors.delete(listener)
  }
}
export async function stopReverseServer() {
  active?.abort()
  active = undefined
  for (const [controller, timer] of updates) {
    clearTimeout(timer)
    controller.abort()
  }
  updates.clear()
}

/** 配置窗口关闭后保留主连接；已有连接时，短连接仅更新本地地址。 */
export async function configureReverseServer(params: GrpcInput<'ConfigGlobalReverse'>) {
  const controller = new AbortController()
  const primary = !active
  if (primary) active = controller
  else
    updates.set(
      controller,
      setTimeout(() => controller.abort(), 3000),
    )
  const cleanup = () => {
    if (active === controller) active = undefined
    clearTimeout(updates.get(controller))
    updates.delete(controller)
  }
  controller.signal.addEventListener('abort', cleanup, { once: true })
  const onError = (error: unknown) => {
    if (controller.signal.aborted) return
    cleanup()
    for (const listener of errors) listener(error)
  }
  try {
    await ipc.openStream('grpc', 'ConfigGlobalReverse', params, {
      token: randomString(40),
      signal: controller.signal,
      onError,
      onEnd: cleanup,
    })
  } catch (error) {
    cleanup()
    if (!controller.signal.aborted) throw error
  }
}
