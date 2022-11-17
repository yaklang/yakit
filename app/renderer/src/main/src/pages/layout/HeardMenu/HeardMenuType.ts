import { MenuItem, MenuItemGroup } from "@/pages/MainOperator"
import { MenuDataProps, Route } from "@/routes/routeSpec"

export interface HeardMenuProps {
    routeMenuData: MenuDataProps[]
    menuItemGroup: MenuItemGroup[]
    onRouteMenuSelect:(key: Route) => void
}

/**
 * @menuItem: 菜单项
 * @isShow: 是否展示
 */
export interface RouteMenuDataItemProps {
    menuItem: MenuDataProps
    isShow: boolean
    onSelect: (s: MenuDataProps) => void
}
export interface SubMenuProps {
    subMenuData: MenuDataProps[]
    onSelect: (s: MenuDataProps) => void
}

export interface SubMenuGroupProps {
    subMenuGroupData: MenuItem[]
}

export interface HeardMenuLeftProps {
    isDisplay: boolean
    menuLeftInnerRef?: any
    menuItemGroup: MenuItemGroup[]
    routeMenuData: MenuDataProps[]
    childrenIsViewList?: boolean[]
    number: number
}
