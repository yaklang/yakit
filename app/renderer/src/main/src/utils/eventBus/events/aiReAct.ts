export type AIReActEventProps = {
  /**string>{AIAgentTriggerEventInfo} */
  onReActChatEvent: string
  switchAIActTab?: string
  /** 文件内容搜索结束后清空已打开预览上的搜索高亮（无 payload） */
  clearAIFilePreviewSearchHighlights?: string
  /**
   * string>{AIAgentTriggerEventInfo}
   */
  switchAIAgentTab: string
  /**
   * string>{AIAgentTriggerEventInfo}
   */
  actionAITaskContentTab: string

  /**
   * bool 传false/true 控制任务队列是否显示
   */
  changeAITaskQueryShow: string
}
