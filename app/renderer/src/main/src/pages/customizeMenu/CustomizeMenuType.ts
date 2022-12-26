import {MenuDataProps} from "@/routes/routeSpec"

export interface CustomizeMenuProps {
    onClose:()=>void
}

/**
 * @description: 一级菜单项
 * @property {MenuDataProps}  menuData 菜单数据
 */
export interface FirstMenuProps {
    menuData: MenuDataProps[]
    setMenuData: (s: MenuDataProps[]) => void
    currentFirstMenu?: MenuDataProps
    onSelect: (s: MenuDataProps) => void
}
/**
 * @description: 一级菜单项
 * @property {MenuDataProps}  menuItem 菜单项
 * @property {MenuDataProps}  currentMenuItem 当前选中
 * @property {boolean} isDragging 拖拽中
 * @property {(s: MenuDataProps) => void} onSelect 选中
 * @property {string}  destinationDrag 拖拽的目的地
 */
export interface FirstMenuItemProps {
    menuItem: MenuDataProps
    currentMenuItem?: MenuDataProps
    isDragging: boolean
    onSelect: (s: MenuDataProps) => void
    destinationDrag: string
}

/**
 * @description: 一级菜单项
 * @property {MenuDataProps}  currentFirstMenu 父级菜单
 * @property {(s: MenuDataProps) => void}  setCurrentFirstMenu 修改父级菜单
 * @property {MenuDataProps}  subMenuData 当前二级菜单
 * @property {(s: MenuDataProps) => void}  setSubMenuData 修改当前二级菜单
 */
export interface SecondMenuProps {
    currentFirstMenu?: MenuDataProps
    editCurrentFirstMenu: (s: string) => void
    subMenuData: MenuDataProps[]
    setSubMenuData: (s: MenuDataProps[]) => void
    onRemoveFirstMenu: () => void
}
/**
 * @description: 二级菜单项
 * @property {MenuDataProps}  menuItem 菜单项
 * @property {boolean} isDragging 拖拽中
 */
export interface SecondMenuItemProps {
    menuItem: MenuDataProps
    isDragging: boolean
}
