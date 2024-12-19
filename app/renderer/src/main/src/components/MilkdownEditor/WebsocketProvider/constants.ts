import {NotepadActionsProps, NotepadSaveStatusProps, WSConnectedStatusProps} from "./WebsocketProviderType"

/**同步消息 */
export const messageSync = 0
/**查询 Awareness 客户端的状态信息 */
export const messageQueryAwareness = 3
/**发送关于其他客户端状态的通知 */
export const messageAwareness = 1
/**身份验证 */
export const messageAuth = 2

export const notepadActions: NotepadActionsProps = {
    join: "joinDoc",
    leave: "leaveDoc",
    edit: "editDoc"
}

/**ws 链接状态 */
export const wsConnectedStatus: WSConnectedStatusProps = {
    connected: "connected",
    disconnected: "disconnected",
    connecting: "connecting"
}

/**ws 文档保存状态 */
export const notepadSaveStatus: NotepadSaveStatusProps = {
    saveProgress: "saveProgress",
    saveSuccess: "saveSuccess",
    saveError: "saveError"
}
