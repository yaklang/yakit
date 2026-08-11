import { ContextMenuScene, type ContextMenuScene as ContextMenuSceneType } from './types'
/** 中间已选插件数量上限 */
export const UpperLimit = 15
/** 中间已选列表 droppableId */
export const DROP_SELECTED = 'droppable-selected'
/** 右侧可用插件列表 droppableId */
export const DROP_AVAILABLE = 'droppable-available'

/**
 * @name 管理右键插件页 - 左侧 tab key
 */
export enum ManageRightClickPluginsTabKey {
  /** 右键插件（单选） */
  PluginExtensionSingle = 'plugin-extension-single',
  /** 右键插件（多选） */
  PluginExtensionMultiple = 'plugin-extension-multiple',
  /** 数据包右键 */
  PacketContextMenu = 'packet-context-menu',
}

/**
 * 左侧固定分组
 * - key: tab 唯一标识（选中态 / 路由参数）
 * - scene: 引擎侧上下文菜单场景，用于查询与绑定
 */
export interface RightClickGroupTab {
  key: ManageRightClickPluginsTabKey
  label: string
  scene: ContextMenuSceneType
}

export const GroupTabList: RightClickGroupTab[] = [
  {
    key: ManageRightClickPluginsTabKey.PluginExtensionSingle,
    label: 'ManageRightClickPlugins.pluginExtensionSingle',
    scene: ContextMenuScene.HistorySingle,
  },
  {
    key: ManageRightClickPluginsTabKey.PluginExtensionMultiple,
    label: 'ManageRightClickPlugins.pluginExtensionMultiple',
    scene: ContextMenuScene.HistoryMulti,
  },
  {
    key: ManageRightClickPluginsTabKey.PacketContextMenu,
    label: 'ManageRightClickPlugins.packetContextMenu',
    scene: ContextMenuScene.HTTPPacket,
  },
]

export const getGroupTabByKey = (key: string) => GroupTabList.find((item) => item.key === key)

/** tab key -> 场景 */
export const getSceneByTabKey = (key: string): ContextMenuSceneType | undefined => getGroupTabByKey(key)?.scene
