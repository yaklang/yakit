export type PluginsEventProps = {
    /** 刷新本地插件列表 */
    onRefLocalPluginList: string
    /** 触发编辑插件功能的插件ID */
    sendEditPluginId: string
    /** 新建|编辑插件成功后的发送信号(包含本地和线上保存, 传递数据的定义[SavePluginInfoSignalProps]) */
    savePluginInfoSignal: string
    /** 刷新插件商店列表 */
    onRefOnlinePluginList: string
    /** 刷新我的插件列表 */
    onRefUserPluginList: string
}
