import {Selection} from "../RunnerTabs/RunnerTabsType"
import {GraphInfoProps} from "../RightAuditDetail/RightAuditDetail.tsx"
import {AuditEmiterYakUrlProps} from "../YakRunnerAuditCodeType"

export interface BottomEditorDetailsProps {
    showItem?: ShowItemType
    setShowItem: (v: ShowItemType) => void
    isShowEditorDetails: boolean
    setEditorDetails: (v: boolean) => void
    auditRightParams?: AuditEmiterYakUrlProps
}

export type ShowItemType = "ruleEditor" | "holeDetail" | "holeDispose" | "analysisSteps"

export interface JumpToAuditEditorProps {
    isSelect?: boolean
    selections: Selection
    path: string
}

export interface OutputInfoProps {
    outputCahceRef: React.MutableRefObject<string>
    xtermRef: React.MutableRefObject<any>
}
