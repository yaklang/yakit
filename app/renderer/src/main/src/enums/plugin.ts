export enum RemotePluginGV {
    /** @name 插件详情-本地功能自动下载插件 */
    AutoDownloadPlugin = "auto-download-plugin",

    /** @name 我的插件-删除插件的二次确认弹框 */
    UserPluginRemoveCheck = "user_plugin_remove_check",
    /** @name 插件回收站-删除插件的二次确认弹框 */
    RecyclePluginRemoveCheck = "recycle_plugin_remove_check",
    /** @name 本地插件-删除插件的二次确认弹框 */
    LocalPluginRemoveCheck = "local_plugin_remove_check",

    /** 商店|我的插件|插件管理列表-批量下载提示本地存在同名则覆盖的二次确认弹框 */
    BatchDownloadPluginSameNameOverlay = "batch_download_plugin_same_name_overlay",
    /** 商店|我的插件|插件管理列表|插件详情-单个下载提示本地存在同名则覆盖的二次确认弹框 */
    SingleDownloadPluginSameNameOverlay = "single_download_plugin_same_name_overlay",

    /** mitm 类型插件新增 cli 自定义参数，需要在用户端提示用户更新一遍本地插件(一次性提示) */
    UpdateLocalPluginForMITMCLI = "update_local_plugin_for_mitm_cli"
}
