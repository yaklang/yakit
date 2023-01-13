import {MenuItem, MenuItemGroup} from "@/pages/MainOperator"
import {MenuDataProps, Route} from "@/routes/routeSpec"

export interface HeardMenuProps {
    menuItemGroup: MenuItemGroup[]
    onRouteMenuSelect: (key: string) => void
    setRouteKeyToLabel: (r: Map<string, string>) => void
}

/**
 * @description: 系统默认菜单
 * @param {MenuDataProps} menuItem: 菜单项
 * @param {boolean} isShow: 是否展示
 * @param {boolean} isExpand: 是否展开
 * @param {(s: MenuDataProps) => void} onSelect: 选中菜单
 * @param {(s: MenuDataProps) => void} setSubMenuData: 设置子菜单
 * @param {string} activeMenuId: 当前选中菜单
 * @param {(s: MenuDataProps) => void} onOpenDownModal: 打开下载弹窗
 */
export interface RouteMenuDataItemProps {
    menuItem: MenuDataProps
    isShow: boolean
    isExpand: boolean
    onSelect: (s: MenuDataProps) => void
    setSubMenuData: (s: MenuDataProps) => void
    activeMenuId: string
    onOpenDownModal: (s: MenuDataProps) => void
}

// /**
//  * @description: 用户在插件处自定义的菜单
//  * @param {MenuItemGroup} menuGroupItem: 菜单项
//  * @param {boolean} isExpand: 是否展开
//  * @param {(s: MenuItemGroup) => void} onMenuGroupSetSub: 选中菜单
//  * @param {(s: string) => void} onRouteMenuSelect: 设置子菜单
//  * @param {string} activeMenuId: 当前选中菜单
//  */
// export interface MenuGroupItemProps {
//     isExpand: boolean
//     menuGroupItem: MenuItemGroup
//     activeMenuId: string
//     onMenuGroupSetSub: (m: MenuItemGroup) => void
//     onRouteMenuSelect: (s: string) => void
// }

/**
 * @description: 系统默认菜单的二级菜单 YakitPopover
 * @param {MenuDataProps} subMenuData: 菜单项
 * @param {(s: MenuDataProps) => void} onSelect: 选中菜单
 * @param {(s: MenuDataProps) => void} onOpenDownModal: 打开下载弹窗
 */
export interface SubMenuProps {
    subMenuData: MenuDataProps[]
    onSelect: (s: MenuDataProps) => void
    onOpenDownModal: (s: MenuDataProps) => void
}

/**
 * @description: 一级菜单过多折叠起来的菜单
 * @param {MenuDataProps[]} menuData: 菜单list
 * @param {number} moreLeft: 更多文字距离左边的位置
 * @param {boolean} isExpand: 是否展开，展开的一级菜单是对顶对齐，没展开的一级菜单是垂直居中对齐
 *  * @param {(s: string) => void} onSelect: 选中菜单
 */
export interface CollapseMenuProp {
    menuData: MenuDataProps[]
    moreLeft: number
    isExpand: boolean
    onMenuSelect: (s: string) => void
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
