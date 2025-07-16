import {ReactNode} from "react"
export interface YakitSideTabProps {
    yakitTabs: YakitTabsProps[]
    setYakitTabs?: (v: YakitTabsProps[]) => void

    /**TODO 点击展示的tab状态 缓存的key */
    cacheKey?: string
    activeKey: string
    onActiveKey: (s: string) => void

    setShow?: (s: boolean) => void
    show?: boolean
    /**
     * vertical:单击是隐藏/显示对应的内容
     * horizontal:单击是切换tabContent
     */
    type?: "vertical" | "horizontal"
    children?: ReactNode
    onTabPaneRender?: (item: YakitTabsProps) => ReactNode
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
    onTabPaneRender?: (item: YakitTabsProps) => ReactNode
}
