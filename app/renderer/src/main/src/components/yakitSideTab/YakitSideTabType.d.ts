import {ReactNode} from "react"
export interface YakitSideTabProps extends Pick<YakitTabsItemProps, "onTabPaneRender"> {
    yakitTabs: YakitTabsProps[]
    setYakitTabs?: (v: YakitTabsProps[]) => void

    /**TODO 点击展示的tab状态 缓存的key */
    cacheKey?: string
    activeKey?: string
    onActiveKey: (s: string) => void

    setShow?: (s: boolean) => void
    /** type 为vertical-right ，show不生效*/
    show?: boolean
    /**
     * vertical:tab在左边
     * vertical-right:tab在右边
     * horizontal:单击是切换tabContent，tab在上方
     */
    type?: "vertical" | "horizontal" | "vertical-right"
    children?: ReactNode

    className?: string
}

export interface YakitTabsProps {
    icon?: ReactNode
    label: ReactNode
    value: string
    show?: boolean
}

export interface YakitTabsItemProps {
    item: YakitTabsProps
    className?: string
    onChange: (v: YakitTabsProps) => void
    onTabPaneRender?: (item: YakitTabsProps, node: ReactNode[]) => ReactNode
    rotate?: "left" | "right"
}
