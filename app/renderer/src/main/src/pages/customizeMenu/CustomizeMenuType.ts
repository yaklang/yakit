import {MenuDataProps} from "@/routes/routeSpec"
import {YakScript} from "../invoker/schema"

export interface CustomizeMenuProps {
    onClose: () => void
}

/**
 * @description: 一级菜单项
 * @property {MenuDataProps}  menuData 菜单数据 
 * @property {(s: MenuDataProps) => void} setMenuData  
 * @property {MenuDataProps} currentFirstMenu  
 * @property {(s: MenuDataProps) => void}  onSelect 
 * @property {(s: MenuDataProps) => void}  onRemove 删除该项
 */
export interface FirstMenuProps {
    menuData: MenuDataProps[]
    setMenuData: (s: MenuDataProps[]) => void
    currentFirstMenu?: MenuDataProps
    onSelect: (s: MenuDataProps) => void
    onRemove: (s: MenuDataProps) => void
}
/**
 * @description: 一级菜单项
 * @property {MenuDataProps}  menuItem 菜单项
 * @property {MenuDataProps}  currentMenuItem 当前选中
 * @property {boolean} isDragging 拖拽中
 * @property {(s: MenuDataProps) => void} onSelect 选中
 * @property {string}  destinationDrag 拖拽的目的地
 * @property {(s: MenuDataProps) => void}  onRemove 删除该项
 */
export interface FirstMenuItemProps {
    menuItem: MenuDataProps
    currentMenuItem?: MenuDataProps
    isDragging: boolean
    onSelect: (s: MenuDataProps) => void
    destinationDrag: string
    onRemove: (s: MenuDataProps) => void
}

/**
 * @description: 一级菜单项
 * @property {MenuDataProps}  currentFirstMenu 父级菜单
 * @property {(s: MenuDataProps) => void}  setCurrentFirstMenu 修改父级菜单
 * @property {MenuDataProps}  subMenuData 当前二级菜单
 * @property {() => void}  onRemoveFirstMenu 删除一级菜单
 * @property {(m: MenuDataProps) => void}  onRemoveSecondMenu 删除二级菜单
 * @property {(m: MenuDataProps) => void}  onEdit 编辑二级菜单
 */
export interface SecondMenuProps {
    currentFirstMenu?: MenuDataProps
    editCurrentFirstMenu: (s: string) => void
    subMenuData: MenuDataProps[]
    onRemoveFirstMenu: () => void
    onRemoveSecondMenu: (m: MenuDataProps) => void
    onEdit: (m: MenuDataProps) => void
}
/**
 * @description: 二级菜单项
 * @property {MenuDataProps}  menuItem 菜单项
 * @property {boolean} isDragging 拖拽中
 * @property {(m: MenuDataProps) => void}  onRemoveSecondMenu 删除二级菜单
 * @property {(m: MenuDataProps) => void}  onEdit 编辑二级菜单
 */
export interface SecondMenuItemProps {
    menuItem: MenuDataProps
    isDragging: boolean
    onRemoveSecondMenu: (m: MenuDataProps) => void
    onEdit: (m: MenuDataProps) => void
}

/**
 * @description: 右边的系统功能和插件模块
 * @property {string} destinationDrag 当前的拖拽目的地
 * @property {(s: YakScript[]) => void} setPluginList 当前最新的本地插件list
 * @property {(m: MenuDataProps) => void} onAddMenuData 添加二级菜单
 * @property { MenuDataProps[]} subMenuData 二级菜单
 */
export interface FeaturesAndPluginProps {
    destinationDrag: string
    setPluginList: (s: YakScript[]) => void
    onAddMenuData: (m: MenuDataProps) => void
    subMenuData: MenuDataProps[]
}

/**
 * @description: 系统功能模块列表 
 * @property {string} keywords 搜索关键词
 * @property {boolean} isSearch 搜索
 * @property {string} destinationDrag 当前的拖拽目的地
 * @property {(m: MenuDataProps) => void} onAddMenuData 添加二级菜单
 * @property { MenuDataProps[]} subMenuData 二级菜单
 */
export interface SystemFunctionListProps {
    keywords: string
    isSearch: boolean
    destinationDrag: string
    onAddMenuData: (m: MenuDataProps) => void
    subMenuData: MenuDataProps[]
}

/**
 * @description: 系统功能小组件
 * @property {MenuDataProps} item 当前菜单数据
 * @property {boolean} isDragging 是否拖拽中
 * @property {string} destinationDrag 当前的拖拽目的地
 * @property {(m: MenuDataProps) => void} onAddMenuData 添加二级菜单
 * @property {boolean} isDragDisabled 是否可以被拖拽
 */
export interface SystemRouteMenuDataItemProps {
    item: MenuDataProps
    isDragging: boolean
    destinationDrag: string
    onAddMenuData: (m: MenuDataProps) => void
    isDragDisabled: boolean
}

/**
 * @description: 插件本地功能模块列表
 * @property {string} keywords 搜索关键词
 * @property {boolean} isSearch 搜索
 * @property {string} destinationDrag 当前的拖拽目的地
 * @property {(s: YakScript[]) => void} setPluginList 当前最新的本地插件list
 * @property {(m: MenuDataProps) => void} onAddMenuData 添加二级菜单
 * @property { MenuDataProps[]} subMenuData 二级菜单
 */
export interface PluginLocalListProps {
    keywords: string
    isSearch: boolean
    destinationDrag: string
    setPluginList: (s: YakScript[]) => void
    onAddMenuData: (m: MenuDataProps) => void
    subMenuData: MenuDataProps[]
}

/**
 * @description: 本地插件功能小组件
 * @property {YakScript} plugin 当前插件
 * @property {boolean} isDragging 是否拖拽中
 * @property {string} destinationDrag 当前的拖拽目的地
 * @property {(m: MenuDataProps) => void} onAddMenuData 添加二级菜单
 * @property {boolean} isDragDisabled 是否可以被拖拽
 */
export interface PluginLocalItemProps {
    plugin: YakScript
    isDragging: boolean
    destinationDrag: string
    onAddMenuData: (m: MenuDataProps) => void
    isDragDisabled: boolean
}
