import {CollabService} from "@milkdown/plugin-collab"
import Y, {Doc} from "yjs"
import {WebsocketProvider} from "./WebsocketProvider/WebsocketProvider"
import {ObservableV2} from "lib0/observable"
import isEqual from "lodash/isEqual"
import {CollabStatus} from "./MilkdownEditorType"
import {getRemoteValue} from "@/utils/kv"
import {getRemoteHttpSettingGV} from "@/utils/envfile"
import {yakitNotify} from "@/utils/notification"
import {NotepadWsRequest} from "./WebsocketProvider/WebsocketProviderType"
import {notepadActions, notepadSaveStatus} from "./WebsocketProvider/constants"

export interface CollabUserInfo {
    userId: number
    name: string
    color: string
    heardImg: string
}

interface CollabManagerEvents {
    "offline-after": (event: CloseEvent) => void
    "link-status-onchange": (s: CollabStatus) => void
    "online-users": (s: CollabUserInfo[]) => void
    "sync-title": (s: string) => void
}

interface CollabNotepadWsRequest {
    token: string
    hash: string
    title: string
}
const getWSUrl = async () => {
    const res = await getRemoteValue(getRemoteHttpSettingGV())
    if (!res) return ""
    const value = JSON.parse(res)
    const inputUrl = value.BaseUrl
    // 解析 URL
    const parsedUrl = new URL(inputUrl)
    // 获取协议
    const protocol = parsedUrl.protocol
    // 根据协议转换为 WebSocket URL
    let wsUrl = ""
    if (protocol === "https:") {
        wsUrl = "wss://" + parsedUrl.host + parsedUrl.pathname
    } else if (protocol === "http:") {
        wsUrl = "ws://" + parsedUrl.host + parsedUrl.pathname
    }
    return wsUrl
}
export class CollabManager extends ObservableV2<CollabManagerEvents> {
    private doc!: Doc
    private wsProvider!: WebsocketProvider

    private collabStatus: CollabStatus
    private users: CollabUserInfo[]
    private title: string

    constructor(
        private collabService: CollabService,
        private user: CollabUserInfo,
        private wsRequest: CollabNotepadWsRequest
    ) {
        super()
        this.collabStatus = {
            status: "disconnected",
            isSynced: false,
            saveStatus: notepadSaveStatus.saveProgress
        }
        this.users = []
        this.title = wsRequest.title || ""
    }

    flush = async (template: string) => {
        let wsUrl = ""
        try {
            wsUrl = await getWSUrl()
        } catch (error) {
            yakitNotify("error", `getWSUrl错误:${error}`)
        }
        if (!wsUrl) {
            yakitNotify("error", "wsUrl数据错误")
            return
        }
        this.doc?.destroy()
        this.wsProvider?.destroy()

        this.doc = new Doc()

        const url = wsUrl + "api/notepad/ws"
        // const url = "ws://localhost:1880/ws/my-room"
        this.wsProvider = new WebsocketProvider(url, this.doc, {
            connect: true,
            data: {
                token: this.wsRequest.token,
                messageType: "notepad",
                params: {
                    hash: this.wsRequest.hash,
                    docType: notepadActions.join,
                    saveStatus: notepadSaveStatus.saveProgress
                },
                yjsParams: ""
            }
        })
        this.wsProvider.awareness.setLocalStateField("user", {
            userId: this.user.userId,
            name: this.user.name,
            color: this.user.color,
            heardImg: this.user.heardImg
        })
        this.wsProvider.on("status", (payload) => {
            // 获取当前所有用户的状态
            const users = this.getOnlineUser()
            this.setOnlineUsers([...users])
            if (users.length === 1) {
                this.setCollabStatus({...this.collabStatus, isSynced: true, status: payload.status})
            } else {
                this.setCollabStatus({...this.collabStatus, status: payload.status})
            }
        })
        this.wsProvider.on("connection-close", (payload, provider) => {
            this.emit("offline-after", [payload])
        })
        this.collabService.bindDoc(this.doc).setAwareness(this.wsProvider.awareness)
        this.wsProvider.once("synced", async (isSynced: boolean) => {
            this.setCollabStatus({...this.collabStatus, isSynced})
            if (isSynced) {
                this.collabService.applyTemplate(template).connect()
            }
        })

        this.wsProvider.on("saveStatus", async ({saveStatus}) => {
            this.setCollabStatus({...this.collabStatus, saveStatus})
        })
        // 监听在线用户数据
        this.wsProvider?.awareness?.on("change", (payload) => {
            // 获取当前所有用户的状态
            const users = this.getOnlineUser()
            this.setOnlineUsers([...users])
        })
    }

    private docObserveTitle() {
        const titleString = this.doc.getText("title").toString()
        this.onSetTitle(titleString)
    }

    private getOnlineUser() {
        const awarenessMap = this.wsProvider.awareness.getStates()
        const users = Array.from(awarenessMap, ([key, value]) => value.user)
        return users
    }

    private onSetTitle(newTitle: string) {
        if (!isEqual(this.title, newTitle)) {
            this.title = newTitle
            // 触发'状态变化'事件
            this.emit("sync-title", [newTitle])
        }
    }

    // 用于更新collabStatus并触发事件
    private setCollabStatus(newStatus: CollabStatus) {
        if (!isEqual(this.collabStatus, newStatus)) {
            this.collabStatus = {...newStatus}
            // 触发'状态变化'事件
            this.emit("link-status-onchange", [newStatus])
        }
    }

    // 用于更新setOnlineUsers并触发事件
    private setOnlineUsers(newUsers: CollabUserInfo[]) {
        if (!isEqual(this.users, newUsers)) {
            this.users = [...newUsers]
            // 触发'状态变化'事件
            this.emit("online-users", [newUsers])
        }
    }

    setTitle(value) {
        const textLength = this.doc.getText("title").length
        if (textLength) {
            // 清空当前内容
            this.doc.getText("title").delete(0, this.doc.getText("title").length)
        }
        // 插入新内容
        this.doc.getText("title").insert(0, value)
        // this.doc.getText("title").applyDelta([{insert: value}])
    }

    sendContent(value: {content: string; title: string}) {
        const {content, title} = value
        const v: NotepadWsRequest = {
            messageType: "notepad",
            params: {
                hash: this.wsRequest.hash,
                content,
                title,
                docType: "editDoc",
                saveStatus: "saveProgress"
            },
            yjsParams: "",
            token: this.wsRequest.token
        }
        if (this.wsProvider) {
            this.wsProvider?.ws?.send(Buffer.from(JSON.stringify(v)))
        }
    }

    connect() {
        this.wsProvider?.connect()
        this.collabService?.connect()
    }

    disconnect() {
        this.collabService?.disconnect()
        this.wsProvider?.disconnect()
    }
}
