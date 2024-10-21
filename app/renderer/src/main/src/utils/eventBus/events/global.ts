export type GlobalEventProps = {
    /** 打开引擎日志终端 */
    openEngineLogTerminal?: boolean
    /** 软件顶部是否能拖拽移动软件 */
    setYakitHeaderDraggable: boolean
    /**切换二级菜单的选中项目 */
    switchSubMenuItem: string
    /**触发性能采样 */
    performanceSampling?: string
    cancelPerformanceSampling?: string
    /**刷新顶部漏洞风险的已读未读状态 */
    onRefRisksRead: string
    /**系统代理已刷新 */
    onRefConfigSystemProxy: string
}
