import {ReactNode} from "react"
import {YakRunnerView} from "../YakRunnerType"

export interface RunnerTabsProps {}

export interface RunnerTabBarProps {
    onlyID: string
    extra?: ReactNode
}

export interface RunnerTabBarItemProps {
    index: number
    info: YakRunnerView.OpenFile
}

export interface RunnerTabPaneProps {}

export interface YakRunnerWelcomePageProps {}
