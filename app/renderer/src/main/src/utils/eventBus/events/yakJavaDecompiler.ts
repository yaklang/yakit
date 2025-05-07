export type yakJavaDecompilerEventProps = {
    // 打开反编译树
    onOpenDecompilerTree: string
    // 关闭反编译树
    onCloseDecompilerTree?: string
    // 刷新树(重新加载)
    onRefreshDecompilerTree?: string
    // 刷新树
    onDecompilerRefreshFileTree?: string
    // 通过路径打开文件
    onOpenDecompilerFileByPath: string
    // 重置文件树
    onResetDecompilerFileTree?: string
    // 刷新历史记录
    onRefreshDecompilerHistory?: string
    // 滚动文件树
    onScrollToDecompilerTree: string
}