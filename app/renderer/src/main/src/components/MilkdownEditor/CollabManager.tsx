import {CollabService} from "@milkdown/plugin-collab"
import {Doc} from "yjs"
import {WebsocketProvider} from "./WebsocketProvider/WebsocketProvider"
import {ObservableV2} from "lib0/observable"
import {CloseEvent} from "ws"
import isEqual from "lodash/isEqual"
import {CollabStatus} from "./MilkdownEditorType"

const wsUrl = "ws://192.168.3.100:8088/api/ws"
// const wsUrl = "ws://localhost:1880/ws"

interface CollabUserInfo {
    name: string
    color: string
    heardImg: string
}

interface CollabManagerEvents {
    "offline-after": (event: CloseEvent) => void
    "link-status-onchange": (s: CollabStatus) => void
}
export class CollabManager extends ObservableV2<CollabManagerEvents> {
    private doc!: Doc
    private wsProvider!: WebsocketProvider

    private collabStatus: CollabStatus

    constructor(
        private collabService: CollabService,
        private user: CollabUserInfo,
        private token: string
    ) {
        super()
        this.collabStatus = {
            status: "disconnected",
            isSynced: false
        }
    }

    flush(template: string) {
        this.doc?.destroy()
        this.wsProvider?.destroy()

        this.doc = new Doc()

        this.wsProvider = new WebsocketProvider(wsUrl, this.doc, {
            connect: true,
            params: {
                Authorization: this.token
            }
        })
        this.wsProvider.awareness.setLocalStateField("user", {
            name: this.user.name,
            color: this.user.color,
            heardImg: this.user.heardImg
        })
        this.wsProvider.on("status", (payload) => {
            this.setCollabStatus({...this.collabStatus, status: payload.status})
        })
        this.wsProvider.on("connection-close", (payload, provider) => {
            this.emit("offline-after", [payload])
        })
        this.wsProvider.on("connection-error", (payload) => {})
        this.collabService.bindDoc(this.doc).setAwareness(this.wsProvider.awareness)
        this.wsProvider.once("synced", async (isSynced: boolean) => {
            this.setCollabStatus({...this.collabStatus, isSynced})
            if (isSynced) {
                this.collabService.applyTemplate(template).connect()
            }
        })
    }

    // 用于更新collabStatus并触发事件
    private setCollabStatus(newStatus: CollabStatus) {
        if (isEqual(this.collabStatus.status, newStatus)) {
            this.collabStatus = {...newStatus}
            // 触发'状态变化'事件
            this.emit("link-status-onchange", [newStatus])
        }
    }

    send(hash: string, content: string) {
        const v = {
            messageType: "notepad",
            params: {
                hash,
                content
            },
            yjsParams: new Uint8Array()
        }
        if (this.wsProvider) {
            this.wsProvider?.ws?.send(Buffer.from(JSON.stringify(v), "utf-8"))
        }
    }

    connect() {
        this.wsProvider.connect()
        this.collabService.connect()
    }

    disconnect() {
        this.collabService.disconnect()
        this.wsProvider.disconnect()
    }
}
