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
    /** ai任务树定位规划列表 */
    onAITreeLocatePlanningList?: string
    // 知识库 路由传递的参数
    defualtAIMentionCommandParams: string
    /**ai侧边栏展开收起模式 */
    switchSideHiddenMode: string
    // 一级页面关闭事件
    onClosePageRepository?: string
    // /** 文件系统-文件预览已打开 */
    // filePreviewReady: string
    /**
     *@deprecated 设置ai输入框 {AIAgentTriggerEventInfo}
     * @name type "mention"
     * @name params {mention=>AIMentionCommandParams}传递的值
     */
    setAIInputByType?: string

    /**  AIModelList=> AIModelSelect{AIAgentTriggerEventInfo}
     * @name type "online"|"local"
     * @name params 传递的值,
     * params.fileName {AIModelTypeFileName} 当前变化的模型类型
     */
    aiModelSelectChange: string
    /** 文件系统默认展开路径 */
    fileSystemDefaultExpand: string

    /** AIReviewRule相关数据发生编发,是否热更新
     * @name reviewPolicy {AIStartParams["ReviewPolicy"]
     * @name aiReviewRiskControlScore {AIStartParams["AIReviewRiskControlScore"]
     */
    onRefreshAIReviewRuleSelect: string

    /** 删除会话列表里的会话时, 通知useChatIPC-hook对应会话数据已被删除，不需断开保存操作 */
    onDelChats: string

    /**
     * @name 刷新AI历史列表
     */
    onRefreshAITaskHistoryList?: string
}
