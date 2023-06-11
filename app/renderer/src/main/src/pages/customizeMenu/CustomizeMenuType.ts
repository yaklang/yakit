import {YakScript} from "../invoker/schema"
import {EnhancedPrivateRouteMenuProps} from "../layout/HeardMenu/HeardMenuType"

export interface CustomizeMenuProps {
    visible: boolean
    onClose: () => void
}

/**
 * @description: 一级菜单项
 * @property menuData 菜单数据
 * @property setMenuData
 * @property currentFirstMenu
 * @property onSelect
 * @property onRemove 删除该项
 */
export interface FirstMenuProps {
    menuData: EnhancedPrivateRouteMenuProps[]
    setMenuData: (s: EnhancedPrivateRouteMenuProps[]) => void
    currentFirstMenu?: EnhancedPrivateRouteMenuProps
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
    onRemove: (s: EnhancedPrivateRouteMenuProps) => void
}
/**
 * @description: 一级菜单项
 * @property menuItem 菜单项
 * @property currentMenuItem 当前选中
 * @property isDragging 拖拽中
 * @property onSelect 选中
 * @property destinationDrag 拖拽的目的地
 * @property onRemove 删除该项
 */
export interface FirstMenuItemProps {
    menuItem: EnhancedPrivateRouteMenuProps
    currentMenuItem?: EnhancedPrivateRouteMenuProps
    isDragging: boolean
    onSelect: (s: EnhancedPrivateRouteMenuProps) => void
    destinationDrag: string
    onRemove: (s: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: 一级菜单项
 * @property currentFirstMenu 父级菜单
 * @property setCurrentFirstMenu 修改父级菜单
 * @property subMenuData 当前二级菜单
 * @property onRemoveFirstMenu 删除一级菜单
 * @property onRemoveSecondMenu 删除二级菜单
 * @property onEdit 编辑二级菜单
 */
export interface SecondMenuProps {
    currentFirstMenu?: EnhancedPrivateRouteMenuProps
    editCurrentFirstMenu: (s: string) => void
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onRemoveFirstMenu: () => void
    onRemoveSecondMenu: (m: EnhancedPrivateRouteMenuProps) => void
    onEdit: (m: EnhancedPrivateRouteMenuProps) => void
}
/**
 * @description: 二级菜单项
 * @property menuItem 菜单项
 * @property 拖拽中
 * @property onRemoveSecondMenu 删除二级菜单
 * @property onEdit 编辑二级菜单
 */
export interface SecondMenuItemProps {
    menuItem: EnhancedPrivateRouteMenuProps
    isDragging: boolean
    onRemoveSecondMenu: (m: EnhancedPrivateRouteMenuProps) => void
    onEdit: (m: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: 右边的系统功能和插件模块
 * @property destinationDrag 当前的拖拽目的地
 * @property setPluginList 当前最新的本地插件list
 * @property onAddMenuData 添加二级菜单
 * @property subMenuData 二级菜单
 * @property onRemoveMenu 删除二级菜单
 * @property SystemRouteMenuData 系统所有二级菜单
 */
export interface FeaturesAndPluginProps {
    destinationDrag: string
    setPluginList: (s: YakScript[]) => void
    onAddMenuData: (m: EnhancedPrivateRouteMenuProps) => void
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onRemoveMenu: (m: EnhancedPrivateRouteMenuProps) => void
    SystemRouteMenuData: EnhancedPrivateRouteMenuProps[]
}

/**
 * @description: 系统功能模块列表
 * @property keywords 搜索关键词
 * @property isSearch 搜索
 * @property destinationDrag 当前的拖拽目的地
 * @property onAddMenuData 添加二级菜单
 * @property subMenuData 二级菜单
 * @property onRemoveMenu 删除二级菜单
 * @property SystemRouteMenuData 系统所有二级菜单
 */
export interface SystemFunctionListProps {
    keywords: string
    isSearch: boolean
    destinationDrag: string
    onAddMenuData: (m: EnhancedPrivateRouteMenuProps) => void
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onRemoveMenu: (m: EnhancedPrivateRouteMenuProps) => void
    SystemRouteMenuData: EnhancedPrivateRouteMenuProps[]
}

/**
 * @description: 系统功能小组件
 * @property item 当前菜单数据
 * @property isDragging 是否拖拽中
 * @property destinationDrag 当前的拖拽目的地
 * @property onAddMenuData 添加二级菜单
 * @property isDragDisabled 是否可以被拖拽
 * @property onRemoveMenu 删除二级菜单
 */
export interface SystemRouteMenuDataItemProps {
    item: EnhancedPrivateRouteMenuProps
    isDragging: boolean
    destinationDrag: string
    onAddMenuData: (m: EnhancedPrivateRouteMenuProps) => void
    isDragDisabled: boolean
    onRemoveMenu: (m: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: 插件本地功能模块列表
 * @property keywords 搜索关键词
 * @property isSearch 搜索
 * @property destinationDrag 当前的拖拽目的地
 * @property setPluginList 当前最新的本地插件list
 * @property onAddMenuData 添加二级菜单
 * @property subMenuData 二级菜单
 * @property onRemoveMenu 删除二级菜单
 */
export interface PluginLocalListProps {
    keywords: string
    isSearch: boolean
    destinationDrag: string
    setPluginList: (s: YakScript[]) => void
    onAddMenuData: (m: EnhancedPrivateRouteMenuProps) => void
    subMenuData: EnhancedPrivateRouteMenuProps[]
    onRemoveMenu: (m: EnhancedPrivateRouteMenuProps) => void
}

/**
 * @description: 本地插件功能小组件
 * @property plugin 当前插件
 * @property isDragging 是否拖拽中
 * @property destinationDrag 当前的拖拽目的地
 * @property onAddMenuData 添加二级菜单
 * @property isDragDisabled 是否可以被拖拽
 * @property onRemoveMenu 删除二级菜单
 */
export interface PluginLocalItemProps {
    plugin: YakScript
    isDragging: boolean
    destinationDrag: string
    onAddMenuData: (m: EnhancedPrivateRouteMenuProps) => void
    isDragDisabled: boolean
    onRemoveMenu: (m: EnhancedPrivateRouteMenuProps) => void
}

export interface PluginLocalInfoProps {
    plugin: YakScript
    wrapperClassName?: string
    getScriptInfo?: (YakScript) => void
}
