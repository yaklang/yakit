export type HistoryEventProps = {
  onScrollToByClick: string
  // History页面通知Mitm页面删除
  onDeleteToUpdate: string
  onDeleteToUpdateHTTPHistoryFilter?: string
  onHistoryJumpWebTree: string // 跳转到指定树节点
  onEditTag: string
  onRefreshImportHistoryTable?: string
  onGetAdvancedSearchDataEvent: string
  onGetOtherPageAdvancedSearchDataEvent: string
  /** AI 输入框移除 httpFlow mention 时，History 页同步取消表格勾选 */
  httpFlowMentionRemoved?: string
}
