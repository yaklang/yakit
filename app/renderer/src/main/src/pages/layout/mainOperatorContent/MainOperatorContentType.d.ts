
import React from "react";
import { YakitRoute, ComponentParams } from "../../../routes/newRoute";
import { RouteToPageProps } from '../publicMenu/PublicMenu'

/**
 * @name 已打开页面的二级页面数据
 * @property id
 * @property verbose-页面展示名称
 * @property time webFuzzer 缓存使用
 * @property params-页面传递参数
 */
export interface MultipleNodeInfo {
    /**@name 二级菜单tab唯一值 */
    id: string
    verbose: string
    time?: string
    params?: ComponentParams
}

/**
 * @name 已打开页面数据
 * @property routeKey-一级页面唯一值
 * @property verbose-页面展示名称
 * @property menuName-页面菜单名称
 * @property route-页面的yakitRoute
 * @property singleNode-单开页面Node
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
    // singleNode: ReactNode | any
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
    onRemove: (p: PageCache) => vid
}

/**
 * @description Tab Children 展示
 */
export interface TabChildrenProps {
}

/**
 * @description 页面渲染
 * @property routeKey 路由key
 * @property yakScriptId 
 * @property {ComponentParams} params 页面初始渲染的参数
 */
export interface PageItemProps {
    routeKey: YakitRoute | string
    yakScriptId?: number
    params?: ComponentParams
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
    onDragEnd: (p: any) => void
    onRemove: (p: PageCache) => void
}

/**
 * @description 二级tab
 * @property pageItem  选中的一级tab详情
 * @property index  
 */
export interface SubTabListProps {
    pageItem: PageCache
    index: number
}
/**
 * @description 二级tab item
 * @property subItem  二级详情
 * @property index 在数组中的下标
 * @property selectSubMenu 选中的二级tab详情
 * @function setSelectSubMenu 选中二级tab
 * @function onContextMenu 右键操作
 */
export interface SubTabItemProps {
    subItem: MultipleNodeInfo
    index: number
    selectSubMenu: MultipleNodeInfo
    setSelectSubMenu: (m: MultipleNodeInfo) => void
    onRemoveSub: (m: MultipleNodeInfo) => void
    onContextMenu: (e: React.MouseEvent) => void
}


/**
 * @description MainOperatorContextProps
 * @property pageCache  路由数据
 * @function setPageCache 修改路由
 * @property currentTabKey 一级选中的tab
 * @function setCurrentTabKey 设置选中tab
 * @property TabMenuHeight tab-menu内容高度
 * @function setTabMenuHeight 设置tab-menu的内容高度
 * @function openMultipleMenuPage 打开页面
 * @function afterDeleteFirstPage 删除一级页面的回调  'all'|'other'|'single' 
 * @function afterDeleteSubPage 删除二级页面的回调 'other'|'single'
 * @function afterUpdateSubPage 更新页面信息后的回调
 * @function afterDragEndSubPage 二级tab拖拽后的回调
 */
export interface MainOperatorContextProps {
    pageCache: PageCache[]
    setPageCache: (p: PageCache[]) => void
    currentTabKey: string
    setCurrentTabKey: (s: YakitRoute | string) => void
    tabMenuHeight: number
    setTabMenuHeight: (n: number) => void
    openMultipleMenuPage: (route: RouteToPageProps) => void
    afterDeleteFirstPage: (type: 'all' | 'other' | 'single', page?: PageCache) => void
    afterDeleteSubPage: (type: 'other' | 'single', r: YakitRoute | string, subItem: MultipleNodeInfo) => void
    afterUpdateSubPage: (page: PageCache, subItem: MultipleNodeInfo) => void
    afterDragEndSubPage: (page: PageCache, subItems: MultipleNodeInfo[]) => void
}