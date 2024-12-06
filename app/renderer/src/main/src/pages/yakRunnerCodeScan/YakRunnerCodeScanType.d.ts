import {GroupCount} from "@/pages/invoker/schema"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"
import {ExecResult} from "@/pages/invoker/schema"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {CodeScanPageInfoProps} from "@/store/pageInfo"
import {SyntaxFlowGroup, SyntaxFlowRule, SyntaxFlowRuleFilter} from "../ruleManagement/RuleManagementType"

export interface YakRunnerCodeScanProps {
    pageId: string
    CodeScanPageInfoProps?: CodeScanPageInfoProps
}

export interface CodeScanGroupByKeyWordProps {
    inViewport: boolean
    /**选择的插件组列表 按关键词搜索的 */
    selectGroupListByKeyWord?: string[]
    setSelectGroupListByKeyWord?: (s: string[]) => void
}

export interface CodeScanGroupByKeyWordItemProps {
    item: SyntaxFlowGroup
    selected: boolean
    onSelect: (g: SyntaxFlowGroup) => void
}

export interface CodeScanExecuteContentProps {
    hidden: boolean
    setHidden: (v: boolean) => void
    onClearAll: () => void
    selectGroupList: string[]
    pageInfo: CodeScanPageInfoProps
}

export interface CodeScanByGroupProps {
    hidden: boolean
    setTotal: (v: number) => void
    selectGroupList: string[]
}

export interface CodeScanExecuteContentRefProps {
    onStopExecute: () => void
    onStartExecute: () => void
    onPause: () => void
    onContinue: () => void
    onSetProject: (v: string) => void
}

export interface CodeScaMainExecuteContentProps {
    ref?: React.ForwardedRef<CodeScanExecuteContentRefProps>
    isExpand: boolean
    setIsExpand: (v: boolean) => void
    setHidden: (v: boolean) => void
    executeStatus: SyntaxFlowScanExecuteState
    setExecuteStatus: (value: SyntaxFlowScanExecuteState) => void
    selectGroupList: string[]
    /**进度条信息 */
    setProgressList: (s: StreamResult.Progress[]) => void
    // 项目名称列表
    auditCodeList: {label: string; value: string}[]
    pageInfo: CodeScanPageInfoProps
}

export interface FlowRuleDetailsListItemProps {
    data: SyntaxFlowRule
}

/** 根据状态显示过度动画 */
export type SyntaxFlowScanExecuteState = "default" | "process" | "finished" | "error" | "paused"

// -------------------------以下为grpc----------

export type SyntaxFlowScanModeType = "start" | "pause" | "resume" | "status"

export interface SyntaxFlowScanRequest {
    ControlMode: SyntaxFlowScanModeType
    Filter?: SyntaxFlowRuleFilter
    ProgramName: string[]
}

export type SyntaxFlowScanStatus = "executing" | "done" | "paused" | "error"

export interface SyntaxFlowScanResponse {
    TaskID: string
    Status: SyntaxFlowScanStatus
    CurrentRuleName: string
    ExecResult: ExecResult
}

export interface SyntaxFlowResultFilter {
    TaskIDs: string[]
    ResultIDs: string[]
    RuleNames: string[]
    ProgramNames: string[]
    Keyword: string
    OnlyRisk: boolean
    AfterID?: number
    BeforeID?: number
    Severity?: string[]
}

export interface QuerySyntaxFlowResultRequest {
    Pagination: Paging
    Filter: SyntaxFlowResultFilter
}

export interface SyntaxFlowResult {
    ResultID: number
    TaskID: string
    RuleName: string
    Title: string
    TitleZh: string
    Description: string
    Severity: string
    Purpose: string
    ProgramName: string
    Language: string
    RiskCount: number
    RuleContent: string
}

export interface QuerySyntaxFlowResultResponse {
    Pagination: Paging
    DbMessage: DbOperateMessage
    Results: SyntaxFlowResult[]
    Total: number
}
