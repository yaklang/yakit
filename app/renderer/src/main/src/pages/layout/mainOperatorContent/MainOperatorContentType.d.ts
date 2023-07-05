
import { YakitRoute, ComponentParams } from "../../../routes/newRoute";

// 已打开页面的二级页面数据
export interface MultipleNodeInfo {
    /**@name 二级菜单tab唯一值 */
    id: string
    verbose: string
    node: ReactNode
    time?: string
    params?: any
}

/**
 * @name 已打开页面数据
 * @property verbose-页面展示名称
 * @property menuName-页面菜单名称
 * @property route-页面的yakitRoute
 * @property singleNode-单开页面Node
 * @property multipleNode-多开页面的Node合集
 * @property multipleCurrentKey-多开页面当前页面的key
 * @property multipleLength-多开页面已打开过多少个
 * @property hideAdd-二级页面是否隐藏添加按钮
 */
export interface PageCache {
    verbose: string
    menuName: string
    route: YakitRoute
    pluginId?: number
    pluginName?: string
    singleNode: ReactNode | any
    multipleNode: MultipleNodeInfo[] | any[]
    multipleCurrentKey?: string
    multipleLength?: number
    hideAdd?: boolean
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

export interface MainTabMenuProps {
    routeKeyToLabel: Map<string, string>
}

/**
 * @description content 展示
 * @property pageCache 页面数据
 * @function setPageCache 修改页面数据
 */
export interface TabMenuProps {
    pageCache: PageCache[]
    setPageCache: (p: PageCache[]) => void
}

/**
 * @description Tab Children 展示
 * @property pageCache 页面数据
 * @property currentTabKey 当前选择的tab key
 */
export interface TabChildrenProps {
    pageCache: PageCache[]
    currentTabKey: string
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
 * @property tabLength tab长度
 * @property item 一级tab详情
 * @property index 在数组中的下标
 * @property currentTabKey 当前选择的tab key
 * @function onSelect 选中一级tab
 */
export interface TabItemProps {
    tabLength: number
    item: PageCache
    index: number
    currentTabKey: YakitRoute | string
    onSelect: (p: PageCache, key: string) => void
}

/**
 * @description 一级tab
 * @property tabList  tab数据
 * @function onDragEnd 一级tab拖拽 
 * @property currentTabKey 当前选择的tab key
 * @function setCurrentTabKey 设置一级tab key
 */
export interface TabListProps {
    tabList: PageCache[]
    onDragEnd: (p: any) => void
    currentTabKey: string
    setCurrentTabKey: (s: string) => void
}

/**
 * @description 二级tab
 * @property pageItem  选中的一级tab详情
 */
export interface SubTabListProps {
    pageItem: PageCache
}
/**
 * @description 二级tab item
 * @property subPageLength  二级tab长度
 * @property subItem  二级详情
 * @property index 在数组中的下标
 * @property selectSubMenu 选中的二级tab详情
 * @function setSelectSubMenu 选中二级tab
 */
export interface SubTabItemProps {
    subPageLength: number
    subItem: MultipleNodeInfo
    index: number
    selectSubMenu: MultipleNodeInfo
    setSelectSubMenu: (m: MultipleNodeInfo) => void
}