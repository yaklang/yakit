import {Paging} from "@/utils/yakQueryHTTPFlow"

export interface RuleManagementProps {}

export interface LocalRuleGroupListProps {
    onGroupChange: (groups: string[]) => void
}

export interface RuleImportExportModalProps {
    /** 是否被dom节点包含 */
    getContainer?: HTMLElement
    width?: number
    visible: boolean
    onCallback: (result: boolean) => void
}

export interface EditRuleDrawerProps {
    /** 是否被dom节点包含 */
    getContainer?: HTMLElement
    info?: SyntaxFlowRule
    visible: boolean
    onCallback: (result: boolean, info?: SyntaxFlowRule) => void
}

export interface UpdateRuleToGroupProps {
    rules: SyntaxFlowRule[]
}

/** ---------- 规则组相关接口定义 Start ---------- */
// #region
export interface SyntaxFlowRuleGroupFilter {
    GroupNames?: string[]
    KeyWord?: string
    IsBuildIn?: string
}
export interface QuerySyntaxFlowRuleGroupRequest {
    Filter: SyntaxFlowRuleGroupFilter
}

export interface SyntaxFlowGroup {
    GroupName: string
    Count: number
    IsBuildIn: boolean
}
export interface QuerySyntaxFlowRuleGroupResponse {
    Group: SyntaxFlowGroup[]
}

export interface CreateSyntaxFlowGroupRequest {
    GroupName: string
}
export interface UpdateSyntaxFlowRuleGroupRequest {
    OldGroupName: string
    NewGroupName: string
}

export interface DeleteSyntaxFlowRuleGroupRequest {
    Filter: SyntaxFlowRuleGroupFilter
}

export interface UpdateSyntaxFlowRuleAndGroupRequest {
    Filter?: SyntaxFlowRuleFilter
    AddGroups: string[]
    RemoveGroups: string[]
    All?: boolean // 废弃
}

export interface QuerySyntaxFlowSameGroupRequest {
    Filter: SyntaxFlowRuleFilter
}
export interface QuerySyntaxFlowSameGroupResponse {
    Group: SyntaxFlowGroup[]
}
// #endregion
/** ---------- 规则组相关接口定义 End ---------- */

/** ---------- 规则相关接口定义 Start ---------- */
// #region
export interface SyntaxFlowRuleFilter {
    RuleNames?: string[]
    Language?: string[]
    GroupNames?: string[]
    Severity?: string[]
    Purpose?: string[]
    Tag?: string[]
    Keyword?: string
    // 是否包含作为库的规则  这些规则只提供相关数据并被其他规则引用 默认不包含
    includeLibraryRule?: boolean

    FromId?: number // 废弃
    UntilId?: number // 废弃

    AfterId?: number
    BeforeId?: number
}
export interface QuerySyntaxFlowRuleRequest {
    Filter?: SyntaxFlowRuleFilter
    Pagination: Paging
}

export interface SyntaxFlowRule {
    Id: number

    RuleName: string
    Content: string

    Language: string
    Type: string
    Severity: string
    Purpose: string
    IsBuildInRule: boolean

    Title: string
    TitleZh: string
    Description: string
    Verified: boolean
    AllowIncluded: boolean
    IncludedName: string
    Tag: string
    AlertDesc: string

    Hash: string

    GroupName: string[]
}
export interface QuerySyntaxFlowRuleResponse {
    Pagination: Paging
    Rule: SyntaxFlowRule[]
    Total: number
}

export interface SyntaxFlowRuleInput {
    RuleName: string
    Content: string
    Language: string
    Tags?: string[] // 无效，不知道后端是否有用
    GroupNames: string[]
    Description: string
}
export interface CreateSyntaxFlowRuleRequest {
    SyntaxFlowInput: SyntaxFlowRuleInput
}
export interface UpdateSyntaxFlowRuleRequest {
    SyntaxFlowInput: SyntaxFlowRuleInput
}

export interface DeleteSyntaxFlowRuleRequest {
    Filter: SyntaxFlowRuleFilter
}
// #endregion
/** ---------- 规则相关接口定义 End ---------- */
