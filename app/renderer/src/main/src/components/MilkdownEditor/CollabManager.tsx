import {CollabService} from "@milkdown/plugin-collab"
import {Doc} from "yjs"
import {WebsocketProvider} from "./WebsocketProvider/WebsocketProvider"
import {WSConnectedStatusType} from "./WebsocketProvider/WebsocketProviderType"

const wsUrl = "ws://192.168.3.100:8088/api/ws"
// const wsUrl = "ws://localhost:1880/ws"

interface CollabUserInfo {
    name: string
    color: string
    heardImg: string
}

export class CollabManager {
    private doc!: Doc
    private wsProvider!: WebsocketProvider
    public status: WSConnectedStatusType

    constructor(
        private collabService: CollabService,
        private user: CollabUserInfo,
        private token: string
    ) {
        this.status = "disconnected"
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
            this.status = payload.status
        })
        this.wsProvider.on("connection-close", (payload) => {})
        this.wsProvider.on("connection-error", (payload) => {
            /**TODO - 额外的ws断开操作 */
        })
        this.collabService.bindDoc(this.doc).setAwareness(this.wsProvider.awareness)
        this.wsProvider.once("synced", async (isSynced: boolean) => {
            if (isSynced) {
                this.collabService.applyTemplate(template).connect()
            }
        })
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
