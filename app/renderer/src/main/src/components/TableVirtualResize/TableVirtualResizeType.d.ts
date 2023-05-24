import { ReactNode } from "react"
import { SearchProps } from "antd/lib/input"
import { SelectProps } from "antd"
import { YakitInputProps } from "../yakitUI/YakitInput/YakitInputType"

/**
 * @description:表格的props描述，包裹虚拟表格的父元素需要设置高度
 * @property {"small" | "middle"} size: 表格单行高度 middle：32px; small:28px
 * @property {any} ref: 返回的滚动条所在的div的元素
 * @property {string | ReactNode} title: 表格顶部的title,左边
 * @property {ReactNode} extra: 表格顶部的title，右边
 * @property {ReactNode} renderTitle: 自定义表格顶部的title
 * @property {number} titleHeight: 自定义表格顶部的高度,使用renderTitle,需要传入对应的height,否则虚拟列表滚动会不正确
 * @property {T[]} data:数组 可以传cellClassName用来控制单元格样式，不要传height
 * @property {string} renderKey:每行的key值，不可重复
 * @property {ColumnsTypeProps[]} columns:每列的参数
 * @property {RowSelectionProps<T>} rowSelection:多选/单选配置，目前只支持多选
 * @property {boolean} enableDrag:true,表格列之间可以拖动，最后一列除外。columns中也可以单独设置某一列是否可以拖动
 * @event (record: T) => void onRowClick:row鼠标左键点击事件，会返回当前选中row的数据
 * @event (record: T, e: React.MouseEvent) => void onRowContextMenu:row鼠标右键点击事件，会返回当前选中row的数据和e
 * @property {PaginationProps} pagination:分页配置
 * @event (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => void onChange:查询条件变化
 * @property {boolean} loading：是否加载中
 * @property {number} scrollToBottom：距离底部多少px开始加载下一页,默认300
 * @property {boolean} isReset：重置表格条件 滚动至0
 * @property {boolean} isShowTotal：内置的total是否显示；true显示，false不显示
 * @property {number} currentIndex：当前row的index
 * @property {boolean} isRefresh： 刷新表格 滚动至0
 * @property {boolean} disableSorting：禁用排序
 * @property {object} query：查询条件
 * @event (T) => onSetCurrentRow 选中项
 * @event (record: T) => void onSetCurrentRow:设置选中
 * @event (dragIndex: number, hoverIndex: number) => void onMoveRow:拖拽
 * @property {boolean} enableDragSort 是否拖拽排序
 * @event   onMoveRowEnd 拖拽结束
 * @property {boolean}  useUpAndDown 是否启用上下建
 * @property {string}  containerClassName 容器得类样式
 * @property {boolean}  isRightClickBatchOperate 右键菜单批量操作，支持Shift + 鼠标左键同时点击
 */
export interface TableVirtualResizeProps<T> {
    size?: "small" | "middle" | "large"
    ref?: any
    /**
     * @private 组件自用
     */
    getTableRef?: any
    title?: string | ReactNode
    renderTitle?: ReactNode
    titleHeight?: number
    extra?: ReactNode
    data: T[]
    renderKey: string
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
    enableDrag?: boolean
    onRowClick?: (record: T) => void
    onRowContextMenu?: (record: T, e: React.MouseEvent) => void
    pagination?: PaginationProps
    onChange?: (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => void
    loading?: boolean
    scrollToBottom?: number // 默认300
    isReset?: boolean //重置表格条件 滚动至0
    isShowTotal?: boolean
    currentIndex?: number //当前row的index
    isRefresh?: boolean //刷新表格 滚动至0
    disableSorting?: boolean //禁用排序
    query?: object
    currentSelectItem?: T
    onSetCurrentRow?: (record: T) => void
    onMoveRow?: (dragIndex: number, hoverIndex: number) => void
    enableDragSort?: boolean
    onMoveRowEnd?: () => void
    useUpAndDown?: boolean
    containerClassName?:string
    isRightClickBatchOperate?:boolean
}

export interface SortProps {
    order: "none" | "asc" | "desc"
    orderBy: string
}

/**
 * @description: 表格列的props描述
 * @property {string}  title: 表格列的标题 
 * @property {string} dataKey: 表格列的key,用于查询条件等  
 * @property {number} width: 表格列的宽度  
 * @property {number} minWidth: 表格列的最小宽度 
 * @property {boolean} ellipsis: 超出...，默认true 
 * @property {"left" | "right" | "center"} align: 文字对齐方向，默认 left 
 * @property {"left" | "right"} fixed:固定列，目前不支持隔空固定,固定列的右边如果多列，最偏左的一列，需要自己修改样式
 * .virtual-table-row-content+.virtual-table-row-fixed-right:nth-last-child(1) {
        border-left: 1px solid #EAECF3;
        box-shadow: -4px 0px 6px rgba(133, 137, 158, 0.1);
    }
 * @property {(text, record, index) => ReactNode} render：自定义渲染每列的单元格  
 * @property {FilterProps} filterProps：筛选表格配置  
 * @property {SorterProps} sorterProps：表格排序配置 
 * @property {boolean} enableDrag：表格排序配置 
 * @property {string} tip :提示 
 * @property {ReactNode} beforeIconExtra :在排序/搜索icon前 
 * @property {ReactNode} afterIconExtra :在排序/搜索icon前 
 */
export interface ColumnsTypeProps {
    title: string
    dataKey: string
    width?: number
    minWidth?: number
    ellipsis?: boolean
    align?: "left" | "right" | "center" //默认 left
    fixed?: "left" | "right"
    /** @access private */
    left?: number // 外面不需要传，不接收，紧作为固定列使用
    /** @access private */
    right?: number // 外面不需要传，不接收，紧作为固定列使用
    /** @access private 是否有默认宽度*/
    isDefWidth?: boolean
    render?: (text, record, index) => ReactNode
    filterProps?: FilterProps
    sorterProps?: SorterProps
    enableDrag?: boolean
    tip?: string
    // extra?: ReactNode
    beforeIconExtra?: ReactNode
    afterIconExtra?: ReactNode
}

interface FilterSearchInputProps extends SearchProps {
    isShowIcon?: boolean
}

interface FilterSearchMultipleProps extends SelectProps { }

export interface SorterProps {
    sorterKey?: string
    sorter?: string | boolean // boolean是否开启排序，string自定义
    order?: string // none 无状态； asc 升序  desc 降序
}

/**
 * @property {ReactNode}  filterRender 自定义渲染搜索UI和逻辑
 * @property {(d: any) => ReactNode}  filterOptionRender  单选或者多选的时候渲染option
 * @property {string}  filterKey  查询的对对象名
 * @property {"select" | "input" | "dateTime"}  filtersType  搜索的类型
 * @property {FiltersSelectAllProps}  filtersSelectAll  是否显示所有
 * @property {FiltersItemProps[]}  filters  表头的筛选菜单项c
 * @property {boolean}  filterSearch  筛选菜单项是否可搜索
 * @property {FilterSearchInputProps}  filterSearchInputProps  input的props属性
 * @property {FilterSearchMultipleProps}  filterMultipleProps  继承antd的SelectProps
 * @property {boolean}  filterMultiple  是否多选 filtersType 为select才有效
 * @property {ReactNode}  filterIcon  自定义 filter 图标
 * @property {YakitInputProps}  filterInputProps  input的props属性
 */
export interface FilterProps {
    filterRender?: () => ReactNode
    filterOptionRender?: (d: any) => ReactNode
    filterKey?: string
    filtersType?: "select" | "input" | "dateTime"
    filtersSelectAll?: FiltersSelectAllProps //是否显示所有
    filters?: FiltersItemProps[] // 	表头的筛选菜单项c
    filterSearch?: boolean // 筛选菜单项是否可搜索
    filterSearchInputProps?: FilterSearchInputProps // input的props属性
    filterMultipleProps?: FilterSearchMultipleProps // input的props属性
    filterMultiple?: boolean // 是否多选 filtersType 为select才有效
    filterIcon?: ReactNode // 自定义 filter 图标
    filterInputProps?: YakitInputProps // input的props属性
}
/**
 *  @property {boolean} isAll 是否全选
 *  @property {string} textAll 全选文字显示
 *  @property {string} valueAll 全选value
 */
export interface FiltersSelectAllProps {
    isAll: boolean
    textAll?: string
    valueAll?: strings
}

/**
 *  @property {boolean} isAll 是否全选
 *  @property {"checkbox" | "radio"} type //默认 checkbox
 *  @property {string[]} selectedRowKeys 选中的key值，传入的renderKey
 *  @event (c: boolean, selectedRowsKey: string, selectedRows: T) => void onChangeCheckboxSingle 多选的单个选中
 *  @event (selectedRows: string[], selected: T[], checked: boolean) => void onSelectAll 全选
 */
export interface RowSelectionProps<T> {
    isAll?: boolean
    type?: "checkbox" | "radio" //默认 checkbox
    selectedRowKeys?: string[]
    onChangeCheckboxSingle?: (c: boolean, selectedRowsKey: string, selectedRows: T) => void
    onSelectAll?: (selectedRows: string[], selected: T[], checked: boolean) => void
}

export interface PaginationProps {
    page: number
    limit: number
    total: number
    onChange: (page: number, limit: number) => void
}

export interface ShowFixedShadowProps {
    isShowLeftFixedShadow: boolean
    isShowRightFixedShadow: boolean
}

export interface ScrollProps {
    scrollLeft: number
    scrollRight: number
    scrollBottom: number
}

export interface FiltersItemProps {
    value: string
    label: string
    total?: string | number
}

export interface SelectSearchProps {
    loading?: boolean
    originalList: FiltersItemProps[]
    onSelect: (f: string | string[], record?: FiltersItemProps | FiltersItemProps[]) => void
    value: string | string[]
    filterProps?: FilterProps
    onClose: () => void
}

export interface FixedWidthProps {
    leftFixedWidth: number
    rightFixedWidth: number
}
