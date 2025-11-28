export type AIAgentEventProps = {
    /** 触发侧边栏相关功能通信 */
    onSideBarEvent: string
    /** 触发工具卡片详情 */
    onTooCardDetails: string

    /** 新建|编辑 forge 后刷新左侧 forge 列表, 传递的内容为本次新建|编辑的 forge-ID */
    onTriggerRefreshForgeList: string
    /** ai中模型修改后，刷新可用的ai模型列表 */
    onRefreshAvailableAIModelList?: string
    /** 刷新ai模型列表 */
    onRefreshAIModelList?: string
}
