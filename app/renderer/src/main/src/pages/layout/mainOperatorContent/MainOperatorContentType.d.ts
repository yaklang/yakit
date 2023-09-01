import React from "react"
import {YakitRoute, ComponentParams} from "../../../routes/newRoute"
import {RouteToPageProps} from "../publicMenu/PublicMenu"

/**
 * @name 已打开页面的二级页面数据
 * @property id
 * @property verbose-页面展示名称
 * @property time webFuzzer 缓存使用
 * @property params-页面传递参数
 * @property sortField-二级tab 排序字段
 */
export interface MultipleNodeInfo extends MultipleNodeGroup {
    /**@name 二级菜单tab唯一值 */
    id: string
    verbose: string
    time?: string
    params?: ComponentParams
    sortFieId: number
}
/**
 * @name 组信息
 * @property expand 组是否展开
 * @property color 组的颜色
 * @property params 页面传递参数
 * @property groupTime 组内的item与组的对应联系
 * @property groupChildren 组内的内容
 * @property childrenWidth 组内最大宽度
 */
export interface MultipleNodeGroup {
    expand?: boolean
    color?: string
    /**@param 目前根据该字段分组 */
    groupId: string
    groupChildren?: MultipleNodeInfo[]
    /**@private */
    childrenWidth?: number
}

/**
 * @name 已打开页面数据
 * @property routeKey-一级页面唯一值
 * @property verbose-页面展示名称
 * @property menuName-页面菜单名称
 * @property route-页面的yakitRoute
 * @property singleNode- 是否为单开页面
 * @property multipleNode-多开页面的Node合集
 * @property multipleLength-多开页面已打开过多少个
 * @property hideAdd-二级页面是否隐藏添加按钮
 * @property params-页面传递参数
 */
export interface PageCache {
    /**@name 一级页面唯一值 */
    routeKey: string
    verbose: string
    menuName: string
    route: YakitRoute
    pluginId?: number
    pluginName?: string
    singleNode: boolean | undefined
    multipleNode: MultipleNodeInfo[] | any[]
    multipleLength?: number
    hideAdd?: boolean
    params?: ComponentParams
}

// 页面的唯一标识属性
export interface OnlyPageCache {
    menuName: string
    route: YakitRoute
    pluginId?: number
    pluginName?: string
}

/**
 * @description 主页面的Content
 * @property {Map<string, string>} routeKeyToLabel tabs显示的名字
 */
export interface MainOperatorContentProps {
    routeKeyToLabel: Map<string, string>
}

/**
 * @description content 展示
 * @function onRemove 删除一级tab
 */
export interface TabContentProps {
    pageCache: PageCache[]
    setPageCache: (p: PageCache[]) => void
    currentTabKey: YakitRoute | string
    setCurrentTabKey: (s: YakitRoute | string) => void
    openMultipleMenuPage: (route: RouteToPageProps) => void
    afterDeleteFirstPage: (type: "all" | "other" | "single", page?: PageCache) => void
    afterDeleteSubPage: (type: "other" | "single", r: YakitRoute | string, subItem: MultipleNodeInfo) => void
    afterUpdateSubItem: (page: PageCache, subItem: MultipleNodeInfo) => void
    onUpdateSubPage: (page: PageCache, subItems: MultipleNodeInfo[]) => void

    onRemove: (p: PageCache) => vid
}

/**
 * @description Tab Children 展示
 */
export interface TabChildrenProps {
    pageCache: PageCache[]
    currentTabKey: YakitRoute | string
    openMultipleMenuPage: (route: RouteToPageProps) => void
    afterDeleteSubPage: (type: "other" | "single", r: YakitRoute | string, subItem: MultipleNodeInfo) => void
    afterUpdateSubItem: (page: PageCache, subItem: MultipleNodeInfo) => void
    onUpdateSubPage: (page: PageCache, subItems: MultipleNodeInfo[]) => void
    onSetPageCache: (m: MultipleNodeInfo[],i:number) => void
}

/**
 * @description 二级Tab展示
 * @property item 一级tab详情
 * @property index 在数组中的下标
 * @property currentTabKey 当前选择的tab key
 * @function onSelect 选中一级tab
 * @function onRemove 删除一级tab
 * @function onContextMenu 右键操作
 */
export interface TabItemProps {
    item: PageCache
    index: number
    currentTabKey: YakitRoute | string
    onSelect: (p: PageCache, key: string) => void
    onRemove: (p: PageCache) => void
    onContextMenu: (e: React.MouseEvent) => void
}

/**
 * @description 一级tab
 * @function onDragEnd 一级tab拖拽
 * @function onRemove 删除一级tab
 */
export interface TabListProps {
    pageCache: PageCache[]
    setPageCache: (p: PageCache[]) => void
    currentTabKey: YakitRoute | string
    setCurrentTabKey: (s: YakitRoute | string) => void
    afterDeleteFirstPage: (type: "all" | "other" | "single", page?: PageCache) => void

    onDragEnd: (p: any) => void
    onRemove: (p: PageCache) => void
}

/**
 * @description 二级tab
 * @property pageItem  选中的一级tab详情
 * @property index
 */
export interface SubTabListProps {
    pageCache: PageCache[]
    currentTabKey: YakitRoute | string
    openMultipleMenuPage: (route: RouteToPageProps) => void
    afterDeleteSubPage: (type: "other" | "single", r: YakitRoute | string, subItem: MultipleNodeInfo) => void
    afterUpdateSubItem: (page: PageCache, subItem: MultipleNodeInfo) => void
    onUpdateSubPage: (page: PageCache, subItems: MultipleNodeInfo[]) => void
    onSetPageCache: (m: MultipleNodeInfo[],i:number) => void
    pageItem: PageCache
    index: number
}

export interface SubTabsProps {
    currentTabKey: YakitRoute | string
    ref: ?any
    pageItem: PageCache
    // index: number
    onFocusPage: () => void

    subPage: MultipleNodeInfo[]
    selectSubMenu: MultipleNodeInfo
    setSubPage: (m: MultipleNodeInfo[]) => void
    setSelectSubMenu: React.Dispatch<React.SetStateAction<MultipleNodeInfo>>
    setType: (w: WebFuzzerType) => void

    openMultipleMenuPage: (route: RouteToPageProps) => void
    afterDeleteSubPage: (type: "other" | "single", r: YakitRoute | string, subItem: MultipleNodeInfo) => void
    afterUpdateSubItem: (page: PageCache, subItem: MultipleNodeInfo) => void
    onUpdateSubPage: (page: PageCache, subItems: MultipleNodeInfo[]) => void
    onSetPageCache: (m: MultipleNodeInfo[]) => void
}
/**
 * @description 二级tab item
 * @property subItem  二级详情
 * @property index 在数组中的下标
 * @property selectSubMenu 选中的二级tab详情
 * @function setSelectSubMenu 选中二级tab
 * @function onRemoveSub 删除
 * @function onContextMenu 右键操作
 * @property combineColor 当前组合的颜色
 */
export interface SubTabItemProps {
    subItem: MultipleNodeInfo
    index: number
    selectSubMenu: MultipleNodeInfo
    setSelectSubMenu: (m: MultipleNodeInfo) => void
    onRemoveSub: (m: MultipleNodeInfo) => void
    onContextMenu: (e: React.MouseEvent, subItem: MultipleNodeInfo) => void
    combineColor?: string
    dropType: string
}
/**
 * @description 组
 * @function onUnfoldAndCollapse 收起和展开事件
 * @function onGroupContextMenu 组的右键操作
 * @function dropType 组的拖拽Droppable的type
 * @function subPage
 */
export interface SubTabGroupItemProps extends SubTabItemProps {
    onUnfoldAndCollapse: (subItem: MultipleNodeInfo) => void
    onGroupContextMenu: (e: React.MouseEvent, index: number) => void
    selectMenuGroupId: string
    subPage: MultipleNodeInfo[]
}

export type OperateGroup = "cancelGroup" | "closeGroup" | "closeOtherTabs"
/**
 * @description 组的右键点击展示内容
 * @property groupItem  组详情
 * @function onUpdateGroup  更新组详情
 * @function onOperateGroup  组的一些操作
 */
export interface GroupRightClickShowContentProps {
    groupItem: MultipleNodeInfo
    onUpdateGroup: (m: MultipleNodeInfo) => void
    onOperateGroup: (type: OperateGroup, m: MultipleNodeInfo) => void
}
/**
 * @description 组内拖拽克隆体
 * @property draggableId  拖拽id
 * @property subPage
 * @property selectSubMenu  选中的item
 */
export interface DroppableCloneProps {
    draggableId: string
    subPage: MultipleNodeInfo[]
    selectSubMenu: MultipleNodeInfo
}
