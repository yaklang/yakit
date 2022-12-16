/**
 * @description:表格的props描述，包裹虚拟表格的父元素需要设置高度
 * @property {string | ReactNode} title: 表格顶部的title,左边
 * @property {ReactNode} extra: 表格顶部的title，右边
 * @property {ReactNode} renderTitle: 自定义表格顶部的title
 * @property {number} titleHeight: 自定义表格顶部的高度,使用renderTitle,需要传入对应的height,否则虚拟列表滚动会不正确
 * @property {T[]} data:数组 可以传cellClassName用来控制单元格样式，不要传height
 * @property {string} renderKey:每行的key值，不可重复
 * @property {ColumnsTypeProps[]} columns:每列的参数
 * @property {RowSelectionProps<T>} rowSelection:多选/单选配置，目前只支持多选
 * @property {PaginationProps} pagination:分页配置
 * @property {boolean} loading：是否加载中
 * @property {boolean} isShowTotal：内置的total是否显示；true显示，false不显示
 * @event (record: T) => void onSetCurrentRow:设置选中
 */

export interface TableVirtualDragProps<T> {
    title?: string | ReactNode
    renderTitle?: ReactNode
    titleHeight?: number
    extra?: ReactNode
    data: T[]
    renderKey: string
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
    pagination?: PaginationProps
    loading?: boolean
    isShowTotal?: boolean
    onSetCurrentRow?: (record: T) => void
}
