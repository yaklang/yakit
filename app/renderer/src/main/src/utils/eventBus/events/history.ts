export type HistoryEventProps = {
    onScrollToByClick: string
    // History页面通知Mitm页面删除
    onDeleteToUpdate: string
    // 通知history页面刷新
    onRefreshHistoryTable?: string
    onHistoryJumpWebTree: string // 跳转到指定树节点
}