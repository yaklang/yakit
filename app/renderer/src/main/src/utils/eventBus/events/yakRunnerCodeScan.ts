export type YakRunnerCodeScanEventProps = {
    // 重新设置代码扫描任务状态
    onSetCodeScanTaskStatus: string
    // 项目名称切换通知切换组且清空按关键词筛选数据
    onResetCodeScanProject?: string
}