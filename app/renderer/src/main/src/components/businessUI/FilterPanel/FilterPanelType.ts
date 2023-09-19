export interface FilterPanelGroupItem {
    /** 单项过滤条件key */
    groupKey: string
    /** 单项过滤条件展示名 */
    groupName: string
    /** 单项过滤条件-过滤内容列表 */
    data: {
        /** 选项展示内容 */
        label: string
        /** 选项值 */
        value: string
        /** 选项统计总数 */
        count: number
    }[]
}

export interface FilterPanelProps {
    /** 外框架修饰类 */
    wrapperClassName?: string
    /** 列表架修饰类 */
    listClassName?: string
    /** 加载状态 */
    loading?: boolean
    /** 是否可见 */
    visible: boolean
    /** 设置是否可见 */
    setVisible: (show: boolean) => any
    /** 选中数据 */
    selecteds: Record<string, string[]>
    /** 选中数据回调 */
    onSelect: (value: Record<string, string[] | string>) => any
    /** 数据展示列表 */
    groupList: FilterPanelGroupItem[]
    /** 数据为空时的提示信息 */
    noDataHint?: string
}
