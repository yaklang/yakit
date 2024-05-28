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
    /** 刷新本地插件详情页面的选中的插件数据 */
    onRefLocalDetailSelectPlugin: string
    /** 修改私有域成功后发送的信号 */
    onSwitchPrivateDomain: string
    /** 导入刷新本地插件列表 */
    onImportRefLocalPluginList: string
    /** 刷新插件组管理本地插件组列表 */
    onRefPluginGroupMagLocalQueryYakScriptGroup: string
    /** 刷新插件组管理本地插件列表 */
    onRefPluginGroupMagLocalPluginList: string
    /** 刷新插件组管理线上插件组列表 */
    onRefPluginGroupMagOnlineQueryYakScriptGroup: string
    /** 刷新插件组管理线上插件列表 */
    onRefPluginGroupMagOnlinePluginList: string
    /** 刷新插件组中PluginGroup选中插件组 */
    onRefpluginGroupSelectGroup: string
    /** 刷新线上插件组管理列表 */
    onRefpluginGroupList?: string
    /**刷新单个执行页面中的插件数据 */
    onRefSinglePluginExecution?: string
    /** 刷新Codec相关菜单 */
    onRefPluginCodecMenu?: string
}
