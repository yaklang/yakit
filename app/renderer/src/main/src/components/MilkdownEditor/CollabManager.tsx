import {CollabService} from "@milkdown/plugin-collab"
import {Doc, Transaction, YTextEvent} from "yjs"
import {WebsocketProvider} from "./WebsocketProvider/WebsocketProvider"
import {ObservableV2} from "lib0/observable"
import isEqual from "lodash/isEqual"
import {CollabStatus} from "./MilkdownEditorType"
import {yakitNotify} from "@/utils/notification"
import {NotepadWsRequest} from "./WebsocketProvider/WebsocketProviderType"
import {notepadActions, notepadSaveStatus} from "./WebsocketProvider/constants"

const {ipcRenderer} = window.require("electron")
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
    notepadHash: string
    title: string
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
            wsUrl = await ipcRenderer.invoke("get-ws-url")
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

        const docTitle = this.doc.getText("title") // 使用 Y.Text 存储标题
        docTitle.observe((yTextEvent, transaction) => this.docObserveTitle(yTextEvent, transaction))

        const url = wsUrl + "api/handle/tow/way/ws"
        // const url = "ws://localhost:1880/ws/my-room"
        this.wsProvider = new WebsocketProvider(url, this.wsRequest.notepadHash, this.doc, {
            connect: true,
            data: {
                token: this.wsRequest.token,
                messageType: "notepad",
                notepadHash: this.wsRequest.notepadHash,
                params: {
                    docType: notepadActions.join,
                    saveStatus: notepadSaveStatus.saveProgress,
                    userName: this.user.name
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
        this.wsProvider.on("connection-close", (payload) => {
            this.emit("offline-after", [payload])
        })
        this.collabService.bindDoc(this.doc).setAwareness(this.wsProvider.awareness)
        this.wsProvider.once("synced", (isSynced: boolean) => {
            this.setCollabStatus({...this.collabStatus, isSynced})
        })

        this.wsProvider.once("online-user-count", (onlineUserCount: number) => {
            this.collabService
                .applyTemplate(template, () => {
                    return onlineUserCount < 2 && this.collabStatus.isSynced
                })
                .connect()
        })

        this.wsProvider.on("saveStatus", ({saveStatus}) => {
            this.setCollabStatus({...this.collabStatus, saveStatus})
        })
        // 监听在线用户数据
        this.wsProvider?.awareness?.on("change", (payload) => {
            // 获取当前所有用户的状态
            const users = this.getOnlineUser()
            this.setOnlineUsers([...users])
        })
    }

    private docObserveTitle(yarrayEvent: YTextEvent, tr: Transaction) {
        if (tr.local) return
        const value = this.doc.getText("title").toString()
        this.onSetTitle(value)
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
        const docTitle = this.doc.getText("title")
        if (isEqual(this.title, value)) return
        this.title = value
        // 两次修改封装到一个事务中，观察器只会被触发一次
        this.doc.transact(() => {
            docTitle.delete(0, docTitle.length)
            docTitle.insert(0, value)
        })
    }

    sendContent(value: {content: string; title: string}) {
        const {content, title} = value
        const v: NotepadWsRequest = {
            messageType: "notepad",
            notepadHash: this.wsRequest.notepadHash,
            params: {
                content,
                title,
                docType: "editDoc",
                saveStatus: notepadSaveStatus.saveProgress
            },
            yjsParams: "",
            token: this.wsRequest.token
        }
        if (this.wsProvider && this.wsProvider?.ws && this.wsProvider.ws?.readyState === WebSocket.OPEN) {
            const sendValueString = JSON.stringify(v)
            this.wsProvider?.ws?.send(Buffer.from(sendValueString))
        }
    }

    destroy(): void {
        this.doc.getText("title").unobserve((yTextEvent, transaction) => this.docObserveTitle(yTextEvent, transaction))
        this.wsProvider?.destroy()
        super.destroy()
    }
    connect() {
        Promise.resolve().then(() => {
            this.wsProvider?.connect()
            this.collabService?.connect()
        })
    }

    disconnect() {
        Promise.resolve().then(() => {
            this.collabService?.disconnect()
            this.wsProvider?.disconnect()
        })
    }
}
