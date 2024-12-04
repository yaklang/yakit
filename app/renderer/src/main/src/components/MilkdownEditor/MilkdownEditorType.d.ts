import {Editor} from "@milkdown/kit/core"
import {MilkdownPlugin} from "@milkdown/kit/ctx"
import {React, ReactNode} from "react"
import {CollabManager} from "./CollabManager"
import {CloseEvent} from "ws"
import {YakitRoute} from "@/enums/yakitRoute"
import {WSConnectedStatusType} from "./WebsocketProvider/WebsocketProviderType"

export type EditorMilkdownProps = Editor

export interface MilkdownRefProps {
    collabManager: CollabManager
}

export interface CollabStatus {
    /**ws链接状态 */
    status: WSConnectedStatusType
    /**文档是否同步 */
    isSynced: boolean
}
export interface CustomMilkdownProps {
    /**编辑器使用的页面,enableCollab为true，该字段必传 */
    routeInfo?: {pageId: string; route: YakitRoute}
    ref?: React.ForwardedRef<MilkdownRefProps>
    /**编辑器值, 目前当默认值*/
    value?: string
    editor?: EditorMilkdownProps
    setEditor?: (s: EditorMilkdownProps) => void
    /**自定义插件 */
    customPlugin?: MilkdownPlugin | MilkdownPlugin[]
    /**启用协作文档 默认不启用 */
    enableCollab?: boolean
    /**文档链接状态变化 */
    onChangeWSLinkStatus?: (v: CollabStatus) => void
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
