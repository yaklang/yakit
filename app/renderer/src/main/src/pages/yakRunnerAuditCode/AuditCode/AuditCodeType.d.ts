import {YakURLResource} from "@/pages/yakURLTree/data"
import {AuditEmiterYakUrlProps} from "../YakRunnerAuditCodeType"
import {ShowItemType} from "../BottomEditorDetails/BottomEditorDetailsType"
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
}

export interface AuditNodeDetailProps {
    fileName: string
    start_line: number
    url: string
}

export interface AuditTreeNodeProps {
    info: AuditNodeProps
    expandedKeys: string[]
    onSelected: (selected: boolean, node: AuditNodeProps, nodeDetail?: AuditNodeDetailProps) => any
    onExpanded: (expanded: boolean, node: AuditNodeProps) => void
    foucsedKey: string
    setFoucsedKey: (v: string) => void
    onJump: (info: AuditNodeProps) => void
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
}

export interface AuditYakUrlProps {
    Schema: string
    Path: string
    // 正常操作查询
    Location?: string
    // 带参查询
    ProgramName?: string
    Query?: {Key: string; Value: number}[]
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
    title?: string
    // 绑定容器
    warrpId?: HTMLElement | null
}

export interface AfreshAuditModalProps {
    afreshName?: string
    setAfreshName: (v?: string) => void
    onSuccee: () => void
    // 绑定容器
    warrpId?: HTMLElement | null
}

export interface QuerySSAProgramsProps {
    ProgramNames?: string[]
    Languages?: string[]
    Ids?: number[]
    BeforeUpdatedAt?: number
    AfterUpdatedAt?: number
    Keyword?: string
    AfterID?: number
    BeforeID?: number
}

export interface SSAProgramResponse {
    CreateAt: number
    UpdateAt: number
    Name: string
    Description: string
    Dbpath: string
    Language: string
    EngineVersion: string
    Recompile: boolean
    HighRiskNumber: number
    CriticalRiskNumber: number
    WarnRiskNumber: number
    LowRiskNumber: number
    Id: number
}

export interface AuditHistoryTableProps {
    pageType: "aucitCode" | "projectManager"
    onClose?: () => void
    onExecuteAudit?: () => void
    refresh?: boolean
    setRefresh?: (v: boolean) => void
    warrpId?: HTMLElement | null
}

export interface ProjectManagerEditFormProps {
    record: SSAProgramResponse
    setData: React.Dispatch<React.SetStateAction<SSAProgramResponse[]>>
    onClose: () => void
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
