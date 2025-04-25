import {HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

export interface HorizontalScrollCardProps {
    /**卡片的标题 */
    title?: string
    /**卡片数据源 */
    data: HoldGRPCStreamProps.InfoCards[]
    /**卡片标题数据横向排列 */
    compact?: boolean
}

export interface StatusCardListProps {
    /**具体信息 */
    info: HoldGRPCStreamProps.InfoCard[]
    tag: string
}
/**插件返回的 CacheStatusCardProps */
export interface StatusCardProps {
    /**描述信息 */
    Id: string
    /**具体数值信息 */
    Data: string
    /**时间 */
    Timestamp: number
    Tags?: string
}

/**info只有一条数据时,展示的组件对应的props */
export interface HorizontalScrollCardItemInfoSingleProps {
    item: StatusCardProps
    tag: string
    compact: boolean
}
/**滚动信息记录 */
export interface HorizontalScrollCardScrollProps {
    /**滚动条距离左边的距离 */
    scrollLeft: number
    /**滚动条距离右边的距离 */
    scrollRight: number
}
