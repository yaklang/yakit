export type AIReActEventProps = {
  /**string>{AIAgentTriggerEventInfo} */
  onReActChatEvent: string
  switchAIActTab?: string
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
