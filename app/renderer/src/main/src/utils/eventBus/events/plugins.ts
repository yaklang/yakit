import {PluginSourceType} from "@/pages/pluginHub/type"

export type PluginsEventProps = {
    /** 刷新本地插件列表 */
    onRefLocalPluginList: string
    /** 触发编辑插件功能的插件ID */
    sendEditPluginId: string
    /** 新建|编辑插件成功后的发送信号(包含本地和线上保存, 传递数据的定义[SavePluginInfoSignalProps]) */
    savePluginInfoSignal: string
    /** 刷新插件商店列表 */
    onRefOnlinePluginList: string

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

    // ---------- 插件列表相关通信 ----------
    /** 刷新插件仓库指定tab */
    refreshPluginHubTabActive: PluginSourceType

    /** 刷新我的插件列表 */
    onRefUserPluginList: string

    /** 我的插件 删除操作通知 回收站刷新列表 */
    ownDeleteToRecycleList?: string
    /** 回收站 还原操作通知 我的插件刷新列表 */
    recycleRestoreToOwnList?: string

    // ---------- 插件详情相关通信 ----------
    /** 插件详情删除本地插件 通知本地列表的变量刷新 */
    detailDeleteLocalPlugin: string
    /** 插件详情删除我的插件 通知我的列表的变量刷新 */
    detailDeleteOwnPlugin: string
    /** 插件详情更改公开|私密 通知我的列表里状态更新 */
    detailChangeStatusOwnPlugin: string

    // ---------- 插件编辑相关通信 ----------
    /** 插件编辑-本地保存成功后通知详情更新插件信息 */
    editorLocalSaveToDetail: string

    // ---------- 插件(新建|编辑)相关通信 ----------
    /**
     * 插件(新建|编辑)本地保存后通知本地列表更新(更新插件存在进行局部更新，不存在进行刷新列表)
     * 传递数据为对象 JSON, 定义为 KeyParamsFetchPluginDetail
     */
    editorLocalSaveToLocalList: string
    /**
     * 新建插件成功后通知插件仓库定位列表到本地列表，并更新数据(更新插件存在进行局部更新，不存在进行刷新列表)
     * 传递数据为对象 JSON, 定义为 KeyParamsFetchPluginDetail
     */
    editorLocalNewToLocalList: string
}
