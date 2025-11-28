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
import {CodeScanExtraParam} from "./CodeScanExtraParamsDrawer/CodeScanExtraParamsDrawer"

export interface YakRunnerCodeScanProps {
    pageId: string
    CodeScanPageInfoProps?: CodeScanPageInfoProps
}

export interface CodeScanRuleByKeyWordProps {
    inViewport: boolean
    filterLibRuleKind: "" | "noLib"
    setFilterLibRuleKind: (v: "" | "noLib") => void
    pageInfo: CodeScanPageInfoProps
    setPageInfo: (v: CodeScanPageInfoProps) => void
    handleTabClick: (tab: CodeScanTabsItem) => void
}

export interface CodeScanRuleByGroupProps {
    inViewport: boolean
    pageInfo: CodeScanPageInfoProps
    setPageInfo: (v: CodeScanPageInfoProps) => void
}

export interface CodeScanGroupByKeyWordItemProps {
    item: SyntaxFlowGroup
    selected: boolean
    onSelect: (g: SyntaxFlowGroup) => void
}

export interface CodeScanExecuteContentProps {
    hidden: boolean
    setHidden: (v: boolean) => void
    pageInfo: CodeScanPageInfoProps
    pageId: string
    setPageInfo: (v: CodeScanPageInfoProps) => void
    filterLibRuleKind: "" | "noLib"
}

export interface CodeScanByGroupProps {
    hidden: boolean
    response: QuerySyntaxFlowRuleResponse
    setResponse: (v: QuerySyntaxFlowRuleResponse) => void
    filterLibRuleKind: "" | "noLib"
    selectedRules?: SyntaxFlowRule[]
    setSelectedRules?: (v: SyntaxFlowRule[]) => void
    allCheck: boolean
    setAllCheck: (v: boolean) => void
    selectGroup: string[]
    keywords: string
    isRefresh: boolean
}

export interface CodeScanByExecuteProps {
    data: SyntaxFlowScanActiveTaskShow[]
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
    filterLibRuleKind: "" | "noLib"
    /**进度条信息 */
    setProgressShow: (s?: {type: "new" | "old"; progress: number; name?: string}) => void
    // 项目名称列表
    auditCodeList: {label: string; value: number; Language: string; JSONStringConfig: string}[]
    getAduitList: () => void
    pageInfo: CodeScanPageInfoProps
    executeType: "new" | "old"
    isAuditExecuting: boolean
    setAuditsExecuting: (v: boolean) => void
    setExecuteType: (v: "new" | "old") => void
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
    setActiveTask: (v: SyntaxFlowScanActiveTask[]) => void
    CodeScanByExecuteLastDataRef: React.MutableRefObject<SyntaxFlowScanActiveTaskShow[] | null>
    selectProjectId: number[]
    setSelectProjectId: (v: number[]) => void
}

export interface FlowRuleDetailsListItemProps {
    data: SyntaxFlowRule
    check: boolean
    onCheck: (checked: boolean, rule: SyntaxFlowRule) => void
}

export interface SyntaxFlowScanActiveTaskItemProps {
    data: SyntaxFlowScanActiveTaskShow
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
    // 根据项目扫描
    SSAProjectId?: number
}

export type SyntaxFlowScanStatus = "executing" | "done" | "paused" | "error"

export interface SyntaxFlowScanActiveTask {
    // index
    RuleName: string
    ProgramName: string
    // progress
    Progress: number
    // update
    RunningTime: number
    Info: string
}

export interface SyntaxFlowScanActiveTaskShow extends SyntaxFlowScanActiveTask {
    id: string
}

export interface SyntaxFlowScanResponse {
    TaskID: string
    Status: SyntaxFlowScanStatus
    ExecResult: ExecResult
    ActiveTask: SyntaxFlowScanActiveTask[]
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
    plugin?: YakScript
    onStartExecute: (v: {project: number}, is?: boolean) => void
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
    pageInfo: CodeScanPageInfoProps
}

interface ErrorProps {
    kind: "" | "connectFailException" | "fileTypeException" | "fileNotFoundException" | "languageNeedSelectException"
    msg: string
}

export interface VerifyStartProps {
    error: ErrorProps
    program_name: string
    compile_immediately: boolean
    project_exists: boolean
    BaseInfo: {
        program_names: string[]
        project_id: number
        project_name: string
        project_description: string
        language: string
        tags: string[] | null
    }
}

type CodeScanTabKeys = "keyword" | "group"
export interface CodeScanTabsItem {
    key: CodeScanTabKeys
    label: ReactElement | string
    contShow: boolean
}

export interface SSAProject {
    ID: number
    CreatedAt: number
    UpdatedAt: number
    // 项目基础信息
    ProjectName: string
    Language: string
    Description: string
    Tags: string[]
    // 源代码来源
    CodeSourceConfig: string
    // 编译配置选项
    CompileConfig: SSAProjectCompileConfig
    // 扫描配置选项
    ScanConfig: SSAProjectScanConfig
    // 规则策略配置
    RuleConfig: SSAProjectScanRuleConfig

    JSONStringConfig: string
    // 漏洞个数
    RiskNumber: number
    // 编译次数
    CompileTimes: number
    // 本地路径或者远程代码仓库路径
    URL: string
}

export interface CreateSSAProjectResponse {
    Project: SSAProject
    Message: DbOperateMessage
}
