import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {DatabaseMenuItemProps, PublicRouteMenuProps} from "@/routes/newRoute"
import {CodeGV} from "@/yakitGV"
import {RouteToPageProps} from "./PublicMenu"
import {EnhancedPrivateRouteMenuProps} from "../HeardMenu/HeardMenuType"
import {SendDatabaseFirstMenuProps} from "@/routes/newRouteType"
import {YakitRoute} from "@/routes/newRouteConstants"

/** public版本前端增强型菜单项属性(用于前端数据对比和渲染逻辑使用) */
export interface EnhancedPublicRouteMenuProps extends PublicRouteMenuProps {
    menuName: string
    headImg?: string
    children?: EnhancedPublicRouteMenuProps[]
}

/**
 * 将 PublicRouteMenuProps 转换为 EnhancedPublicRouteMenuProps
 * 因为有多层菜单，所以使用深度遍历
 */
export const publicExchangeProps = (menus: PublicRouteMenuProps[]) => {
    const newMenus: EnhancedPublicRouteMenuProps[] = []
    for (let item of menus) {
        const newItem: EnhancedPublicRouteMenuProps = {
            ...item,
            menuName: item.page === YakitRoute.Plugin_OP ? item.yakScripName || item.label : item.label,
            children: undefined
        }

        if (item.children && item.children.length > 0) {
            newItem.children = publicExchangeProps(item.children)
        }
        newMenus.push(newItem)
    }
    return newMenus
}

/**
 * @name 处理前端本地菜单数据和数据库菜单数据的交互，并整合为一个前端渲染的菜单数据
 * @description 整合逻辑：以数据库数据为主，前端本地新增数据放到已有数据的最后
 * @description 注意!!! 这套逻辑只适用二级菜单全是插件的情况
 * @returns {object} info
 * @returns {Array} info.menus-前端渲染使用的菜单数据
 * @returns {boolean} info.isUpdate-是否需要更新数据库菜单数据
 * @returns {string[]} info.pluginName-菜单内插件名称的合集
 */
export const publicUnionMenus = (local: PublicRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // 本地是否有新增菜单项
    let isUpdate = false
    // 需要下载的插件菜单名
    let pluginName: string[] = []
    // 前端渲染使用的数据
    const newMenus: EnhancedPublicRouteMenuProps[] = []

    // 数据库无数据时的逻辑处理
    if (database.length === 0) {
        isUpdate = true
        for (let item of local) {
            const newMenu: EnhancedPublicRouteMenuProps = {
                ...item,
                menuName: item.label,
                children: []
            }
            if (item.children && item.children.length > 0) {
                for (let subItem of item.children) {
                    if (subItem.page === YakitRoute.Plugin_OP) pluginName.push(subItem.yakScripName || "")
                    newMenu.children?.push({
                        ...subItem,
                        menuName: subItem.yakScripName || subItem.label,
                        children: undefined
                    })
                }
            } else {
                newMenu.children = undefined
            }
            newMenus.push(newMenu)
        }

        return {
            menus: newMenus,
            isUpdate,
            pluginName: pluginName.filter((item) => !!item)
        }
    }

    // 本地数据转换为一级菜单对应关系对象
    const localToMenus: Record<string, EnhancedPublicRouteMenuProps> = {}
    for (let item of local) {
        let child: EnhancedPublicRouteMenuProps[] = []
        if (item.children && item.children.length > 0)
            child = item.children.map((subitem) => {
                return {...subitem, menuName: subitem.yakScripName || subitem.label, children: undefined}
            })
        localToMenus[item.label] = {...item, menuName: item.label, children: child}
    }

    // 数据库有数据时的逻辑处理
    for (let item of database) {
        const newMenu: EnhancedPublicRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName,
            children: []
        }

        // 数据库-一级菜单下的二级菜单名合集
        const databaseChilds = (item.children || []).map((databaseI) => databaseI.menuName)
        // 本地-一级菜单下的二级菜单名合集
        const localChilds = (localToMenus[item.menuName]?.children || []).map((localI) => localI.menuName)
        // 计算本地和数据库二级菜单项数量的并集
        const unionChilds = Array.from(new Set([...databaseChilds, ...localChilds]))
        // 进行比对的本地参考数据
        let referenceMenu: EnhancedPublicRouteMenuProps[] = []

        // 用户自定义的一级菜单
        if (localChilds.length === 0) referenceMenu = []

        // 数据库和本地数据一致
        if (databaseChilds.length === unionChilds.length && localChilds.length === unionChilds.length) {
            referenceMenu = []
        }
        // 本地有新增数据
        if (databaseChilds.length < unionChilds.length && localChilds.length === unionChilds.length) {
            isUpdate = true
            referenceMenu = localToMenus[item.menuName]?.children || []
        }
        // 数据库有用户新增数据
        if (databaseChilds.length === unionChilds.length && localChilds.length < unionChilds.length) {
            referenceMenu = []
        }
        // 数据库和本地都有新增数据
        if (databaseChilds.length < unionChilds.length && localChilds.length < unionChilds.length) {
            isUpdate = true
            referenceMenu = localToMenus[item.menuName]?.children || []
        }

        const {plugins, menus} = databaseConvertLocal(referenceMenu, item.children || [])
        newMenu.children = menus
        newMenus.push(newMenu)
        pluginName = pluginName.concat(plugins)
        delete localToMenus[item.menuName]
    }

    // 将本地菜单数据中新增数据进行末尾填充
    for (let item of Object.values(localToMenus)) newMenus.push(item)

    return {
        menus: newMenus,
        isUpdate,
        pluginName: pluginName.filter((item) => !!item)
    }
}

/**
 * @name 将传入的数据库二级菜单数据和本地二级菜单数据进行整合
 * @description 整合逻辑：以数据库数据为主，前端本地新增数据放到已有数据的最后
 */
const databaseConvertLocal = (local: EnhancedPublicRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // 本地数据转换为对应关系对象
    const localToMenus: Record<string, EnhancedPublicRouteMenuProps> = {}
    for (let item of local) localToMenus[item.label] = item

    const plugins: string[] = []
    const menus: EnhancedPublicRouteMenuProps[] = []
    for (let item of database) {
        if (item.route === YakitRoute.Plugin_OP && !item.pluginId) plugins.push(item.pluginName || item.menuName)
        menus.push({
            page: item.route as YakitRoute,
            label: item.label,
            menuName: item.menuName,
            yakScriptId: item.pluginId,
            yakScripName: item.pluginName,
            headImg: item.HeadImg
        })
        delete localToMenus[item.menuName]
    }

    // 将本地独有的菜单数据进行最后填充
    for (let localItem of Object.values(localToMenus)) {
        const info: EnhancedPublicRouteMenuProps = {
            ...localItem,
            yakScriptId: 0
        }
        if (!info.yakScriptId) {
            plugins.push(info.yakScripName || info.menuName)
        }
        menus.push(info)
    }

    return {plugins, menus}
}

/** 将public版本前端菜单数据转换为数据库数据结构 */
export const publicConvertDatabase = (data: EnhancedPublicRouteMenuProps[]) => {
    const menus: SendDatabaseFirstMenuProps[] = []

    let index = 1
    for (let item of data) {
        const menu: SendDatabaseFirstMenuProps = {
            Group: item.label,
            GroupSort: index,
            Mode: CodeGV.PublicMenuModeValue,
            GroupLabel: item.menuName || item.label,
            Items: []
        }

        let subIndex = 1
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                menu.Items.push({
                    Mode: CodeGV.PublicMenuModeValue,
                    VerboseSort: subIndex,
                    GroupSort: index,
                    Route: subItem.page || "",
                    Group: menu.Group,
                    GroupLabel: menu.GroupLabel,
                    Verbose: subItem.label,
                    VerboseLabel: subItem.menuName || subItem.label,
                    YakScriptName: subItem.yakScripName || ""
                })
                subIndex += 1
            }
        }

        menus.push(menu)
        index += 1
    }

    return menus
}

/** ---------- public和private版本共用工具方法 ---------- */

/**
 * @name 将页面信息转换为唯一标识符
 * @description 插件菜单：${YakitRoute}|${插件名}
 * @description 非插件菜单：${YakitRoute}
 */
export const routeConvertKey = (route: YakitRoute, pluginName?: string) => {
    if (route === YakitRoute.Plugin_OP) return `${route}${separator}${pluginName || ""}`
    else return route
}

/**
 * @name 唯一标识符转为页面信息 与routeConvertKey配套
 */
export const KeyConvertRoute = (str: string) => {
    try {
        // 判断条件由当前组件方法(routeToMenu)里的分隔符变量(separator)决定
        if (str.indexOf(separator) > -1) {
            const keys = str.split(separator)
            const route = keys[0] as YakitRoute
            const info: RouteToPageProps = {
                route: route,
                pluginName: keys[1] || ""
            }
            return info
        } else {
            const route = str as YakitRoute
            const info: RouteToPageProps = {route: route}
            return info
        }
    } catch (error) {
        return null
    }
}

/**
 * 深度遍历所有菜单项,并将菜单项转换为 ${routeInfoToKey()}-菜单展示名
 */
export const menusConvertKey = (data: EnhancedPublicRouteMenuProps[] | EnhancedPrivateRouteMenuProps[]) => {
    const names: Map<string, string> = new Map<string, string>()
    for (let item of data) {
        if (item.page) names.set(routeConvertKey(item.page, item.menuName), item.label)
        if (item.children && item.children.length > 0) {
            const subNames = menusConvertKey(item.children)
            subNames.forEach((value, key) => names.set(key, value))
        }
    }
    return names
}

export const separator = "|"
/** 将菜单数据转换成 Menu组件数据 */
export const routeToMenu = (
    routes: EnhancedPublicRouteMenuProps[] | EnhancedPrivateRouteMenuProps[],
    parent?: string
) => {
    const menus: YakitMenuItemProps[] = []
    for (let item of routes) {
        const menuItem: YakitMenuItemProps = {
            label: item.label,
            key: `${routeInfoToKey(item)}${parent ? separator + parent : ""}`
        }
        if (item.children && item.children.length > 0) menuItem.children = routeToMenu(item.children, item.label)
        menus.push(menuItem)
    }
    return menus
}

/**
 * 将页面路由信息 转换为key值
 * 转换格式：route|插件ID|插件名
 */
export const routeInfoToKey = (
    info: RouteToPageProps | EnhancedPublicRouteMenuProps | EnhancedPrivateRouteMenuProps
) => {
    if ((info as RouteToPageProps).route) {
        const data = info as RouteToPageProps
        if (data.route === YakitRoute.Plugin_OP) {
            return `${data.route}${separator}${data.pluginId || 0}${separator}${data.pluginName || ""}`
        } else {
            return data.route as string
        }
    } else {
        const data = info as EnhancedPublicRouteMenuProps | EnhancedPrivateRouteMenuProps
        if (data.page === YakitRoute.Plugin_OP) {
            return `${data.page}${separator}${data.yakScriptId || 0}${separator}${data.yakScripName || data.menuName}`
        } else {
            return data.page || data.label
        }
    }
}
/** 将menu组件的key值 转换为页面路由信息 */
export const keyToRouteInfo = (str: string) => {
    try {
        // 判断条件由当前组件方法(routeToMenu)里的分隔符变量(separator)决定
        if (str.indexOf(separator) > -1) {
            const keys = str.split(separator)
            const route = keys[0] as YakitRoute
            const info: RouteToPageProps = {
                route: route,
                pluginId: +keys[1] || 0,
                pluginName: keys[2] || ""
            }
            return info
        } else {
            const route = str as YakitRoute
            const info: RouteToPageProps = {route: route}
            return info
        }
    } catch (error) {
        return null
    }
}

/** @name 下载线上插件成功后回传的插件信息(批量下载) */
export interface DownloadOnlinePluginByScriptNamesResponse {
    Data: {ScriptName: string; Id: string; HeadImg: string}[]
}
