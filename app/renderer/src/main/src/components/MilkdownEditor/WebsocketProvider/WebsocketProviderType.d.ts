import * as encoding from "lib0/encoding"
import * as decoding from "lib0/decoding"
import * as awarenessProtocol from "y-protocols/awareness"
import {ObservableV2} from "lib0/observable"
import {Doc, Transaction} from "yjs"
import {WebsocketProvider} from "./WebsocketProvider"
import {API} from "@/services/swagger/resposeType"

type WebSocketType = typeof WebSocket
// 同步文档操作函数接口
export type MessageHandlersProps = (
    encoder: encoding.Encoder,
    decoder: decoding.Decoder,
    provide: WebsocketProvider,
    emitSynced: boolean,
    messageType: number
) => void

export interface NotepadActionsProps {
    /**加入文档 */
    join: "joinDoc"
    /**离开文档 */
    leave: "leaveDoc"
    /**修改文档 */
    edit: "editDoc"
}

// 通过映射类型获取 NotepadActionsProps 中所有字段的值，作为联合类型
export type NotepadActionType = NotepadActionsProps[keyof NotepadActionsProps]

export interface WebsocketProviderOptions {
    /**为true 自动链接 */
    connect?: boolean
    /**Awareness */
    awareness?: awarenessProtocol.Awareness
    /**specify url parameters */
    params?: {[key: string]: string}
    /***specify websocket protocols */
    protocols?: string[]
    /**Optionall provide a WebSocket polyfill */
    WebSocketPolyfill?: WebSocketType
    /**Request server state every `resyncInterval` milliseconds */
    resyncInterval?: number
    /**Maximum amount of time to wait before trying to reconnect (we try to reconnect using exponential backoff) */
    maxBackoffTime?: number
    /**Disable cross-tab BroadcastChannel communication */
    disableBc?: boolean
    data?: NotepadWsRequest
}

export type WebsocketProviderBcSubscriber = (data: ArrayBuffer, origin: any) => void
export type WebsocketProviderUpdateHandler = (update: Uint8Array, origin: any, ydoc: Doc, tr: Transaction) => void
export type WebsocketProviderAwarenessUpdateHandler = (
    changed: {added: number[]; updated: number[]; removed: number[]},
    origin: any
) => void

export type WebsocketProviderGetSendData = (v: {buf?: Uint8Array; docType: NotepadActionType}) => Buffer

export type WebsocketProviderExitHandler = () => void

export interface WSConnectedStatusProps {
    /**已连接 */
    connected: "connected"
    /**断开链接 */
    disconnected: "disconnected"
    /**连接中 */
    connecting: "connecting"
}
// 通过映射类型获取 WSConnectedStatusProps 中所有字段的值，作为联合类型
export type WSConnectedStatusType = WSConnectedStatusProps[keyof WSConnectedStatusProps]

export interface WebsocketProviderEmitOfStatus {
    status: WSConnectedStatusType
}
export interface WebsocketProviderEmitOfSaveStatus {
    saveStatus: NotepadSaveStatusType
}
export type ObservableEvents = {
    /**文档是否同步完成 */
    synced: (text: boolean) => void // synced 事件，接收一个 boolean 类型的参数
    /*NOTE - 暂不知*/
    sync: (text: boolean) => void // sync 事件
    /**ws链接状态 */
    status: (s: WebsocketProviderEmitOfStatus) => void
    /***ws 链接报错 */
    "connection-error": (event: Event, provider: WebsocketProvider) => void
    /***ws 关闭链接 */
    "connection-close": (event: CloseEvent, provider: WebsocketProvider) => void
    /**文档保存状态 */
    saveStatus: (s: WebsocketProviderEmitOfSaveStatus) => void
    /**文档在线用户数 */
    "online-user-count": (n: number) => void
}

export interface NotepadSaveStatusProps {
    saveProgress: "saveProgress"
    saveSuccess: "saveSuccess"
    saveError: "saveError"
}
export type NotepadSaveStatusType = NotepadSaveStatusProps[keyof NotepadSaveStatusProps]

interface NotepadWsRequestParams {
    /**不传得话就是前端传什么给后端，后端原封不动传回；传的话后悔会在次基础上做历史记录保存和更新最新的文档 */
    content?: string
    /**文档标题，传content就会传title */
    title?: string
    docType: NotepadActionType
    saveStatus: NotepadSaveStatusType
    userName?: string
    /**文档在线用户数 */
    userCount?: number
}
export interface NotepadWsRequest extends Omit<API.WsRequest, "params"> {
    params: NotepadWsRequestParams
    yjsParams: string
    token: string
    notepadHash: string
}
