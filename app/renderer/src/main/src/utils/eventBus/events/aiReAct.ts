export type AIReActEventProps = {
  /**string>{AIAgentTriggerEventInfo} */
  onReActChatEvent: string
  switchAIActTab?: string
  /** 文件内容搜索结束后清空已打开预览上的搜索高亮（无 payload） */
  clearAIFilePreviewSearchHighlights?: string
  /** 搜索命中行：已打开的文件预览滚到该位置（同区间再点也能定位） */
  revealAIFilePreviewSearchHit: string
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
