import { LeftSideType } from "@/pages/yakRunner/LeftSideBar/LeftSideBarType"

export type YakRunnerEventProps = {
    onJumpEditorDetail: string
    onOpenBottomDetail: string
    onOpenTerminaDetail?: string
    onRefreshRunnerHistory: string
    onRefreshAduitHistory?: string
    // 打开文件树
    onOpenFileTree: string
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
    // 监听一级页面关闭事件
    onCloseYakRunner?: string
    // 定位文件树
    onScrollToFileTree: string
    // 终端中打开
    onOpenTernimal: string
    // 默认展开文件树
    onDefaultExpanded: string
    // 操作文件树（快捷键）
    onOperationFileTree: string
    // 通过路径打开文件
    onOpenFileByPath: string
    // 打开编译文件Modal
    onOpenAuditModal?: string
    // 刷新审计树
    onRefreshAuditTree?: string
    // 打开编译右侧详情
    onOpenAuditRightDetail: string
    // 打开审计树
    onOpenAuditTree: string
    // 刷新文件/审计树
    onRefreshTree?: string
    // 重置审计模式缓存数据
    onResetAuditStatus?: string
    // 刷新审计详情（关闭节点信息）
    onRefreshAuditDetail?: string
}