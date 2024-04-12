import { ReactNode } from "react"

export interface YakitTimeLineListProps<T> {
    ref?: React.ForwardedRef<YakitTimeLineListRefProps>
    loading?: boolean
    data: T[]
    /** 渲染节点的函数 */
    renderItem: (info: T, index: number) => ReactNode
    /** 是否还有可加载的数据 */
    hasMore?: boolean
    /** 加载更多 */
    loadMore?: () => any
    /** time-line的单项高度默认值为44px */
    DefaultItemHeight?: number
}
export interface YakitTimeLineListRefProps {
    /** 全局数据重置清空 */
    onClear: () => any
    /** 跳转到索引的位置(已实现，未验证功能是否正常) */
    onScrollToIndex: (index: number) => any
}

/** 不定高虚拟列表的信息 */
export interface YakitVirtualListProps {
    /** 容器高度 */
    viewHeight: number
    /** 列表高度 */
    listHeight: number
    /** 起始索引 */
    startIndex: number
    /** 最大容纳量 */
    maxCount: number
    /** 缓存已初始化的数据长度 */
    preLen: number
}
/** 不定高虚拟列表的位置计算 */
export interface YakitVirtualListPositionProps {
    // 当前pos对应的元素索引
    key: number
    /** 元素顶部所处位置 */
    top: number
    /** 元素底部所处位置 */
    bottom: number
    /** 元素高度 */
    height: number
    /**
     * 自身对比高度差：判断是否需要更新
     * 这里的高度差是预设高度和实际渲染高度的差值
     */
    dHeight: number
}
