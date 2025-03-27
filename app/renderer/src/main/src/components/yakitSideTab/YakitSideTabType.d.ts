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
}

export interface YakitTabsProps {
    icon?: ReactNode
    label: ReactNode
    value: string
    show?: boolean
}
