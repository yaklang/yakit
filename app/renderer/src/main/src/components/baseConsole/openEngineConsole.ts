import { getRemoteValue } from '@/utils/kv'
import { GlobalConfigRemoteGV } from '@/enums/globalConfig'
import emiter from '@/utils/eventBus/eventBus'
import { resolveEngineConsoleOpenType, type EngineConsoleOpenType } from './engineConsoleOpenType'

/**
 * 经事件总线触发「打开引擎 Console」，由 UILayout 统一管理浮窗 / 抽屉互斥。
 *
 * 始终读取用户上次选择的打开方式（远端偏好 EngineConsoleType）：
 * - 合法偏好 → 按该方式打开。
 * - 无偏好 / 非法值 / 读取失败 → 回退浮窗。
 *
 * 回退值由接收方（UILayout）统一写回远端，保证下次读取一致，避免脏值/损坏偏好反复触发回退。
 * 所有引擎 Console 入口都应走本方法，避免直接调用 openConsoleNewWindow() 绕过互斥。
 */
export const emitOpenEngineConsole = () => {
  getRemoteValue(GlobalConfigRemoteGV.EngineConsoleType)
    .then((stored) => {
      emiter.emit('openEngineConsole', resolveEngineConsoleOpenType(stored || undefined))
    })
    .catch(() => {
      emiter.emit('openEngineConsole', 'float' as EngineConsoleOpenType)
    })
}
