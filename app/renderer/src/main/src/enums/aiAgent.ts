export enum RemoteAIAgentGV {
  /** @name ai-agent-chat 全局配置 */
  AIAgentChatSetting = 'ai-agent-chat-setting',

  /**
   * 清空 AI 会话 IndexedDB 的依据
   * 打开 IDB 时与 AIAgentIDBCacheClearValue 比较，缺标识或旧于当前值则清空三表
   */
  AIAgentIDBCacheClear = 'ai-agent-idb-cache-clear',

  /** @name 替换 forge 模板时是否隐藏提示框, 直接进行替换 */
  AIAgentReplaceForgeNoPrompt = 'ai-agent-replace-forge-no-prompt',

  /** @name 替换tool时是否隐藏提示框, 直接进行替换 */
  AIAgentReplaceToolNoPrompt = 'ai-agent-replace-tool-no-prompt',
  /** @name ai侧边栏展开收起模式 */
  AIAgentSideShowMode = 'ai-agent-side-show-mode',
  /** @name 记忆库快捷删除 */
  AIMemoryRemove = 'ai-memory-remove',
  /** @name AIModel检测结果中的编辑器的美化 */
  AIModelCheckResultEditorBeautify = 'ai-model-check-result-editor-beautify',
  /** @name ai配置的展开项 */
  AISettingActiveKey = 'ai-setting-activeKey',
  /** @name 嵌入侧栏（HistoryAIReActChat）统一缓存的回答模式，与 AI Agent 全局配置隔离 */
  HistoryAIReviewPolicy = 'history-ai-review-policy',
}
