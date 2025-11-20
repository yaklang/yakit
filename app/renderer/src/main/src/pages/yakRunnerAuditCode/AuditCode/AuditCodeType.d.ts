import {YakURLResource} from "@/pages/yakURLTree/data"
import {AuditEmiterYakUrlProps} from "../YakRunnerAuditCodeType"
import {ShowItemType} from "../BottomEditorDetails/BottomEditorDetailsType"
import { SyntaxFlowRuleFilter } from "@/pages/ruleManagement/RuleManagementType";
import {DbOperateMessage} from "../../layout/mainOperatorContent/utils"
import {ReactNode} from "react"
export interface YakURLKVPair {
    Key: string
    Value: string
}

export interface AuditCodeProps {
    setOnlyFileTree: (v: boolean) => void
    onOpenEditorDetails: (v: ShowItemType) => void
}

export interface AuditTreeProps {
    data: AuditNodeProps[]
    expandedKeys: string[]
    setExpandedKeys: (v: string[]) => void
    onLoadData: (node: AuditNodeProps) => Promise<any>
    foucsedKey: string
    setFoucsedKey: (v: string) => void
    onJump: (v: AuditNodeProps) => void
    onlyJump?: boolean
    wrapClassName?: string
    loadTreeMore: (info: AuditNodeProps) => void
}

export interface AuditNodeDetailProps {
    fileName: string
    start_line: number
    url: string
}

export interface AuditTreeNodeProps {
    info: AuditNodeProps
    expandedKeys: string[]
    onSelected: (node: AuditNodeProps, nodeDetail?: AuditNodeDetailProps) => any
    onExpanded: (expanded: boolean, node: AuditNodeProps) => void
    foucsedKey: string
    loadTreeMore: (info: AuditNodeProps) => void
    /**自定义节点显示内容 */
    customizeContent: (info: AuditNodeProps) => ReactNode
}

// Map存储列表详情
export interface AuditNodeMapProps {
    /** 父路径 */
    parent: string | null
    /** id */
    id: string
    isLeaf?: boolean

    ResourceType: string
    VerboseType: string
    name: string
    Size: number
    Extra: YakURLKVPair[]

    // 记录所请求数据的页数
    page?: number
    // 是否未加载完毕
    hasMore?: boolean
}

export interface AuditNodeProps {
    /** 父路径 */
    parent: string | null
    /** id */
    id: string
    // 层级
    depth: number
    // 可能存在的名称
    name: string
    // 底部占位
    isBottom?: boolean
    isLeaf?: boolean
    children?: FileNodeProps[]

    Extra: YakURLKVPair[]
    ResourceType: string
    VerboseType: string
    Size: number

    // 请求Query
    query?: {
        Key: string
        Value: number
    }[]

    // 前端所需校验属性
    isBug?: boolean
    // 记录所请求数据的页数
    page?: number
    // 是否未加载完毕
    hasMore?: boolean
}

export interface AuditDetailItemProps {
    /** id */
    id: string
    // 可能存在的名称
    name: string
    Extra: YakURLKVPair[]
    ResourceType: string
    VerboseType: string
    Size: number
}

export interface AuditNodeSearchItemProps {
    info: AuditDetailItemProps
    foucsedKey: string
    activeInfo?: AuditDetailItemProps
    setActiveInfo: (v?: AuditDetailItemProps) => void
    onJump: (v: AuditDetailItemProps) => void
    onContextMenu: (v: AuditDetailItemProps) => void
}

export interface AuditYakUrlProps {
    Schema: string
    Path: string
    // 正常操作查询
    Location?: string
    // 带参查询
    ProgramName?: string
    Query?: {Key: string; Value: any}[]
}

export interface AuditMainItemFormProps {}

export interface AuditModalFormProps {
    onCancel: () => void
    isExecuting: boolean
    onStartAudit: (v: DebugPluginRequest) => void
    form: FormInstance<any>
    isVerifyForm: boolean
    activeKey: string | string[] | undefined
    setActiveKey: (v: string | string[] | undefined) => void
}

export interface AuditModalFormModalProps {
    onCancel: () => void
    onSuccee: (path: string) => void
    // 刷新
    onRefresh?: () => void
    title?: string
    // 绑定容器
    warrpId?: HTMLElement | null
    // 默认值
    initForm?: {[key: string]: any}
}

export interface AfreshAuditModalProps {
    afreshName?: string
    setAfreshName: (v?: string) => void
    onSuccee: () => void
    // 绑定容器
    warrpId?: HTMLElement | null
    // 区分重新编译和全新编译
    type?: "compile" | "afresh_compile"
    // 全新编译时所需的配置项
    JSONStringConfig?: string
}

export interface SSAProjectFilter {
    IDs?: number[]
    ProjectNames?: string[]
    SearchKeyword?: string
    Languages?: string[]
}

export interface DeleteSSAProjectRequest {
    Filter?: SSAProjectFilter
    // "clear_compile_history" - 只清空编译历史（删除 IrProgram，保留 SSAProject）
    // "delete_all" 或 空字符串 - 清空编译历史和项目信息（删除 IrProgram 和 SSAProject）
    // 默认为 "delete_all"
    DeleteMode?:"clear_compile_history" | "delete_all" 
}

interface SSAProjectScanRuleConfig {
    RuleFilter: SyntaxFlowRuleFilter
}

interface SSAProjectScanConfig {
    Concurrency: number
    Memory: boolean
    IgnoreLanguage: boolean
}

interface SSAProjectCompileConfig {
    StrictMode: boolean
    PeepholeSize: number
    ExcludeFiles: string[]
    ReCompile: boolean
    Memory: boolean
    Concurrency: number
}

export interface SSAProjectResponse {
    ID: number
    CreateAt: number
    UpdateAt: number
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
    // JSON字符串配置（用于JSONSchema渲染表单的数据）
    JSONStringConfig: string
    // 漏洞个数
    RiskNumber: number
    // 编译次数
    CompileTimes: number
}

export interface UpdateSSAProjectRequest {
    Project: Partial<SSAProjectResponse>
}

export interface UpdateSSAProjectResponse {
    Project: SSAProjectResponse
    Message: DbOperateMessage
}

export interface AuditHistoryTableProps {
    pageType: "auditCode" | "projectManager"
    onClose?: () => void
    onExecuteAudit?: () => void
    refresh?: boolean
    setRefresh?: (v: boolean) => void
    warrpId?: HTMLElement | null
}

export interface ProjectManagerEditFormProps {
    record: SSAProjectResponse
    setData: React.Dispatch<React.SetStateAction<SSAProjectResponse[]>>
    onClose: () => void
    schema:RJSFSchema
}

export interface AuditHistoryListRefProps {
    onRefresh: () => void
    onDeleteAuditHistory: (v: boolean) => void
}

export interface AuditHistoryListProps {
    ref?: React.ForwardedRef<AuditHistoryListRefProps>
    setAuditType: (v: "result" | "history") => void
    onAuditRuleSubmitFun: (
        textArea?: string,
        Query?: {
            Key: string
            Value: number
        }[]
    ) => void
    onOpenEditorDetails: (v: ShowItemType) => void
    query: QuerySyntaxFlowResultRequest
    setQuery: (v: QuerySyntaxFlowResultRequest) => void
}

export interface ResultDataProps {
    description: string;
    language: string;
    path: string;
    project_id: number;
    project_name: string;
    success: boolean;
    tags: string[];
}