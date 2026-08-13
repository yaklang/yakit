import { PluginSwitchToTag } from '../pluginEditor/defaultconstants'

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
  /** 插件扩展（单选） */
  PluginExtensionSingle = 'plugin-extension-single',
  /** 插件扩展（多选） */
  PluginExtensionMultiple = 'plugin-extension-multiple',
  /** 数据包右键 */
  PacketContextMenu = 'packet-context-menu',
  /** 数据包变形 */
  PacketMutate = 'packet-mutate',
}

/**
 * 左侧固定分组
 * - key: tab 唯一标识（选中态 / 缓存）
 * - tag: 可选；有值时按插件 tag 拉取与回写，无值时仅维护该 tab 自己的已选数据
 */
export interface RightClickGroupTab {
  key: ManageRightClickPluginsTabKey
  label: string
  tag?: PluginSwitchToTag
}

/** 已添加的右键插件项 */
export interface RightClickPluginItem {
  scriptName: string
  scriptId: number
  headImg: string
  help?: string
}

/**
 * 自定义顺序缓存：tabKey -> 插件 ID 数组
 */
export type RightClickPluginsOrderCache = Record<string, number[]>

export const GroupTabList: RightClickGroupTab[] = [
  {
    key: ManageRightClickPluginsTabKey.PluginExtensionSingle,
    label: 'ManageRightClickPlugins.pluginExtensionSingle',
    tag: PluginSwitchToTag.PluginCodecSingleHistorySwitch,
  },
  {
    key: ManageRightClickPluginsTabKey.PluginExtensionMultiple,
    label: 'ManageRightClickPlugins.pluginExtensionMultiple',
    tag: PluginSwitchToTag.PluginCodecMultipleHistorySwitch,
  },
  {
    key: ManageRightClickPluginsTabKey.PacketMutate,
    label: 'ManageRightClickPlugins.packetMutate',
    tag: PluginSwitchToTag.PluginCodecHttpSwitch,
  },
  {
    key: ManageRightClickPluginsTabKey.PacketContextMenu,
    label: 'ManageRightClickPlugins.packetContextMenu',
    tag: PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch,
  },
]

export const getGroupTabByKey = (key: string) => GroupTabList.find((item) => item.key === key)

/** 右侧列表查询用的全部已配置 tag */
export const getAllGroupTags = () => GroupTabList.map((item) => item.tag).filter(Boolean) as PluginSwitchToTag[]
