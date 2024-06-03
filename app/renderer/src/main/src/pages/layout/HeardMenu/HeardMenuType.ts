import {
    DatabaseMenuItemProps,
    PrivateAllMenus,
    PrivateRouteMenuProps,
    getFixedPluginDescribe,
    getFixedPluginHoverIcon,
    getFixedPluginIcon
} from "@/routes/newRoute"
import {RouteToPageProps} from "../publicMenu/PublicMenu"
import {SendDatabaseFirstMenuProps} from "@/routes/newRouteType"
import {YakitRoute} from "@/enums/yakitRoute"

export interface HeardMenuProps {
    defaultExpand: boolean
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
 */
export interface RouteMenuDataItemProps {
    menuItem: EnhancedPrivateRouteMenuProps
    isShow: boolean
    isExpand: boolean
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
    setSubMenuData: (s: EnhancedPrivateRouteMenuProps) => void
    activeMenuId: string
}

/**
 * @description: 系统默认菜单的二级菜单 YakitPopover
 * @param subMenuData: 菜单项
 * @param onSelect: 选中菜单
 */
export interface SubMenuProps {
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
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

/**
 * @name 加强型菜单项信息定义
 * @description private版本前端增强型菜单项属性(用于前端数据对比和渲染逻辑使用)
 */
export interface EnhancedPrivateRouteMenuProps extends PrivateRouteMenuProps {
    /** @name 这个属性的值为前端代码中的菜单label */
    menuName: string
    children?: EnhancedPrivateRouteMenuProps[]
}

// 将菜单属性 PrivateRouteMenuProps 转换为 EnhancedPrivateRouteMenuProps
export const privateExchangeProps = (menus: PrivateRouteMenuProps[]) => {
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

/**
 * @name 处理前端本地菜单数据和数据库菜单数据的交互，并整合为一个前端渲染的菜单数据
 * @description 整合逻辑：以数据库数据为主，前端本地新增数据放到已有数据的最后
 * @description 注意!!! 这套逻辑只适用二级菜单全是插件的情况
 * @returns {object} info
 * @returns {Array} info.menus-前端渲染使用的菜单数据
 * @returns {boolean} info.isUpdate-是否需要更新数据库菜单数据
 * @returns {string[]} info.pluginName-菜单内插件名称的合集
 */
// 逻辑还有点问题，需要考虑前端代码菜单被用户主动删除后的不恢复情况
export const privateUnionMenus = (local: EnhancedPrivateRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // 本地是否有新增菜单项
    let isUpdate = false
    // 需要下载的插件菜单名
    let pluginName: string[] = []
    // 前端渲染使用的数据
    const newMenus: EnhancedPrivateRouteMenuProps[] = []

    // 数据库无数据时的逻辑处理
    if (database.length === 0) {
        isUpdate = true
        for (let item of local) {
            const newMenu: EnhancedPrivateRouteMenuProps = {
                ...item,
                menuName: item.label,
                children: []
            }
            if (item.children && item.children.length > 0) {
                for (let subItem of item.children) {
                    // 因为用户侧无数据，前端数据默认都为未下载插件
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
    const localToMenus: Record<string, EnhancedPrivateRouteMenuProps> = {}
    for (let item of local) {
        let child: EnhancedPrivateRouteMenuProps[] = []
        if (item.children && item.children.length > 0)
            child = item.children.map((item) => {
                return {...item}
            })
        localToMenus[item.menuName] = {...item, children: child}
    }

    // 数据库有数据时的逻辑处理
    for (let item of database) {
        const newMenu: EnhancedPrivateRouteMenuProps = {
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
        let referenceMenu: EnhancedPrivateRouteMenuProps[] = []

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
        newMenu.children = [...menus]
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
 * @name 将传入的数据库菜单数据转换为前端可渲染的菜单数据
 * @description local 本地菜单数据，与数据库菜单数据进行对照，如果有本地新增，则在最后进行填充
 * @returns {object} info
 * @returns {string[]} info.plugins-需要下载的插件敏合集
 * @returns {Array} info.menus-前端渲染使用的菜单数据
 */
const databaseConvertLocal = (local: EnhancedPrivateRouteMenuProps[], database: DatabaseMenuItemProps[]) => {
    // 本地数据转换为对应关系对象
    const localToMenus: Record<string, EnhancedPrivateRouteMenuProps> = {}
    for (let item of local) localToMenus[item.menuName] = item

    const plugins: string[] = []
    const menus: EnhancedPrivateRouteMenuProps[] = []
    for (let item of database) {
        if (item.route && item.route !== YakitRoute.Plugin_OP) {
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
            // 记录未下载的插件名
            if (!item.pluginId) plugins.push(item.pluginName || item.menuName)
            const info: EnhancedPrivateRouteMenuProps = {
                page: YakitRoute.Plugin_OP,
                label: item.label,
                menuName: item.menuName,
                icon: getFixedPluginIcon(item.pluginName),
                hoverIcon: getFixedPluginHoverIcon(item.pluginName),
                describe: getFixedPluginDescribe(item.pluginName),
                children: undefined,
                yakScriptId: +item.pluginId || 0,
                yakScripName: item.pluginName
            }
            menus.push(info)
        }
        delete localToMenus[item.menuName]
    }

    // 将本地独有的菜单数据进行最后填充
    for (let localItem of Object.values(localToMenus)) {
        const info: EnhancedPrivateRouteMenuProps = {
            ...localItem,
            yakScriptId: 0
        }
        menus.push(info)
    }

    return {plugins, menus}
}

/** 将public版本前端菜单数据转换为数据库数据结构 */
export const privateConvertDatabase = (data: EnhancedPrivateRouteMenuProps[], mode: string) => {
    const menus: SendDatabaseFirstMenuProps[] = []

    let index = 1
    for (let item of data) {
        const menu: SendDatabaseFirstMenuProps = {
            Group: item.label,
            GroupSort: index,
            Mode: mode,
            GroupLabel: item.menuName || item.label,
            Items: []
        }

        let subIndex = 1
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                menu.Items.push({
                    Mode: mode,
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

/**
 * @name JSON数据转换为前端菜单数据
 * @description 该逻辑暂时只适用于private版本的菜单数据
 * @returns {object} obj
 * @returns obj.menus 转换完的菜单数据
 * @returns obj.isError
 */
export const jsonDataConvertMenus = (data: DatabaseMenuItemProps[]) => {
    const menus: EnhancedPrivateRouteMenuProps[] = []
    // 记录是否有无法转换的数据(数据处理结果:自动抛弃)
    let isError: boolean = false

    for (let item of data) {
        // 缺失关键数据,无法转换
        if (!item.label || !item.menuName) {
            isError = true
            continue
        }

        const menu: EnhancedPrivateRouteMenuProps = {
            page: undefined,
            label: item.label,
            menuName: item.menuName || item.label,
            children: []
        }
        if (item.children && item.children.length > 0) {
            for (let subItem of item.children) {
                // 缺失关键数据,无法转换
                if (!subItem.route || !subItem.label || !subItem.menuName) {
                    isError = true
                    continue
                }
                // 非插件页面，并且未找到对应的页面组件
                if (subItem.route !== YakitRoute.Plugin_OP && !PrivateAllMenus[subItem.route]) {
                    isError = true
                    continue
                }
                if (subItem.route !== YakitRoute.Plugin_OP) {
                    const subMenu: EnhancedPrivateRouteMenuProps = {
                        ...PrivateAllMenus[subItem.route],
                        label: subItem.label,
                        menuName: subItem.menuName || subItem.pluginName || subItem.label,
                        yakScriptId: 0,
                        yakScripName: "",
                        children: undefined
                    }
                    menu.children?.push(subMenu)
                } else {
                    const subMenu: EnhancedPrivateRouteMenuProps = {
                        page: subItem.route,
                        label: subItem.label,
                        menuName: subItem.menuName || subItem.pluginName || subItem.label,
                        icon: getFixedPluginIcon(subItem.pluginName),
                        hoverIcon: getFixedPluginHoverIcon(subItem.pluginName),
                        describe: getFixedPluginDescribe(subItem.pluginName),
                        yakScriptId: subItem.pluginId || 0,
                        yakScripName: subItem.pluginName || ""
                    }
                    menu.children?.push(subMenu)
                }
            }
        } else {
            menu.children = undefined
        }
        menus.push(menu)
    }
    return {menus, isError}
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
                    icon: getFixedPluginIcon(item.pluginName),
                    hoverIcon: getFixedPluginHoverIcon(item.pluginName),
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
