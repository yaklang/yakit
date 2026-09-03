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
  /** History 高级设置变更框选开关 */
  onTableDragSelectEnabledChange: string
}
