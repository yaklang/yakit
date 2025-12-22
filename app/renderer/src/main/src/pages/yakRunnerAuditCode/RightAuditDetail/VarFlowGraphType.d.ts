/**
 * VarFlowGraph 类型定义
 */

/**
 * 变量流图 - 主结构
 */
export interface VarFlowGraph {
    nodes: VarFlowGraphNode[]
    edges: VarFlowGraphEdge[]
    steps: VarFlowGraphStep[]
}

/**
 * 节点 - 表示变量流图中的一个节点
 */
export interface VarFlowGraphNode {
    id: number // 节点唯一标识符
    var_name: string // 变量名称
    value_ids?: string[] // 可选，该节点关联的值的 ID 列表
    value_count?: number // 值的数量
    node_type?: "entry" | "middle" | "result" | "empty" // 节点类型
    is_alert?: boolean // 是否为漏洞告警变量
    severity?: "info" | "low" | "warning" | "high" | "critical" | "" // 风险等级
}

/**
 * 边 - 表示变量之间的流动关系
 */
export interface VarFlowGraphEdge {
    id: number // 边唯一标识符
    from: number // 起始节点 ID，0 表示程序入口
    to: number // 目标节点 ID
    step_ids: number[] // 在这条边上执行的分析步骤 ID
    edge_type?: "search" | "filter" | "dataflow" | "get" // 边的类型
}

/**
 * 分析步骤类型
 */
export type StepType = "Search" | "ConditionFilter" | "DataFlow" | "Get" | "NativeCall" | "Transform"

/**
 * 分析步骤 - 包含完整的步骤详情（无需额外 API 请求）
 */
export interface VarFlowGraphStep {
    id: number // 步骤唯一标识符
    type: StepType // 步骤类型
    opcode_index?: number // 操作码索引
    desc: string // 英文描述
    desc_zh: string // 中文描述
    
    // 根据 type 不同，包含不同的模式数据
    search_mode?: SearchMode // type="Search" 时
    dataflow_mode?: DataFlowMode // type="DataFlow" 时（注意：字段名为 dataflow_mode）
    nativecall_mode?: NativeCallMode // type="NativeCall" 时
    
    // 证据树（ConditionFilter 类型时包含）
    evidence_tree?: EvidenceNode
}

/**
 * 搜索模式
 */
export interface SearchMode {
    match_mode: string // 匹配模式: name/key/name+key
    glob_pattern: string // Glob 模式
    regexp: string // 正则表达式
}

/**
 * 数据流模式
 */
export interface DataFlowMode {
    include: string[] // 包含规则
    exclude: string[] // 排除规则
    search_until: string[] // 终止条件
    top: boolean // 是否向上追溯（TopDef）
    bottom: boolean // 是否向下追踪（BottomUse）
    predecessors: boolean // 是否追溯前驱
    include_depth: number // 包含深度
    exclude_depth: number // 排除深度
    the_until_depth: number // 终止深度
}

/**
 * NativeCall 模式
 */
export interface NativeCallMode {
    name: string // NativeCall 名称（如 "getFunc", "getCall", "eval" 等）
    desc: string // 英文功能描述
    desc_zh: string // 中文功能描述
    params: NativeCallParam[] // 参数列表
}

/**
 * NativeCall 参数
 */
export interface NativeCallParam {
    key: string // 参数名
    value: string // 参数值
}

/**
 * 证据节点类型
 */
export type EvidenceNodeType = "LogicGate" | "FilterCondition" | "StringCondition" | "OpcodeCondition"

/**
 * 证据节点 - 表示过滤条件的证据树（字段更新）
 */
export interface EvidenceNode {
    type: EvidenceNodeType // 节点类型
    logic_op?: "AND" | "OR" | "NOT" // 逻辑操作（逻辑门类型）

    // 描述字段
    description?: string // 条件描述（旧字段，兼容）
    desc?: string // 英文描述
    desc_zh?: string // 中文描述（优先使用）

    // 比较证据（字段名更新）
    compare_evidence?: CompareEvidence // 旧字段名（兼容）
    compare?: CompareEvidence // 新字段名

    results?: FilterResult[] // 过滤结果
    children?: EvidenceNode[] // 子节点（逻辑门类型）
}

/**
 * 比较证据
 */
export interface CompareEvidence {
    operator: string // 比较操作符
    values: string[] // 比较值列表
    mode: string // 匹配模式: have/exact/regexp/glob
    glob: string // Glob 模式
    regexp: string // 正则表达式
}

/**
 * 过滤条件
 */
export interface FilterCondition {
    type: string // 条件类型
    value: string // 条件值
}

/**
 * 过滤结果（增加字段）
 */
export interface FilterResult {
    value_id: string // 值的 ID（用于进一步查询）
    value_str?: string // 值的字符串表示（直接显示）
    interm_value_id?: string // 中间值 ID（数据流分析产生的路径）
    interm_id?: string // 中间值 ID（别名）
    interm_str?: string // 中间值的字符串表示
    passed: boolean // 是否通过过滤
}

/**
 * 变量值资源（API 返回的值）
 */
export interface ValueResource {
    index: number
    value_id: string
    value_str?: string
    code_range?: string
    source?: string
}

/**
 * 边步骤资源（API 返回的步骤）
 */
export interface EdgeStepResource {
    step_id: number
    step_type: StepType
    step_description: string
    step_detail: string
    has_evidence_tree?: boolean
}

/**
 * 步骤详情资源（API 返回的步骤详情）
 */
export interface StepDetailResource {
    step_id: number
    step_type: StepType
    step_description: string
    step_detail: VarFlowGraphStep
    evidence_tree?: EvidenceNode
}
