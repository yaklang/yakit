export type YakRunnerAuditEventProps = {
    // 通过路径打开文件
    onCodeAuditOpenFileByPath: string
    // 打开编译文件Modal
    onExecuteAuditModal?: string
    // 刷新审计树
    onCodeAuditRefreshAuditTree?: string
    // 打开编译右侧详情
    onCodeAuditOpenRightDetail: string
    // 打开审计树
    onCodeAuditOpenAuditTree: string
    // 刷新树
    onCodeAuditRefreshTree?: string
}