export type YakRunnerAuditEventProps = {
    onCodeAuditJumpEditorDetail: string
    onCodeAuditOpenBottomDetail: string
    onCodeAuditRefreshAduitHistory?: string
    // 重新设置文件树缓存（展开 点击 多选）
    onCodeAuditResetFileTree?: string
    // 刷新文件树
    onCodeAuditRefreshFileTree?: string
    // 展开文件树
    onCodeAuditExpandedFileTree: string
    // 关闭打开的文件
    onCodeAuditCloseFile: string
    // 定位文件树
    onCodeAuditScrollToFileTree: string
    // 默认展开文件树
    onCodeAuditDefaultExpanded: string
    // 通过路径打开文件
    onCodeAuditOpenFileByPath: string
    // 打开编译文件Modal
    onExecuteAuditModal?: string
    // 打开编译右侧详情
    onCodeAuditOpenRightDetail: string
    // 打开编译BUG详情
    onCodeAuditOpenBugDetail: string
    // 打开审计树
    onCodeAuditOpenAuditTree: string
    // 刷新树
    onCodeAuditRefreshTree?: string
    // 刷新审计详情（关闭节点信息）
    onCodeAuditRefreshAuditDetail?: string
    // 监听页面数据更新
    onAuditCodePageInfo: string
    // 重置整个代码审计页面
    onInitAuditCodePage?: string
    // 执行审计
    onAuditRuleSubmit: string
    // 停止审计
    onStopAuditRule?: string
    // 打开已有项目
    onCodeAuditHistoryExpanded?: string
    // 重新设置审计规则
    onResetAuditRule: string
    // 初始化 Widget
    onInitWidget: string
    // monaco查看详情 展开对应审计结果、审计过程
    onWidgetOpenRightAudit: string
    // 展开对应路径信息
    onExpendRightPath: string
    // 通知再次打开widget
    onWidgetOpenAgain: string
    // 刷新项目管理列表
    onRefreshProjectManager?: string
    // 通知打开审计搜索
    onOpenSearchModal?: string
    // 通知打开左边第二栏
    onOpenLeftSecondNode: "result" | "history"
    // 刷新文件树或者规则树
    onRefreshFileOrRuleTree?: string
}