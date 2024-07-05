export type YakRunnerEventProps = {
    onJumpEditorDetail: string
    onOpenBottomDetail: string
    onRefreshRunnerHistory: string
    onOpenFolderList: string
    // 刷新文件树
    onRefreshFileTree?: string
    // 重新设置文件树缓存（展开 点击 多选）
    onResetFileTree?: string
    // 展开文件树
    onExpandedFileTree: string
    // 新建文件
    onNewFileInFileTree: string
    // 新建文件夹
    onNewFolderInFileTree:string
    // 删除文件/文件夹
    onDeleteInFileTree: string
    // 关闭打开的文件
    onCloseFile: string
    // 定位文件树
    onScrollToFileTree: string
}