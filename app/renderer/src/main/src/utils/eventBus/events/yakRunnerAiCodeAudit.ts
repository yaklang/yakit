export type YakRunnerAiCodeAuditEventProps = {
  onAiCodeAuditJumpEditorDetail: string
  onAiCodeAuditOpenBottomDetail: string
  onAiCodeAuditOpenTerminaDetail?: string
  onAiCodeAuditRefreshRunnerHistory: string
  // 打开文件树
  onAiCodeAuditOpenFileTree: string
  // 刷新文件树
  onAiCodeAuditRefreshFileTree?: string
  // 重新设置文件树缓存（展开 点击 多选）
  onAiCodeAuditResetFileTree?: string
  // 展开文件树
  onAiCodeAuditExpandedFileTree: string
  // 新建文件
  onAiCodeAuditNewFileInFileTree: string
  // 新建文件夹
  onAiCodeAuditNewFolderInFileTree: string
  // 删除文件/文件夹
  onAiCodeAuditDeleteInFileTree: string
  // 关闭打开的文件
  onAiCodeAuditCloseFile: string
  // 监听一级页面关闭事件
  onAiCodeAuditCloseYakRunner?: string
  // 定位文件树
  onAiCodeAuditScrollToFileTree: string
  // 终端中打开
  onAiCodeAuditOpenTernimal: string
  // 默认展开文件树
  onAiCodeAuditDefaultExpanded: string
  // 操作文件树（快捷键）
  onAiCodeAuditOperationFileTree: string
  // 通过路径打开文件
  onAiCodeAuditOpenFileByPath: string
  // 打开临时文件
  onAiCodeAuditOpenTemporaryFile: string
  // 通过缓存文件路径读取文件内容
  onAiCodeAuditGetCodeByPathCache: string
  // 打开编译文件Modal
  onAiCodeAuditOpenAuditModal?: string
  // 刷新审计树
  onAiCodeAuditRefreshAuditTree?: string
  // 打开编译右侧详情
  onAiCodeAuditOpenAuditRightDetail: string
  // 打开审计树
  onAiCodeAuditOpenAuditTree: string
  // 刷新文件/审计树
  onAiCodeAuditRefreshTree?: string
  // 重置审计模式缓存数据
  onAiCodeAuditResetAuditStatus?: string
  // 刷新审计详情（关闭节点信息）
  onAiCodeAuditRefreshAuditDetail?: string

  /** 工程根路径切换：重置右侧 AI 会话（旧会话保留在历史） */
  onIrifyAiCodeAuditProjectChanged?: string
  /** 请求展示 AI 代码审计引导蒙版（payload: IrifyAiCodeAuditOnboardingRequest JSON） */
  onIrifyAiCodeAuditShowOnboarding: string
  /** 编辑器选中代码发送到自由对话 */
  onAiCodeAuditSendCodeBlock: string
}
