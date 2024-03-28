import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import { StartBruteParams } from "@/pages/brute/BrutePage"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"

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
}

export interface BruteExecuteContentRefProps {
    onStopExecute: () => void
    onStartExecute: () => void
}

export interface BruteExecuteContentProps {
    ref?: React.ForwardedRef<BruteExecuteContentRefProps>
    isExpand: boolean
    setIsExpand: (b: boolean) => void
    executeStatus: ExpandAndRetractExcessiveState
    setExecuteStatus: (b: ExpandAndRetractExcessiveState) => void
    selectNum: number
    setProgressList: (s: StreamResults.Progress[]) => void
}

export interface BruteExecuteExtraFormValue extends StartBruteParams {

}