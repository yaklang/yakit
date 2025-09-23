import {Paging} from "@/utils/yakQueryHTTPFlow"
import {DbOperateMessage} from "@/pages/layout/mainOperatorContent/utils"
import {ExecResult, YakScript, GroupCount} from "@/pages/invoker/schema"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {CodeScanPageInfoProps} from "@/store/pageInfo"
import {
    SyntaxFlowGroup,
    SyntaxFlowRule,
    SyntaxFlowRuleFilter,
    SyntaxFlowRuleInput
} from "../ruleManagement/RuleManagementType"
import { CodeScanExtraParam } from "./CodeScanExtraParamsDrawer/CodeScanExtraParamsDrawer";

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
    pageId: string
    onSetSelectGroupListByKeyWord: (v: string[]) => void
    setPageInfo: (v: CodeScanPageInfoProps) => void
}

export interface CodeScanByGroupProps {
    hidden: boolean
    setTotal: (v: number) => void
    selectGroupList: string[]
    filterLibRuleKind: "" | "noLib"
}

export interface CodeScanExecuteContentRefProps {
    onStopExecute: () => void
    onStartExecute: () => void
    onPause: () => void
    onContinue: () => void
    onSetProject: (v: string) => void
    onStartAuditExecute: () => void
    onStopAuditExecute: () => void
    onCreateReport: () => void
}

export interface CodeScaMainExecuteContentProps {
    ref?: React.ForwardedRef<CodeScanExecuteContentRefProps>
    isExpand: boolean
    setIsExpand: (v: boolean) => void
    setHidden: (v: boolean) => void
    executeStatus: SyntaxFlowScanExecuteState
    setExecuteStatus: (value: SyntaxFlowScanExecuteState) => void
    selectGroupList: string[]
    filterLibRuleKind: "" | "noLib"
    /**进度条信息 */
    setProgressShow: (s?: {type: "new" | "old"; progress: number; name?: string}) => void
    // 项目名称列表
    auditCodeList: {label: string; value: string; language: string}[]
    getAduitList: () => void
    pageInfo: CodeScanPageInfoProps
    executeType: "new" | "old"
    isAuditExecuting: boolean
    setAuditsExecuting: (v: boolean) => void
    setExecuteType: (v: "new" | "old") => void
    onSetSelectGroupListByKeyWord: (v: string[]) => void
    pageId: string
    pauseLoading: boolean
    setPauseLoading: (v: boolean) => void
    stopLoading: boolean
    setStopLoading: (v: boolean) => void
    continueLoading: boolean
    setContinueLoading: (v: boolean) => void
    setPageInfo: (v: CodeScanPageInfoProps) => void
    setExtraParamsVisible: (v: boolean) => void
    extraParamsValue: CodeScanExtraParam
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
    ProgramName?: string[]
    ResumeTaskId?: string

    /** 规则源码调试使用参数字段 */
    RuleInput?: SyntaxFlowRuleInput
    /** 并发，默认5 */
    Concurrency?: number
    Memory?: boolean
}

export type SyntaxFlowScanStatus = "executing" | "done" | "paused" | "error"

export interface SyntaxFlowScanResponse {
    TaskID: string
    Status: SyntaxFlowScanStatus
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
    Kind?: string[]
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
    Kind: "query" | "debug" | "scan"
}

export interface QuerySyntaxFlowResultResponse {
    Pagination: Paging
    DbMessage: DbOperateMessage
    Results: SyntaxFlowResult[]
    Total: number
}

export interface DeleteSyntaxFlowResultResponse {
    Message: DbOperateMessage
}

export interface DeleteSyntaxFlowResultRequest {
    DeleteContainRisk?: boolean
    DeleteAll?: boolean
    Filter?: SyntaxFlowResultFilter
}

export interface CodeScanExecuteExtraParamsDrawerProps {
    groupParams: YakExtraParamProps[]
    visible: boolean
    setVisible: (v: boolean) => void
    extraParamsValue: any
    setExtraParamsValue: (v: any) => void
}

export interface CodeScanAuditExecuteRefProps {
    onCancelAudit: () => void
    onStartAuditExecute: () => void
}

export interface CodeScanAuditExecuteFormProps {
    ref?: React.ForwardedRef<CodeScanAuditExecuteRefProps>
    selectGroupList: string[]
    plugin?: YakScript
    onStartExecute: (v: {project: string[]}, is?: boolean) => void
    /**进度条信息 */
    setProgressShow: (s?: {type: "new" | "old"; progress: number; name?: string}) => void
    pushNewLogs: (log: StreamResult.Message[]) => void
    isAuditExecuting: boolean
    setAuditsExecuting: (v: boolean) => void
    setExecuteType: (type: "new" | "old") => void
    setIsExpand: (v: boolean) => void
    setExecuteStatus: (value: SyntaxFlowScanExecuteState) => void
    resetStreamInfo: () => void
    setAuditError: (v: boolean) => void
    openExtraPropsDrawer: () => void
}

interface ErrorProps {
    kind: "" | "connectFailException" | "fileTypeException" | "fileNotFoundException" | "languageNeedSelectException"
    msg: string
}

export interface VerifyStartProps {
    error: ErrorProps
    program_name: string
}
