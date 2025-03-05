import {Doc} from "yjs"
import {CollabService} from "@milkdown/plugin-collab"
import {ObservableV2} from "lib0/observable"
import * as Y from "yjs" // eslint-disable-line
import {CollabUserInfo} from "@/components/MilkdownEditor/CollabManager"
import {ySyncPluginKey, ProsemirrorBinding} from "y-prosemirror"
import * as awarenessProtocol from "y-protocols/awareness"
import * as math from "lib0/math"

interface DiffMilkdownManagerEvents {}
interface ColorDef {
    light: string
    dark: string
}

const isVisible = (item, snapshot) =>
    snapshot === undefined
        ? !item.deleted
        : snapshot.sv.has(item.id.client) &&
          (snapshot.sv.get(item.id.client) || 0) > item.id.clock &&
          !isDeleted(snapshot.ds, item.id)

const isDeleted = (ds, id) => {
    const dis = ds.clients.get(id.client)
    return dis !== undefined && findIndexDS(dis, id.clock) !== null
}
const findIndexDS = (dis, clock) => {
    let left = 0
    let right = dis.length - 1
    while (left <= right) {
        const midindex = math.floor((left + right) / 2)
        const mid = dis[midindex]
        const midclock = mid.clock
        if (midclock <= clock) {
            if (clock < midclock + mid.len) {
                return midindex
            }
            left = midindex + 1
        } else {
            right = midindex - 1
        }
    }
    return null
}
export class DiffMilkdownManager extends ObservableV2<DiffMilkdownManagerEvents> {
    private doc!: Doc
    constructor(
        private collabService: CollabService,
        private user: CollabUserInfo
    ) {
        super()
    }

    init = (editorview, version, prevVersion) => {
        this.doc?.destroy()

        this.doc = new Doc()
        const doc1 = new Doc()

        const permanentUserData = new Y.PermanentUserData(this.doc)
        permanentUserData.setUserMapping(this.doc, this.doc.clientID, this.user.name)
        permanentUserData.setUserMapping(this.doc, doc1.clientID, "luoluo-test")

        const colorMapping: Map<string, ColorDef> = new Map()
        colorMapping.set(this.user.name, {light: "#ecd44433", dark: "#ecd444"})
        colorMapping.set("luoluo-test", {light: "#6eeb8333", dark: "#6eeb83"})

        // this.doc.gc = false
        const awareness = new awarenessProtocol.Awareness(this.doc)

        awareness.setLocalStateField("user", {
            userId: this.user.userId,
            name: this.user.name,
            color: this.user.color,
            heardImg: this.user.heardImg
        })
        // debugger
        this.collabService
            .bindDoc(this.doc)
            .setAwareness(awareness)
            .mergeOptions({
                ySyncOpts: {
                    permanentUserData: permanentUserData,
                    colorMapping
                }
            })
            .connect()
        if (prevVersion) {
            const encodeStateAsUpdate = Buffer.from(prevVersion.encodeStateAsUpdate, "base64")
            Y.applyUpdate(this.doc, encodeStateAsUpdate)
        }
        this.versionComparison(editorview, version, prevVersion)
    }

    versionComparison = (editorview, version, prevVersion) => {
        if (prevVersion) {
            // const prevSnapshot = Y.snapshot(this.doc)

            const update = Buffer.from(version.encodeStateAsUpdate, "base64")
            // const stateVector = Y.encodeStateVectorFromUpdate(update)

            // const diff = Y.encodeStateAsUpdate(this.doc, stateVector)

            Y.applyUpdate(this.doc, update)
            // const snapshot = Y.snapshot(this.doc)
            const prevSnapshot = Y.decodeSnapshot(Buffer.from(prevVersion.snapshot, "base64"))
            const snapshot = Y.decodeSnapshot(Buffer.from(version.snapshot, "base64"))

            // editorview.dispatch(
            //     editorview.state.tr.setMeta(ySyncPluginKey, {
            //         snapshot: snapshot,
            //         prevSnapshot: prevSnapshot
            //     })
            // )

            const binding: ProsemirrorBinding | null = ySyncPluginKey.getState(editorview.state).binding
            if (binding) {
                binding.renderSnapshot(snapshot, prevSnapshot)
            }
        } else {
            const update = Buffer.from(version.encodeStateAsUpdate, "base64")
            const prevSnapshot = Y.snapshot(this.doc)
            Y.applyUpdate(this.doc, update)
            editorview.dispatch(
                editorview.state.tr.setMeta(ySyncPluginKey, {
                    snapshot: null,
                    prevSnapshot: prevSnapshot
                })
            )
        }
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
        if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
            const stateVector = Y.encodeStateVector(doc)
            const item = [
                {
                    date: new Date().getTime(),
                    snapshot: Buffer.from(Y.encodeSnapshot(snapshot)).toString("base64"),
                    clientID: doc.clientID,
                    userName: this.user.name,
                    stateVector: Buffer.from(stateVector).toString("base64"),
                    update: Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64"),
                    // content,
                    diff: Buffer.from(Y.encodeStateAsUpdate(doc, stateVector)).toString("base64")
                }
            ]
            // console.log("setVersions-item", item, snapshot, Y.encodeSnapshot(snapshot))
            versions.push(item)
        }
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
        // console.log("state restored at snapshot", docRestored.toJSON())
    }

    renderVersion = (editorview, version, prevVersion) => {
        const prevSnapshot = prevVersion ? prevVersion?.snapshot : null
        const snapshot = Buffer.from(version.snapshot, "base64")

        // console.log("version", version, version.snapshot, snapshot, Y.decodeSnapshot(snapshot))

        const prevDecodeSnapshot =
            prevSnapshot == null ? Y.emptySnapshot : Y.decodeSnapshot(Buffer.from(prevSnapshot, "base64"))
        // console.log("prevSnapshot", prevSnapshot, prevDecodeSnapshot)
        const tr = editorview.state.tr.setMeta(ySyncPluginKey, {
            snapshot: Y.decodeSnapshot(snapshot),
            prevSnapshot: prevDecodeSnapshot
        })
        editorview.dispatch(tr)
        // console.log("editorview.state", editorview.state, editorview.state.doc.toJSON())
    }

    unrenderVersion = (editorview) => {
        // console.log(
        //     "ySyncPluginKey.getState(editorview.state)",
        //     ySyncPluginKey,
        //     ySyncPluginKey.getState(editorview.state)
        // )
        const binding = ySyncPluginKey.getState(editorview.state)?.binding
        // console.log("binding", binding, binding?.unrenderSnapshot)
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
                // console.log("versionList", versionList)
                versions.push(versionList)
            }
        } catch (error) {
            // console.log("error", error)
        }
    }

    setSession = () => {
        this.addVersion("")
        const versions = this.doc.getArray("versions")
        // console.log("setSession", versions, versions.toJSON(), versions.toArray())
        sessionStorage.setItem("versions", JSON.stringify(versions))
    }

    liveTracking = (editorview, checked) => {
        if (checked) {
            const versions: any = this.doc.getArray("versions")
            const snapshot = Buffer.from(versions.get(versions.length - 1).snapshot, "base64")
            const lastVersion = versions.length > 0 ? Y.decodeSnapshot(snapshot) : Y.emptySnapshot
            // console.log("lastVersion", lastVersion, versions, this.doc.clientID)

            editorview.dispatch(
                editorview.state.tr.setMeta(ySyncPluginKey, {
                    snapshot: null,
                    prevSnapshot: lastVersion
                })
            )
            // console.log("editorview.state", editorview.state.doc.toJSON())
        } else {
            this.unrenderVersion(editorview)
        }
    }

    getVersions = () => {
        const versions = this.doc.getArray("versions")
        return versions
    }
}
