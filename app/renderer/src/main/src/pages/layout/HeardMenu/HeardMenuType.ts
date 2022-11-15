import {MenuItem, MenuItemGroup} from "@/pages/MainOperator"
import {MenuDataProps} from "@/routes/routeSpec"

export interface HeardMenuProps {
    routeMenuData: MenuDataProps[]
    menuItemGroup: MenuItemGroup[]
}

/**
 * @menuItem: 菜单项
 * @isShow: 是否展示
 */
export interface RouteMenuDataItemProps {
    menuItem: MenuDataProps
    isShow: boolean
}
export interface SubMenuProps {
    subMenuData: MenuDataProps[]
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
    number:number
}
