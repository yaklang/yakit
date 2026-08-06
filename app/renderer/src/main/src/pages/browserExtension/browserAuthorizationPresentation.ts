export type BrowserAuthorizationMode = 'horizontal' | 'vertical'

export const BROWSER_AUTHORIZATION_ANALYSIS_FORGE = 'browser_authorization_analysis'

export const BROWSER_AUTHORIZATION_ANALYSIS_TOOLS = [
  'authorization.workspace.inspect',
  'authorization.transform.profiles',
  'authorization.logical.bind',
  'authorization.plan.propose',
  'authorization.plan.validate',
  'authorization.plan.execute',
  'authorization.review.begin',
  'authorization.evidence.inspect',
  'authorization.evidence.diff',
  'authorization.evidence.validate',
  'authorization.evidence.packet',
  'authorization.review.submit',
  'authorization.verdict.reconcile',
  'authorization.report.build',
] as const

export function browserAuthorizationAIStartPolicy() {
  return {
    ForgeName: BROWSER_AUTHORIZATION_ANALYSIS_FORGE,
    EnableSystemFileSystemOperator: false,
    EnableAISearchTool: false,
    IncludeSuggestedToolNames: [...BROWSER_AUTHORIZATION_ANALYSIS_TOOLS],
  }
}

export type BrowserAuthorizationVerdict = 'confirmed' | 'likely' | 'protected' | 'inconclusive' | 'invalid-controls'

export interface BrowserAuthorizationAnalysisCopyInput {
  mode: BrowserAuthorizationMode
  planId?: string
  executionId?: string
  requestBudget?: number
}

export interface BrowserAuthorizationAnalysisCopy {
  query: string
  showQS: string
}

function verticalPlanLabel(requestBudget?: number): string {
  if (requestBudget === 3 || requestBudget === 5) {
    return `${requestBudget} 项纵向计划`
  }
  return '三项或五项纵向计划'
}

export function browserAuthorizationVerdictLabel(
  mode: BrowserAuthorizationMode,
  verdict: BrowserAuthorizationVerdict,
): string {
  if (mode === 'vertical') {
    if (verdict === 'protected') return '低权限特权操作已阻断'
    if (verdict === 'confirmed') return '已确认低权限操作生效'
    if (verdict === 'likely') return '低权限操作可能被接受'
    if (verdict === 'invalid-controls') return '纵向控制请求无效'
    return '纵向结果不可判定'
  }

  if (verdict === 'protected') return '横向交叉访问已阻断'
  if (verdict === 'confirmed') return '已确认跨身份数据访问'
  if (verdict === 'likely') return '观察到跨身份响应吻合'
  if (verdict === 'invalid-controls') return '水平正常对照无效'
  return '水平结果不可判定'
}

export function browserAuthorizationAnalysisCopy(
  input: BrowserAuthorizationAnalysisCopyInput,
): BrowserAuthorizationAnalysisCopy {
  if (input.mode === 'vertical') {
    const planLabel = verticalPlanLabel(input.requestBudget)
    const nextStep = input.executionId
      ? `优先对已有执行 ${input.executionId} 开始盲审，随后读取 Evidence Bundle，并比较低权限探测、高权限正常响应与可用的前后状态差异；先提交不可变的独立判断，再揭示并对账确定性证据等级。除非结果过期或我明确要求，否则不要重复发送请求。`
      : input.planId
        ? `先验证计划 ${input.planId}；适合执行时通过当前 Review 策略运行固定的${planLabel}。`
        : '当前还没有计划；先解释高权限操作候选，再从既有 operation candidate ID 中选择一个交给确定性编译器；是否绑定后置状态请求决定生成三项或五项计划。'
    return {
      query: [
        `检查当前双身份纵向权限工作区，解释隔离证明、低权限控制、高权限操作模板与${planLabel}。`,
        nextStep,
        '必须先独立判断事实和策略，再读取引擎证据等级；不要把 200 状态、相似响应结构或操作被接受自行命名为垂直越权，只有独立的后置状态证据才能确认操作实际生效。',
      ].join(''),
      showQS: '分析纵向权限计划',
    }
  }

  const nextStep = input.executionId
    ? `优先对已有执行 ${input.executionId} 开始盲审，随后读取 Evidence Bundle，对 A→B 与 B-own、B→A 与 A-own 分别执行结构化响应差异；若交叉响应与目标响应完全一致而没有差异路径，则从 A-own 与 B-own 的正常对照差异中选择稳定业务路径，再交给确定性验证器。先提交不可变的独立判断，再揭示并对账确定性证据等级。必要时才读取脱敏报文。除非结果过期或我明确要求，否则不要重复发送请求。`
    : input.planId
      ? `先验证计划 ${input.planId}；适合执行时通过当前 Review 策略运行固定四项授权矩阵。`
      : '当前还没有计划；先解释资源候选，再从既有 candidate ID 中选择一个交给确定性编译器。'
  return {
    query: [
      '检查当前双身份水平授权工作区，解释隔离证明、A/B 正常基线、资源候选与固定四项矩阵。',
      nextStep,
      '必须把跨身份访问事实、两身份是否同权限、业务授权策略分开判断。账号标签不能证明权限关系；管理员访问普通用户资源可能符合预期，缺少同权限或明确策略证据时不得命名为水平越权。',
    ].join(''),
    showQS: '分析水平授权矩阵',
  }
}

export function browserAuthorizationDefaultQuery(mode: BrowserAuthorizationMode, requestBudget?: number): string {
  return mode === 'vertical'
    ? `检查当前双身份纵向权限工作区，验证${verticalPlanLabel(requestBudget)}；对已有执行先盲审并提交独立判断，再对账确定性证据等级。`
    : '检查当前双身份水平授权工作区，验证确定性四项矩阵；对已有执行先盲审并提交独立判断，再对账证据等级，并将访问事实与授权策略分开。'
}
