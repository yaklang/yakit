export interface PluginLogDetailProps {
    getContainer?: HTMLElement
    uuid: string
    info: API.PluginsLogsDetail
    visible?: boolean
    onClose: () => any
    onChange: (isPass: boolean, reason?: string) => any
}
