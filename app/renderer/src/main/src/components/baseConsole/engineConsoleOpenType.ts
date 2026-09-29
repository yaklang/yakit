import type { EngineConsoleOpenType } from '@/components/layout/FuncDomain'
import type { ConsoleDrawerDirection } from './BaseConsoleDrawer'

export const DEFAULT_ENGINE_CONSOLE_OPEN_TYPE: EngineConsoleOpenType = 'float'

/** 合法的引擎 Console 打开方式集合，用于校验远端持久化的偏好值 */
export const ENGINE_CONSOLE_OPEN_TYPES: readonly EngineConsoleOpenType[] = ['float', 'left', 'right', 'bottom']

const engineConsoleOpenTypeSet = new Set<string>(ENGINE_CONSOLE_OPEN_TYPES)

/**
 * 将远端持久化的打开方式偏好值标准化为合法的 {@link EngineConsoleOpenType}。
 *
 * - 值为合法类型时原样返回。
 * - 值为空 / 非法 / 读取抛错时返回 fallback（默认浮窗），覆盖偏好缺失与读取失败两种场景。
 */
export const resolveEngineConsoleOpenType = (
  storedValue: string | undefined | null,
  fallback: EngineConsoleOpenType = DEFAULT_ENGINE_CONSOLE_OPEN_TYPE,
): EngineConsoleOpenType => {
  if (storedValue && engineConsoleOpenTypeSet.has(storedValue)) {
    return storedValue as EngineConsoleOpenType
  }
  return fallback
}

export interface ConsoleOpenEffects {
  /** 是否需要关闭浮窗独立窗口（打开抽屉前互斥） */
  closeFloatWindow: boolean
  /** 抽屉目标停靠方向；null 表示收起抽屉（打开浮窗前互斥） */
  drawerDirection: ConsoleDrawerDirection | null
}

/**
 * 计算给定打开方式对应的副作用：浮窗与抽屉互斥。
 *
 * - 浮窗：收起抽屉（drawerDirection=null），不关闭浮窗窗口本身。
 * - 抽屉（left/right/bottom）：先关闭浮窗独立窗口，再展开抽屉。
 */
export const resolveConsoleOpenEffects = (openType: EngineConsoleOpenType): ConsoleOpenEffects => {
  if (openType === 'float') {
    return { closeFloatWindow: false, drawerDirection: null }
  }
  return { closeFloatWindow: true, drawerDirection: openType }
}
