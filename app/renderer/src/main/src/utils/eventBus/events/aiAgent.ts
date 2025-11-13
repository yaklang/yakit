export type AIAgentEventProps = {
    /** 触发侧边栏相关功能通信 */
    onSideBarEvent: string
    /** 触发工具卡片详情 */
    onTooCardDetails: string

    /** 新建|编辑 forge 后刷新左侧 forge 列表, 传递的内容为本次新建|编辑的 forge-ID */
    onTriggerRefreshForgeList: string

    /** 接口返回文件夹路径(type类型为filesystem_pin_directory)后发送给文件管理UI新增一颗文件树 */
    onTriggerAddFolderTree: string
}
