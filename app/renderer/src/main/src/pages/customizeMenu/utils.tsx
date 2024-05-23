import {
    DatabaseMenuItemProps,
    PrivateExpertRouteMenu,
    PrivateRouteMenuProps,
    PrivateScanRouteMenu,
    PublicCommonPlugins,
    PublicRouteMenuProps
} from "@/routes/newRoute"
import {YakitRoute} from "@/routes/newRouteConstants"
import {SendDatabaseFirstMenuProps} from "@/routes/newRouteType"
import {ReactNode} from "react"

/** @name 编辑菜单-增强型菜单(主要适配public和private两个版本的所有属性) */
export interface EnhancedCustomRouteMenuProps {
    /** 因为一级菜单没有page，所以无法创造唯一标识符，id用于生成唯一标识符 */
    id?: string
    page: YakitRoute | undefined
    label: string
    menuName: string
    icon?: ReactNode
    hoverIcon?: JSX.Element
    describe?: string
    yakScriptId?: number
    yakScripName?: string
    headImg?: string
    children?: EnhancedCustomRouteMenuProps[]
    // 是否为用户自定义新增菜单(主要区分代码内定和用户自定义的一级菜单)
    isNew?: boolean
}

/** @name 前端菜单数据转换为JSON数据 */
export const menusConvertJsonData = (data: EnhancedCustomRouteMenuProps[]) => {
    const menus: DatabaseMenuItemProps[] = []
    for (let item of data) {
        const menu: DatabaseMenuItemProps = {
            route: undefined,
            label: item.label,
            menuName: item.menuName || item.label,
            pluginId: 0,
            pluginName: "",
            children: []
        }
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                const subMenu: DatabaseMenuItemProps = {
                    route: subItem.page,
                    label: subItem.label,
                    menuName: subItem.menuName || subItem.yakScripName || subItem.label,
                    pluginId: subItem.yakScriptId || 0,
                    pluginName: subItem.yakScripName || "",
                    HeadImg: subItem?.headImg || undefined
                }
                menu.children?.push(subMenu)
            }
        } else {
            menu.children = undefined
        }
        menus.push(menu)
    }
    return menus
}
/** @name 过滤出用户删除掉的代码内定菜单项(只适用两级菜单) */
export const filterCodeMenus = (menus: SendDatabaseFirstMenuProps[], mode: string) => {
    if (mode === "public") {
        return filterMenus(menus, PublicCommonPlugins)
    }
    if (mode === "expert") {
        return filterMenus(menus, PrivateExpertRouteMenu)
    }
    if (mode === "new") {
        return filterMenus(menus, PrivateScanRouteMenu)
    }
}
/** 对比过滤代码内定菜单-逻辑 */
const filterMenus = (menus: SendDatabaseFirstMenuProps[], local: PublicRouteMenuProps[] | PrivateRouteMenuProps[]) => {
    const filterNames: string[] = []
    const userMenuName: Record<string, string[] | undefined> = {}
    // 整理用户菜单：一级菜单下的二级菜单名合集
    for (let item of menus) {
        userMenuName[item.GroupLabel] = (item.Items || []).map((item) => item.VerboseLabel)
        userMenuName[item.GroupLabel] =
            userMenuName[item.GroupLabel]?.length === 0 ? undefined : userMenuName[item.GroupLabel]
    }
    // 代码内定菜单进行过滤
    for (let item of local) {
        if (!userMenuName[item.label]) {
            filterNames.push(item.label)
            continue
        }
        if (item.children && item.children.length > 0) {
            const names = userMenuName[item.label] || []
            for (let subItem of item.children) {
                // 菜单项唯一名
                const menuname =
                    subItem.page === YakitRoute.Plugin_OP ? subItem.yakScripName || subItem.label : subItem.label
                if (!names.includes(menuname)) filterNames.push(`${item.label}-${menuname}`)
            }
        }
    }
    return filterNames
}

export const addTag = (tags: string, tag: string) => {
    if (tags == "") {
        return tag
    }
    const tagList = tags.split(",")
    const tagSet = new Set(tagList)
    tagSet.add(tag)
    return Array.from(tagSet).join(",")
}

export const removeTag = (tags: string, tag: string) => {
    if (tags == "") {
        return ""
    }
    const tagList = tags.split(",")
    const tagSet = new Set(tagList)
    tagSet.delete(tag)
    return Array.from(tagSet).join(",")
}
