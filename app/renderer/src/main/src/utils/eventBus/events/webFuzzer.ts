export type WebFuzzerEventProps = {
  onRefWebFuzzer?: string
  onSelectFuzzerHotPatchTemplate?: string
  /**设置fuzzer tab高级配置显示/隐藏对应得tab样式 */
  onGetFuzzerAdvancedConfigShow: string
  onImportYamlPopEditorContent: string
  onImportYamlEditorChange: string
  onFuzzerSequenceImportUpdateMenu: string
  onGetExportFuzzer: string
  onGetExportFuzzerCallBack: string
  onOpenMatchingAndExtractionCard: string
  onOpenFuzzerModal: string
  onRunChatcsAIByFuzzer: string
  /**设置tab【配置】/【规则】中得高级配置显示/隐藏 */
  onSetAdvancedConfigShow: string
  /** 发送到HTTPFuzzerPage 切换【配置】/【规则】tab 得选中type */
  onSwitchTypeWebFuzzerPage: string
  /** 当前是否是fuzzer页面不是序列页面 */
  onCurrentFuzzerPage: boolean
  /**
   * 1.发送到WebFuzzerPage
   * 2.序列包裹层点击tab切换到【配置】/【规则】/【热加载】/ 【AI】或 代码层面触发打卡
   * */
  sequenceOrCodeSendSwitchTypeToFuzzer: string
  /**发送到MainOperatorContent层中切换【序列】/(【规则】/配置) */
  sendSwitchSequenceToMainOperatorContent: string
  /**VariableList组件从数据中心刷新最新的展开项 */
  onRefVariableActiveKey?: string
  /**打开匹配器和提取器Modal */
  openMatcherAndExtraction: string

  /** 全局刷新器返回数据-发送请求里丢弃包的数量 */
  onGetDiscardPackageCount: string
  /** MCP / 后端推送：新建 Web Fuzzer Tab */
  onServerPushOpenWebFuzzerTab: string
  /** MCP / 后端推送：执行指定 Web Fuzzer Tab */
  onServerPushExecuteWebFuzzerTab: string
  onExecuteWebFuzzerTab: string
  /** OpenAPI / API 文档解析进度 */
  onOpenAPIParseProgress: string
  /** 保存webfuzzer历史记录 */
  onSaveHistoryDataHttpFuzzer?: string
}

export interface McpWebFuzzerExecution {
  executionId: string
  pageId: string
  expiresAt: number
}

/**
 * 校验服务端推送的 Web Fuzzer 执行指令：executionId / pageId 缺失或 expiresAt
 * 非有限数时抛错。调用方须在校验通过后才入队 / 切页，保证无效推送仅触发错误通知。
 */
export const assertValidMcpWebFuzzerExecution = (execution: McpWebFuzzerExecution) => {
  if (!execution.executionId || !execution.pageId || !Number.isFinite(execution.expiresAt)) {
    throw new Error('Web Fuzzer execution push is invalid')
  }
}

const pendingMcpWebFuzzerExecutions = new Map<string, McpWebFuzzerExecution[]>()

export const queueMcpWebFuzzerExecution = (execution: McpWebFuzzerExecution) => {
  if (!execution.executionId || !execution.pageId || execution.expiresAt <= Date.now()) return
  const queue = pendingMcpWebFuzzerExecutions.get(execution.pageId) || []
  if (queue.some((item) => item.executionId === execution.executionId)) return
  queue.push(execution)
  pendingMcpWebFuzzerExecutions.set(execution.pageId, queue)
}

export const consumeMcpWebFuzzerExecution = (pageId: string): McpWebFuzzerExecution | undefined => {
  const queue = pendingMcpWebFuzzerExecutions.get(pageId)
  if (!queue) return undefined
  const now = Date.now()
  while (queue.length > 0) {
    const execution = queue.shift()!
    if (execution.expiresAt > now) {
      if (queue.length === 0) pendingMcpWebFuzzerExecutions.delete(pageId)
      return execution
    }
  }
  pendingMcpWebFuzzerExecutions.delete(pageId)
  return undefined
}
