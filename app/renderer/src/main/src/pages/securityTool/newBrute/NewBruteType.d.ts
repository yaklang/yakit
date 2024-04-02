import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {StartBruteParams} from "@/pages/brute/BrutePage"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {BrutePageInfoProps} from "@/store/pageInfo"
import React from "react"

export interface NewBruteProps {
    id: string
}

export interface BruteTypeTreeListProps {
    hidden: boolean
    bruteType: React.Key[]
    setBruteType: (v: React.Key[]) => void
}

export interface BruteExecuteProps {
    bruteType: React.Key[]
    setBruteType: (v: React.Key[]) => void
    hidden: boolean
    setHidden: (b: boolean) => void
    pageId: string
}

export interface BruteExecuteContentRefProps {
    onStopExecute: () => void
    onStartExecute: () => void
}

export interface BruteExecuteContentProps {
    ref?: React.ForwardedRef<BruteExecuteContentRefProps>
    bruteType: React.Key[]
    isExpand: boolean
    setIsExpand: (b: boolean) => void
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (b: ExpandAndRetractExcessiveState) => void
    selectNum: number
    setProgressList: (s: StreamResults.Progress[]) => void
    pageInfo: BrutePageInfoProps
}

export interface BruteExecuteExtraFormValue extends StartBruteParams {
    /**前端展示使用 */
    replaceDefaultPasswordDict?: boolean
    /**前端展示使用 */
    replaceDefaultUsernameDict?: boolean
    /**前端展示使用 */
    usernames?: string
    /**前端展示使用 */
    passwords?: string
}
