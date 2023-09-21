export interface PluginsLocalProps {}

export interface LocalExtraOperateProps {
    /**是否是自己的插件 */
    isOwn: boolean
    /**删除插件 */
    onRemovePlugin: () => void
    /**导出插件 */
    onExportPlugin: () => void
    /**编辑 */
    onEditPlugin: () => void
    /**上传 */
    onUploadPlugin: () => void
}
