
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
    multipleNode: multipleNodeInfo[] | any[]
    multipleCurrentKey?: string
    multipleLength?: number
    hideAdd?: boolean
}

export // 页面的唯一标识属性
    interface OnlyPageCache {
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

export interface TabMenuProps {
    pageCache: PageCache[]
    setPageCache: (p: PageCache[]) => void
    currentTabKey:YakitRoute | string
    setCurrentTabKey:(v:YakitRoute | string)=>void
}