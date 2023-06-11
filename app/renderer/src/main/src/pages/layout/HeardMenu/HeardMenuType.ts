import {MenuItemGroup} from "@/pages/MainOperator"
import {PrivateAllMenus, PrivateRouteMenuProps, YakitRoute} from "@/routes/newRoute"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {getScriptHoverIcon, getScriptIcon} from "./HeardMenu"

export interface HeardMenuProps {
    onRouteMenuSelect: (info: RouteToPageProps) => void
    setRouteToLabel: (data: Map<string, string>) => void
}

/**
 * @description: 系统默认菜单
 * @param {EnhancedPrivateRouteMenuProps} menuItem: 菜单项
 * @param {boolean} isShow: 是否展示
 * @param {boolean} isExpand: 是否展开
 * @param {(s: EnhancedPrivateRouteMenuProps) => void} onSelect: 选中菜单
 * @param {(s: EnhancedPrivateRouteMenuProps) => void} setSubMenuData: 设置子菜单
 * @param {string} activeMenuId: 当前选中菜单
 * @param {(s: EnhancedPrivateRouteMenuProps) => void} onOpenDownModal: 打开下载弹窗
 */
export interface RouteMenuDataItemProps {
    menuItem: EnhancedPrivateRouteMenuProps
    isShow: boolean
    isExpand: boolean
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
    setSubMenuData: (s: EnhancedPrivateRouteMenuProps) => void
    activeMenuId: string
    onOpenDownModal: (s: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: 系统默认菜单的二级菜单 YakitPopover
 * @param subMenuData: 菜单项
 * @param onSelect: 选中菜单
 * @param onOpenDownModal: 打开下载弹窗
 */
export interface SubMenuProps {
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
    onOpenDownModal: (s: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: 一级菜单过多折叠起来的菜单
 * @param menuData: 菜单list
 * @param moreLeft: 更多文字距离左边的位置
 * @param isExpand: 是否展开，展开的一级菜单是对顶对齐，没展开的一级菜单是垂直居中对齐
 * @param onMenuSelect: 选中菜单
 */
export interface CollapseMenuProp {
    menuData: EnhancedPrivateRouteMenuProps[]
    moreLeft: number
    isExpand: boolean
    onMenuSelect: (info: RouteToPageProps) => void
}

export interface MenuByGroupProps {
    Groups: MenuItemGroup[]
}

export interface DownloadOnlinePluginByScriptNamesResponse {
    Data: DownloadOnlinePluginByScriptName[]
}
export interface DownloadOnlinePluginByScriptName {
    ScriptName: string
    Id: number
}

export interface AddMenuRequest {
    Data: MenuItemGroup
}

/**
 * @name 加强型菜单项信息定义
 * @description 辅助数据库和本地菜单数据的对比使用(判断新增菜单和插件的自动下载)
 */
export interface EnhancedPrivateRouteMenuProps extends PrivateRouteMenuProps {
    /** @name 这个属性的值为前端代码中的菜单label */
    menuName: string
    children?: EnhancedPrivateRouteMenuProps[]
}
/**
 * @name 数据库中菜单项的信息定义
 * @param route 菜单路由
 * @param label 菜单显示名称
 * @param menuName 菜单代码名(代码中定义的名)
 * @param pluginId 插件id
 * @param pluginName 插件名称
 * @param children 子集
 */
export interface CacheMenuItemProps {
    route: YakitRoute
    label: string
    menuName: string
    pluginId: string
    pluginName: string
    children?: CacheMenuItemProps[]
}
/**
 * @name 判断本地菜单是否比数据库菜单新增新菜单，同时收集未下载的插件菜单
 * @return menus-完整版的展示菜单数据
 * @return isUpdate-是否有新更新菜单
 * @return updatePlugin-未下载的插件菜单
 */
export const unionMenus = (local: EnhancedPrivateRouteMenuProps[], cache: CacheMenuItemProps[]) => {
    // 将本地菜单数据转换换成对应关系
    const localMenuInfo: Record<string, EnhancedPrivateRouteMenuProps> = {}
    for (let item of local) localMenuInfo[item.menuName] = item

    // 本地是否有新增菜单项
    let isUpdate: boolean = false
    // 是否有需要下载的插件菜单
    let updatePlugin: string[] = []

    const newMenus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of cache) {
        const newMenuItem: EnhancedPrivateRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName,
            children: []
        }

        const cacheChilds = (item.children || []).map((cachei) => cachei.menuName)
        const localChilds = (localMenuInfo[item.menuName]?.children || []).map((locali) => locali.menuName)

        // 数据库中用户新增的一级菜单
        if (localChilds.length === 0) {
            const {downloadPlugin, menus} = cacheConvertLocal(item.children || [], [])
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
            delete localMenuInfo[item.menuName]
            continue
        }
        // 数据库和本地都有的一级菜单
        const unionChilds = Array.from(new Set([...cacheChilds, ...localChilds]))
        // 数据库和本地数据一致
        if (cacheChilds.length === unionChilds.length && localChilds.length === unionChilds.length) {
            const {downloadPlugin, menus} = cacheConvertLocal(item.children || [], [])
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }
        // 本地有新增数据
        if (cacheChilds.length < unionChilds.length && localChilds.length === unionChilds.length) {
            isUpdate = true
            const {downloadPlugin, menus} = cacheConvertLocal(
                item.children || [],
                localMenuInfo[item.menuName]?.children || []
            )
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }
        // 数据库有用户新增数据(代码中删除的页面已在外面进行了过滤)
        if (cacheChilds.length === unionChilds.length && localChilds.length < unionChilds.length) {
            const {downloadPlugin, menus} = cacheConvertLocal(item.children || [], [])
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }
        // 数据库和本地都有新增数据
        if (cacheChilds.length < unionChilds.length && localChilds.length < unionChilds.length) {
            isUpdate = true
            const {downloadPlugin, menus} = cacheConvertLocal(
                item.children || [],
                localMenuInfo[item.menuName]?.children || []
            )
            newMenuItem.children = menus
            newMenus.push(newMenuItem)
            updatePlugin = updatePlugin.concat(downloadPlugin)
        }

        delete localMenuInfo[item.menuName]
        newMenus.push(newMenuItem)
    }

    // 将本地菜单数据中新增数据进行末尾填充
    for (let item of Object.values(localMenuInfo)) newMenus.push(item)

    return {menus: newMenus, isUpdate, updatePlugin}
}
/**
 * @name 将传入的数据库菜单数据转换为前端可渲染的菜单数据
 * @description local 本地菜单数据，与数据库菜单数据进行对照，如果有本地新增，则在最后进行填充
 */
const cacheConvertLocal = (cache: CacheMenuItemProps[], local: EnhancedPrivateRouteMenuProps[]) => {
    const localMenuInfo: Record<string, EnhancedPrivateRouteMenuProps> = {}
    if (local.length > 0) {
        for (let item of local) {
            if (item.page === YakitRoute.Plugin_OP) localMenuInfo[item.yakScripName || item.label] = item
            else localMenuInfo[item.menuName] = item
        }
    }

    const downloadPlugin: string[] = []
    const menus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of cache) {
        if (item.route !== YakitRoute.Plugin_OP) {
            // 排除数据库和本地共有的菜单项
            if (!!localMenuInfo[item.menuName]) delete localMenuInfo[item.menuName]

            const info: EnhancedPrivateRouteMenuProps = {
                ...PrivateAllMenus[item.route],
                label: item.label,
                menuName: item.menuName,
                children: undefined,
                yakScriptId: 0,
                yakScripName: ""
            }
            if (!!info.page && !!info.icon) menus.push(info)
        } else {
            // 记录未下载的插件菜单
            if ((+item.pluginId || 0) === 0) downloadPlugin.push(item.pluginName)
            // 排除数据库和本地共有的菜单项
            if (!!localMenuInfo[item.pluginName]) delete localMenuInfo[item.pluginName]

            if (PrivateAllMenus[item.pluginName]) {
                const info: EnhancedPrivateRouteMenuProps = {
                    ...PrivateAllMenus[item.pluginName],
                    label: item.label,
                    menuName: item.menuName,
                    children: undefined,
                    yakScriptId: +item.pluginId || 0,
                    yakScripName: item.pluginName
                }
                if (!!info.page && !!info.icon) menus.push(info)
            } else {
                const info: EnhancedPrivateRouteMenuProps = {
                    page: YakitRoute.Plugin_OP,
                    label: item.label,
                    menuName: item.menuName,
                    icon: getScriptIcon(item.pluginName),
                    hoverIcon: getScriptHoverIcon(item.pluginName),
                    describe: "",
                    children: undefined,
                    yakScriptId: +item.pluginId || 0,
                    yakScripName: item.pluginName
                }
                menus.push(info)
            }
        }
    }

    // 将本地独有的菜单数据进行最后填充
    for (let localItem of Object.values(localMenuInfo)) {
        const info: EnhancedPrivateRouteMenuProps = {
            ...localItem,
            yakScriptId: 0,
            yakScripName: ""
        }
        if (!!info.page && !!info.icon) menus.push(info)
    }

    return {downloadPlugin, menus}
}

// 将菜单属性 PrivateRouteMenuProps 转换为 EnhancedPrivateRouteMenuProps
export const exchangeMenuProp = (menus: PrivateRouteMenuProps[]) => {
    const newMenus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of menus) {
        const newItem: EnhancedPrivateRouteMenuProps = {
            ...item,
            menuName: item.label,
            children: []
        }

        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                newItem?.children?.push({
                    ...subItem,
                    menuName:
                        subItem.page === YakitRoute.Plugin_OP ? subItem.yakScripName || subItem.label : subItem.label,
                    children: undefined
                })
            }
        } else {
            newItem.children = undefined
        }
        newMenus.push(newItem)
    }
    return newMenus
}
