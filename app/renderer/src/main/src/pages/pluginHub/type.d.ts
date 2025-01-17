/** 插件来源类型(线上|我的|本地|回收站) */
export type PluginSourceType = "online" | "own" | "local" | "recycle" | "setting"

/** 跳转插件详情的必要信息 */
export interface PluginToDetailInfo {
    /** 获取插件详情的列表类型 */
    type: PluginSourceType
    /** 插件名称 */
    name: string
    /** 插件UUID(线上来源则存在此值) */
    uuid: string
    /** 是否为内置插件 */
    isCorePlugin?: boolean
}

/** 插件列表组件基础属性 */
export interface HubListBaseProps {
    /** 是否隐藏筛选条件栏 */
    hiddenFilter?: boolean
    /** 是否进入详情列表 */
    isDetailList?: boolean
    /** 是否隐藏详情列表 */
    hiddenDetailList?: boolean
    /** 展示指定插件详情 */
    onPluginDetail: (info: PluginToDetailInfo) => any
}
