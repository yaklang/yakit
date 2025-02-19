import {CollabService} from "@milkdown/plugin-collab"
import {Doc, Transaction, YTextEvent} from "yjs"
import {WebsocketProvider} from "./WebsocketProvider/WebsocketProvider"
import {ObservableV2} from "lib0/observable"
import isEqual from "lodash/isEqual"
import {CollabStatus} from "./MilkdownEditorType"
import {yakitNotify} from "@/utils/notification"
import {NotepadWsRequest} from "./WebsocketProvider/WebsocketProviderType"
import {notepadActions, notepadSaveStatus} from "./WebsocketProvider/constants"
import * as Y from "yjs" // eslint-disable-line
import {yDocToProsemirrorJSON, ySyncPluginKey, yXmlFragmentToProseMirrorRootNode} from "y-prosemirror"
import {schema} from "@milkdown/kit/core"
import {calcYchangeDomAttrs, hoverWrapper} from "./utils/historyPlugin"
import {Node, Schema} from "@milkdown/kit/prose/model"

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

        this.doc = new Doc({gc: false})

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
        const permanentUserData = new Y.PermanentUserData(this.doc)
        // permanentUserData.setUserMapping(this.doc, this.user.userId, this.user.name)
        permanentUserData.setUserMapping(this.doc, this.doc.clientID, this.user.name)

        this.collabService
            .bindDoc(this.doc)
            .setAwareness(this.wsProvider.awareness)
            .mergeOptions({
                ySyncOpts: {
                    permanentUserData: permanentUserData,
                    colors: [
                        {light: "#ecd44433", dark: "#ecd444"},
                        {light: "#ee635233", dark: "#ee6352"},
                        {light: "#6eeb8333", dark: "#6eeb83"}
                    ]
                }
            })
        this.wsProvider.once("synced", (isSynced: boolean) => {
            this.setCollabStatus({...this.collabStatus, isSynced})
        })

        this.wsProvider.once("online-user-count", (onlineUserCount: number) => {
            if (onlineUserCount < 2 && this.collabStatus.isSynced) {
                this.collabService.applyTemplate(template).connect()
            } else if (this.collabStatus.isSynced) {
                this.collabService.connect()
            }
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

    versionComparison = (editorview, version, prevVersion) => {
        // const update = Buffer.from(version.update, "base64")
        // Y.applyUpdate(this.doc, update)
        debugger
        // this.addVersion("")

        const diff1 = Buffer.from(prevVersion.diff, "base64")
        const stateVector = Buffer.from(prevVersion.stateVector, "base64")
        const update1 = Buffer.from(prevVersion.update, "base64")
        // const stateVector1 = Y.encodeStateVectorFromUpdate(update1)

        const update2 = Buffer.from(version.update, "base64")

        const diff = Y.diffUpdate(update2, stateVector)
        Y.logUpdate(diff)
        Y.applyUpdate(this.doc, diff1)
        // this.liveTracking(editorview, true)
        // const snapshot = Y.snapshot(this.doc)
        // editorview.dispatch(
        //     editorview.state.tr.setMeta(ySyncPluginKey, {
        //         snapshot: null,
        //         prevSnapshot: snapshot
        //     })
        // )
        // if (prevVersion) {
        //     const update = Buffer.from(version.update, "base64")
        //     Y.applyUpdate(this.doc, update)
        // } else {
        // }
        // const stateVector = Buffer.from(version.stateVector, "base64")

        // console.log("diff", diff)

        // Y.applyUpdate(this.doc, update2)

        // const snapshot = Y.snapshot(this.doc)
        // editorview.dispatch(
        //     editorview.state.tr.setMeta(ySyncPluginKey, {
        //         snapshot: null,
        //         prevSnapshot: snapshot
        //     })
        // )
    }
    /**
     * @param {Y.Doc} doc
     */
    addVersion = (content) => {
        const doc = this.doc
        const versions = doc.getArray("versions")
        const prevVersion: any = versions.length === 0 ? null : versions.get(versions.length - 1)
        const prevSnapshot =
            prevVersion === null ? Y.emptySnapshot : Y.decodeSnapshot(Buffer.from(prevVersion.snapshot, "base64"))
        const snapshot = Y.snapshot(doc)

        if (prevVersion != null) {
            // account for the action of adding a version to ydoc
            prevSnapshot.sv.set(
                prevVersion.clientID,
                /** @type {number} */
                prevSnapshot?.sv?.get(prevVersion?.clientID)! + 1
            )
        }
        // if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
        const stateVector = Y.encodeStateVector(doc)
        const item = [
            {
                date: new Date().getTime(),
                snapshot: Buffer.from(Y.encodeSnapshot(snapshot)).toString("base64"),
                clientID: doc.clientID,
                userName: this.user.name,
                stateVector: Buffer.from(stateVector).toString("base64"),
                update: Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64"),
                content,
                diff: Buffer.from(Y.encodeStateAsUpdate(doc, stateVector)).toString("base64")
            }
        ]
        console.log("setVersions-item", item, snapshot, Y.encodeSnapshot(snapshot))
        versions.push(item)
        // }

        // ------------------------------------------------------------
        // let update = Y.encodeStateAsUpdate(this.doc)

        // const stateVector1 = Y.encodeStateVectorFromUpdate(update)
        // const diff = Y.diffUpdate(update, stateVector1)

        // update = Y.mergeUpdates([update, diff])

        // const versions = this.doc.getArray("versions")
        // const base64Update = Buffer.from(update).toString("base64") // 转成 Base64 便于存储
        // const item = {
        //     clientID: this.doc.clientID,
        //     timestamp: new Date().getTime(),
        //     userName: this.user.name,
        //     content: base64Update,
        //     snapshot: Buffer.from(Y.encodeSnapshot(snapshot)).toString("base64"),
        //     diff: Buffer.from(diff).toString("base64")
        // }
        // versions.push([item])
        // ------------------------------------------------------------
    }

    onBatchSaveVersions = (content) => {
        const versions = this.doc.getArray("versions")

        const contents: any[] = []
        versions.toArray().forEach((v: any) => {
            contents.push(Buffer.from(v.content, "base64"))
        })
        const mergedUpdate = Y.mergeUpdates(contents)

        const item = {
            clientID: this.doc.clientID,
            timestamp: new Date().getTime(),
            userName: this.user.name,
            // content: "",
            content: Buffer.from(mergedUpdate).toString("base64")
            // snapshot: Buffer.from(mergedUpdate).toString("base64")
        }
        versions.delete(0, versions.length - 1)
        versions.push([item])

        // const user = this.wsProvider.awareness.getLocalState()?.user

        // const contents: any[] = []
        // versions.toArray().forEach((v: any) => {
        //     contents.push(v.content)
        // })
        // const mergedUpdate = Y.mergeUpdates(contents)
        // const mergedDoc = new Y.Doc()
        // Y.applyUpdate(mergedDoc, mergedUpdate)
        // const mergedSnapshot = Y.snapshot(mergedDoc)
        // const item = [
        //     {
        //         date: new Date().getTime(),
        //         snapshot: Buffer.from(Y.encodeSnapshot(mergedSnapshot)).toString("base64"),
        //         // clientID: doc.clientID,
        //         userName: user.name + "批量",
        //         content: mergedUpdate
        //     }
        // ]
        // versions.delete(0, versions.length - 1)
        // versions.push(item)
    }

    onDiff = () => {
        const versions: any = this.doc.getArray("versions")
        // versions.forEach((record) => {
        //     const update = Buffer.from(record.content, "base64")
        //     Y.applyUpdate(this.doc, update) // 关键：按顺序应用历史更新
        // })
        const prevVersion: any = versions.length === 0 ? null : versions.get(versions.length - 1)
        if (!prevVersion.content) return
        // const binaryUpdate = Buffer.from(prevVersion.content, "base64")
        // Y.applyUpdate(this.doc, binaryUpdate) // **恢复文档状态**
        const snapshot = Buffer.from(prevVersion.snapshot, "base64")
        const doc = new Doc({gc: false})
        const docRestored = Y.createDocFromSnapshot(doc, Y.decodeSnapshot(snapshot))
        console.log("state restored at snapshot", docRestored.toJSON())
    }

    renderVersion = (editorview, version, prevVersion) => {
        const prevSnapshot = prevVersion ? prevVersion?.snapshot : null
        const snapshot = Buffer.from(version.snapshot, "base64")

        console.log("version", version, version.snapshot, snapshot, Y.decodeSnapshot(snapshot))

        const prevDecodeSnapshot =
            prevSnapshot == null ? Y.emptySnapshot : Y.decodeSnapshot(Buffer.from(prevSnapshot, "base64"))
        console.log("prevSnapshot", prevSnapshot, prevDecodeSnapshot)
        const tr = editorview.state.tr.setMeta(ySyncPluginKey, {
            snapshot: Y.decodeSnapshot(snapshot),
            prevSnapshot: prevDecodeSnapshot
        })
        editorview.dispatch(tr)
        console.log("editorview.state", editorview.state, editorview.state.doc.toJSON())

        // ---------------------------------------------------------

        // const content = Buffer.from(prevVersion.content, "base64")
        // const tempDoc = new Y.Doc() // 创建临时 `Y.Doc`
        // Y.applyUpdate(tempDoc, content) // 应用历史 `update`
        // const prevSnapshot1 = Y.snapshot(tempDoc)

        // editorview.dispatch(
        //     editorview.state.tr.setMeta(ySyncPluginKey, {
        //         snapshot: null, // 进入 `diff` 模式
        //         prevSnapshot: prevSnapshot1
        //     })
        // )
        // ---------------------------------------------------------
    }

    unrenderVersion = (editorview) => {
        console.log(
            "ySyncPluginKey.getState(editorview.state)",
            ySyncPluginKey,
            ySyncPluginKey.getState(editorview.state)
        )
        const binding = ySyncPluginKey.getState(editorview.state)?.binding
        console.log("binding", binding, binding?.unrenderSnapshot)
        if (binding) {
            binding.unrenderSnapshot()
        }
    }

    setVersions = () => {
        const value = sessionStorage.getItem("versions")
        try {
            if (value) {
                const versions = this.doc.getArray("versions")
                const versionList = JSON.parse(value)
                console.log("versionList", versionList)
                versions.push(versionList)
            }
        } catch (error) {
            console.log("error", error)
        }
    }

    setSession = () => {
        this.addVersion("")
        const versions = this.doc.getArray("versions")
        console.log("setSession", versions, versions.toJSON(), versions.toArray())
        sessionStorage.setItem("versions", JSON.stringify(versions))
    }

    liveTracking = (editorview, checked) => {
        if (checked) {
            const versions: any = this.doc.getArray("versions")
            const snapshot = Buffer.from(versions.get(versions.length - 1).snapshot, "base64")
            const lastVersion = versions.length > 0 ? Y.decodeSnapshot(snapshot) : Y.emptySnapshot
            console.log("lastVersion", lastVersion, versions, this.doc.clientID)

            editorview.dispatch(
                editorview.state.tr.setMeta(ySyncPluginKey, {
                    snapshot: null,
                    prevSnapshot: lastVersion
                })
            )
            console.log("editorview.state", editorview.state.doc.toJSON())
        } else {
            this.unrenderVersion(editorview)
        }
    }

    getVersions = () => {
        const versions = this.doc.getArray("versions")
        return versions
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
