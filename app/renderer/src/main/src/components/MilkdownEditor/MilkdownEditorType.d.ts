import {Editor} from "@milkdown/kit/core"
import {MilkdownPlugin} from "@milkdown/kit/ctx"
import {React, ReactNode} from "react"
import {CollabManager, CollabUserInfo} from "./CollabManager"
import {CloseEvent} from "ws"
import {YakitRoute} from "@/enums/yakitRoute"
import {NotepadActionType, WSConnectedStatusType} from "./WebsocketProvider/WebsocketProviderType"

export type EditorMilkdownProps = Editor

export interface MilkdownRefProps {
    collabManager: CollabManager
}

export interface CollabStatus {
    /**ws链接状态 */
    status: WSConnectedStatusType
    /**文档是否同步 */
    isSynced: boolean
    /**文档是否保存 */
    isSave?: boolean
}

export interface MilkdownCollabProps {
    /**启用协作文档 默认不启用 */
    enableCollab: boolean
    /**enableCollab为true，该字段必传,协作文档得唯一标识 */
    milkdownHash: string
    /**编辑器使用的页面,enableCollab为true，该字段必传 */
    routeInfo: {pageId: string; route: YakitRoute | null}
    /**是否开启保存历史  开启后默认间隔 1s*/
    enableSaveHistory?: boolean | {enable: boolean; interval: number}
    /**文档链接状态变化 */
    onChangeWSLinkStatus: (v: CollabStatus) => void
    /**在线用户数据变化 */
    onChangeOnlineUser: (v: CollabUserInfo[]) => void
}
export interface CustomMilkdownProps {
    ref?: React.ForwardedRef<MilkdownRefProps>
    /**设置为只读 */
    readonly?: boolean
    /**编辑器默认值*/
    defaultValue?: string
    editor?: EditorMilkdownProps
    setEditor?: (s: EditorMilkdownProps) => void
    /**自定义插件 */
    customPlugin?: MilkdownPlugin | MilkdownPlugin[]

    /**协作文档相关参数 */
    collabProps?: MilkdownCollabProps
    /**编辑器内容的变化 */
    onMarkdownUpdated: (next: string, per: string) => void
}
export interface MilkdownEditorProps extends CustomMilkdownProps {}

export interface MilkdownBaseUtilProps {
    id: number
    icon: ReactNode
    label: string
    description: string
}
export interface BlockListProps extends MilkdownBaseUtilProps {}
export type TooltipListProps = MilkdownBaseUtilProps | {id: number; label: string}

export interface DeleteOSSFileItem {
    fileName: string
    time: number
}
