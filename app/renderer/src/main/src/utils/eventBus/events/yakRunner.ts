export type YakRunnerEventProps = {
    onJumpEditorDetail: string
    onOpenBottomDetail: string
    onRefreshRunnerHistory: string
    onOpenFolderList: string
    // 刷新文件树
    onRefreshFileTree?: string
    // 重新设置文件树缓存（展开 点击 多选）
    onResetFileTree?: string
}