import emiter from '@/utils/eventBus/eventBus'
import type { RunContextMenuActionOptions } from './types'

/**
 * 发起右键插件执行：仅发射事件，由主窗口 UILayout 挂载的 ContextMenuExecutionHost 消费并决策执行。
 * 独立成模块（不放在 Host 组件文件里）是为了避免基础组件（YakitEditor / HTTPFlowTable 等）
 * 静态依赖 Host 组件模块，保证 UILayout 对 Host 的 React.lazy 懒加载生效。
 */
export const runContextMenuAction = (options: RunContextMenuActionOptions) => {
  emiter.emit('runContextMenuAction', options)
}
