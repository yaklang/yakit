/**
 * @module provider/websocket
 */

/* eslint-env browser */

import * as Y from "yjs" // eslint-disable-line
import * as bc from "lib0/broadcastchannel"
import * as time from "lib0/time"
import * as encoding from "lib0/encoding"
import * as decoding from "lib0/decoding"
import * as syncProtocol from "y-protocols/sync"
import * as authProtocol from "y-protocols/auth"
import * as awarenessProtocol from "y-protocols/awareness"
import * as math from "lib0/math"
import * as url from "lib0/url"
import * as env from "lib0/environment"
import {
    MessageHandlersProps,
    NotepadWsRequest,
    ObservableEvents,
    WebsocketProviderAwarenessUpdateHandler,
    WebsocketProviderBcSubscriber,
    WebsocketProviderExitHandler,
    WebsocketProviderGetSendData,
    WebsocketProviderOptions,
    WebsocketProviderUpdateHandler
} from "./WebsocketProviderType"
import {
    messageAwareness,
    messageSync,
    messageQueryAwareness,
    messageAuth,
    notepadActions,
    notepadSaveStatus
} from "./constants"
import {ObservableV2} from "lib0/observable"

/**
 *                       encoder,          decoder,          provider,          emitSynced, messageType
 * @type {Array<function(encoding.Encoder, decoding.Decoder, WebsocketProvider, boolean,    number):void>}
 */
const messageHandlers: MessageHandlersProps[] = []

messageHandlers[messageSync] = (encoder, decoder, provider, emitSynced, _messageType) => {
    encoding.writeVarUint(encoder, messageSync)
    const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, provider.doc, provider)
    if (emitSynced && syncMessageType === syncProtocol.messageYjsSyncStep2 && !provider.synced) {
        provider.synced = true
    }
}

messageHandlers[messageQueryAwareness] = (encoder, _decoder, provider, _emitSynced, _messageType) => {
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(provider.awareness, Array.from(provider.awareness.getStates().keys()))
    )
}

messageHandlers[messageAwareness] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
    awarenessProtocol.applyAwarenessUpdate(provider.awareness, decoding.readVarUint8Array(decoder), provider)
}

messageHandlers[messageAuth] = (_encoder, decoder, provider, _emitSynced, _messageType) => {
    authProtocol.readAuthMessage(decoder, provider.doc, (_ydoc, reason) => permissionDeniedHandler(provider, reason))
}

// @todo - this should depend on awareness.outdatedTime
const messageReconnectTimeout = 30000

/**
 * @param {WebsocketProvider} provider
 * @param {string} reason
 */
const permissionDeniedHandler = (provider: WebsocketProvider, reason: string) =>
    console.warn(`Permission denied to access ${provider.url}.\n${reason}`)

/**
 * @param {WebsocketProvider} provider
 * @param {Uint8Array} buf
 * @param {boolean} emitSynced
 * @return {encoding.Encoder}
 */
const readMessage = (provider: WebsocketProvider, buf: Uint8Array, emitSynced: boolean): encoding.Encoder => {
    const decoder = decoding.createDecoder(buf)
    const encoder = encoding.createEncoder()
    const messageType = decoding.readVarUint(decoder)
    const messageHandler = provider.messageHandlers[messageType]
    if (/** @type {any} */ messageHandler) {
        messageHandler(encoder, decoder, provider, emitSynced, messageType)
    } else {
        console.error("Unable to compute message")
    }
    return encoder
}

/**
 * @param {WebsocketProvider} provider
 */
const setupWS = (provider: WebsocketProvider) => {
    if (provider.shouldConnect && provider.ws === null) {
        const websocket: WebSocket = new provider._WS(provider.url, provider.protocols)
        websocket.binaryType = "arraybuffer"
        provider.ws = websocket
        provider.wsconnecting = true
        provider.wsconnected = false
        provider.synced = false
        provider.onlineUserCount = 0

        websocket.onmessage = (event) => {
            try {
                const bytes = Buffer.from(event.data).toString()
                const data: NotepadWsRequest = JSON.parse(bytes)
                const yjsParams = Buffer.from(data.yjsParams, "base64")
                provider.wsLastMessageReceived = time.getUnixTime()
                const encoder = readMessage(provider, yjsParams, true)

                if (encoding.length(encoder) > 1) {
                    const messageUint8Array = encoding.toUint8Array(encoder)
                    const value = provider?.getSendData({buf: messageUint8Array, docType: notepadActions.edit})
                    websocket.send(value)
                }
                if (!!data.params.userCount && data.params.docType === notepadActions.join) {
                    // 目前加入类型的消息会修改在线人数，用来做连接文档的初始化内容
                    provider.onlineUserCount = data.params.userCount
                }
                if (data?.params?.saveStatus) {
                    provider.emit("saveStatus", [
                        {
                            saveStatus: data.params.saveStatus
                        }
                    ])
                }
            } catch (error) {}
        }
        websocket.onerror = (event) => {
            provider.emit("connection-error", [event, provider])
        }
        websocket.onclose = (event) => {
            closeWebsocketConnection(provider, websocket, event)
        }
        websocket.onopen = () => {
            provider.wsLastMessageReceived = time.getUnixTime()
            provider.wsconnecting = false
            provider.wsconnected = true
            provider.wsUnsuccessfulReconnects = 0
            provider.emit("status", [
                {
                    status: "connected"
                }
            ])
            // always send sync step 1 when connected
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageSync)
            syncProtocol.writeSyncStep1(encoder, provider.doc)
            const encoderUint8Array = encoding.toUint8Array(encoder)
            websocket.send(provider?.getSendData({buf: encoderUint8Array, docType: notepadActions.join}))

            // broadcast local awareness state
            if (provider.awareness.getLocalState() !== null) {
                const encoderAwarenessState = encoding.createEncoder()
                encoding.writeVarUint(encoderAwarenessState, messageAwareness)
                encoding.writeVarUint8Array(
                    encoderAwarenessState,
                    awarenessProtocol.encodeAwarenessUpdate(provider.awareness, [provider.doc.clientID])
                )
                const encoderAwarenessStateUint8Array = encoding.toUint8Array(encoderAwarenessState)
                websocket.send(
                    provider?.getSendData({buf: encoderAwarenessStateUint8Array, docType: notepadActions.edit})
                )
            }
        }
        provider.emit("status", [
            {
                status: "connecting"
            }
        ])
    }
}

/**
 * Outsource this function so that a new websocket connection is created immediately.
 * I suspect that the `ws.onclose` event is not always fired if there are network issues.
 *
 * @param {WebsocketProvider} provider
 * @param {WebSocket} ws
 * @param {CloseEvent} event
 */
const closeWebsocketConnection = (provider: WebsocketProvider, ws: WebSocket, event?: CloseEvent) => {
    if (ws === provider.ws) {
        if (event) provider.emit("connection-close", [event, provider])
        provider.ws = null
        provider.wsconnecting = false
        if (provider.wsconnected) {
            provider.wsconnected = false
            provider.synced = false
            provider.onlineUserCount = 0
            // update awareness (all users except local left)
            awarenessProtocol.removeAwarenessStates(
                provider.awareness,
                //@ts-ignore
                Array.from(provider.awareness.getStates().keys()).filter((client) => client !== provider.doc.clientID),
                provider
            )
            provider.emit("status", [
                {
                    status: "disconnected"
                }
            ])
        } else {
            provider.wsUnsuccessfulReconnects++
        }
        const code = event?.code || 0
        switch (code) {
            // event为undefined;
            // 1.发送notepadActions.leave，主动断开，不重连，等待后端返回200后关闭ws
            case 0:
                break
            case 401:
            case 403:
            case 404:
            case 200: // 发送notepadActions.leave，后端会给200,正常关闭
            case 209:
            case 500:
                ws.close()
                break
            default:
                // Start with no reconnect timeout and increase timeout by
                // using exponential backoff starting with 100ms
                setTimeout(
                    setupWS,
                    math.min(math.pow(2, provider.wsUnsuccessfulReconnects) * 100, provider.maxBackoffTime),
                    provider
                )
                break
        }
    }
}

/**
 * @param {WebsocketProvider} provider
 * @param {ArrayBuffer} buf
 */
const broadcastMessage = (provider, buf) => {
    const ws = provider.ws
    if (provider.wsconnected && ws && ws.readyState === ws.OPEN) {
        ws.send(provider?.getSendData({buf, docType: notepadActions.edit}))
    }
    if (provider.bcconnected) {
        bc.publish(provider.bcChannel, buf, provider)
    }
}

/**
 * Websocket Provider for Yjs. Creates a websocket connection to sync the shared document.
 * The document name is attached to the provided url. I.e. the following example
 * creates a websocket connection to http://localhost:1234/my-document-name
 *
 * @example
 *   import * as Y from 'yjs'
 *   import { WebsocketProvider } from './WebsocketProvider'
 *   const doc = new Y.Doc()
 *   const provider = new WebsocketProvider('http://localhost:1234', 'my-document-name', doc)
 *
 * @extends {ObservableV2<string>}
 */
export class WebsocketProvider extends ObservableV2<ObservableEvents> {
    /**
     * @param {string} serverUrl
     * @param {string} room
     * @param {Y.Doc} doc
     * @param {object} opts
     * @param {boolean} [opts.connect]
     * @param {awarenessProtocol.Awareness} [opts.awareness]
     * @param {Object<string,string>} [opts.params] specify url parameters
     * @param {Array<string>} [opts.protocols] specify websocket protocols
     * @param {typeof WebSocket} [opts.WebSocketPolyfill] Optionall provide a WebSocket polyfill
     * @param {number} [opts.resyncInterval] Request server state every `resyncInterval` milliseconds
     * @param {number} [opts.maxBackoffTime] Maximum amount of time to wait before trying to reconnect (we try to reconnect using exponential backoff)
     * @param {boolean} [opts.disableBc] Disable cross-tab BroadcastChannel communication
     */

    public awareness: awarenessProtocol.Awareness
    public messageHandlers: MessageHandlersProps[]
    /**
     * @type {WebSocket?}
     */
    public ws: WebSocket | null
    public doc: Y.Doc
    public wsUnsuccessfulReconnects: number
    public wsconnected: boolean
    public wsconnecting: boolean
    /**
     * @type {boolean}
     */
    public _synced: boolean
    public wsLastMessageReceived: number
    public _onlineUserCount: number

    public serverUrl: string
    public bcChannel: string
    public maxBackoffTime: number
    /**
     * The specified url parameters. This can be safely updated. The changed parameters will be used
     * when a new connection is established.
     * @type {Object<string,string>}
     */
    public params: {[key: string]: string}
    /**send */
    public data?: NotepadWsRequest
    public protocols: string[]
    public _WS: typeof WebSocket

    public bcconnected: boolean
    public disableBc: boolean

    /**
     * Whether to connect to other peers or not
     * @type {boolean}
     */
    public shouldConnect: boolean

    public getSendData: WebsocketProviderGetSendData

    /**
     * @type {number}
     */
    private _resyncInterval: NodeJS.Timeout | number
    private _bcSubscriber: WebsocketProviderBcSubscriber
    private _updateHandler: WebsocketProviderUpdateHandler
    private _awarenessUpdateHandler: WebsocketProviderAwarenessUpdateHandler
    private _exitHandler: WebsocketProviderExitHandler
    private _checkInterval: NodeJS.Timeout | number

    constructor(serverUrl: string, room: string, doc: Y.Doc, options: WebsocketProviderOptions = {}) {
        super()
        // Destructure options and assign default values
        const {
            connect = true,
            awareness = new awarenessProtocol.Awareness(doc),
            params = {},
            protocols = [],
            WebSocketPolyfill = WebSocket,
            resyncInterval = -1,
            maxBackoffTime = 2500,
            disableBc = false,
            data
        } = options
        // ensure that url is always ends with /
        while (serverUrl[serverUrl.length - 1] === "/") {
            serverUrl = serverUrl.slice(0, serverUrl.length - 1)
        }
        this.serverUrl = serverUrl
        this.bcChannel = serverUrl + "/" + room
        this.maxBackoffTime = maxBackoffTime

        this.params = params
        this.data = data
        this.protocols = protocols
        this.doc = doc
        this._WS = WebSocketPolyfill
        this.awareness = awareness
        this.wsconnected = false
        this.wsconnecting = false
        this.bcconnected = false
        this.disableBc = disableBc
        this.wsUnsuccessfulReconnects = 0
        this.messageHandlers = messageHandlers.slice()

        this._synced = false
        this._onlineUserCount = 0

        this.ws = null
        this.wsLastMessageReceived = 0

        this.shouldConnect = connect

        this._resyncInterval = 0
        if (resyncInterval > 0) {
            this._resyncInterval = setInterval(() => {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    // resend sync step 1
                    const encoder = encoding.createEncoder()
                    encoding.writeVarUint(encoder, messageSync)
                    syncProtocol.writeSyncStep1(encoder, doc)
                    const resyncUint8Array = encoding.toUint8Array(encoder)
                    this.ws.send(this.getSendData({buf: resyncUint8Array, docType: notepadActions.join}))
                }
            }, resyncInterval)
        }
        /**
         * @description content一直为空，只发送操作，后端不会存历史
         * @param {ArrayBuffer|undefined} buf
         * @param {NotepadActionType} docType
         */
        this.getSendData = (sendData) => {
            if (!this.data) return Buffer.from("")
            const {messageType, token, params, notepadHash} = this.data
            const {buf, docType} = sendData
            try {
                const value: NotepadWsRequest = {
                    messageType,
                    notepadHash,
                    params: {
                        content: "",
                        title: "",
                        docType,
                        saveStatus: notepadSaveStatus.saveProgress,
                        userName: params.userName
                    },
                    yjsParams: buf ? Buffer.from(buf).toString("base64") : "",
                    token
                }
                const jsonString = JSON.stringify(value)
                const finalArrayBuffer = Buffer.from(jsonString)
                return finalArrayBuffer
            } catch (error) {
                return Buffer.from("")
            }
        }

        /**
         * @param {ArrayBuffer} data
         * @param {any} origin
         */
        this._bcSubscriber = (data: ArrayBuffer, origin: any) => {
            if (origin !== this) {
                const encoder = readMessage(this, new Uint8Array(data), false)
                if (encoding.length(encoder) > 1) {
                    bc.publish(this.bcChannel, encoding.toUint8Array(encoder), this)
                }
            }
        }
        /**
         * Listens to Yjs updates and sends them to remote peers (ws and broadcastchannel)
         * @param {Uint8Array} update
         * @param {any} origin
         */
        this._updateHandler = (update: Uint8Array, origin: any, ydoc: Y.Doc, tr: Y.Transaction) => {
            if (origin !== this) {
                const encoder = encoding.createEncoder()
                encoding.writeVarUint(encoder, messageSync)
                syncProtocol.writeUpdate(encoder, update)
                broadcastMessage(this, encoding.toUint8Array(encoder))
            }
        }
        this.doc.on("update", this._updateHandler)
        /**
         * @param {added: number[]; updated: number[]; removed: number[]} changed
         * @param {any} _origin
         */
        this._awarenessUpdateHandler = ({added, updated, removed}, _origin) => {
            const changedClients = added.concat(updated).concat(removed)
            const encoder = encoding.createEncoder()
            encoding.writeVarUint(encoder, messageAwareness)
            encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients))
            broadcastMessage(this, encoding.toUint8Array(encoder))
        }
        this._exitHandler = () => {
            awarenessProtocol.removeAwarenessStates(this.awareness, [doc.clientID], "app closed")
        }
        if (env.isNode && typeof process !== "undefined") {
            process.on("exit", this._exitHandler)
        }
        awareness.on("update", this._awarenessUpdateHandler)
        this._checkInterval = setInterval(() => {
            if (this.wsconnected && messageReconnectTimeout < time.getUnixTime() - this.wsLastMessageReceived) {
                // no message received in a long time - not even your own awareness
                // updates (which are updated every 15 seconds)
                if (this.ws) closeWebsocketConnection(this, /** @type {WebSocket} */ this.ws)
            }
        }, messageReconnectTimeout / 10)
        if (connect) {
            this.connect()
        }
    }

    get url() {
        const encodedParams = url.encodeQueryParams(this.params)
        return this.serverUrl + "/" + (encodedParams.length === 0 ? "" : "?" + encodedParams)
    }
    /**
     * @type {boolean}
     */
    get synced() {
        return this._synced
    }

    set synced(state) {
        if (this._synced !== state) {
            this._synced = state
            this.emit("synced", [state])
            this.emit("sync", [state])
        }
    }
    /**
     * @type {number}
     */
    get onlineUserCount() {
        return this._onlineUserCount
    }

    set onlineUserCount(count) {
        if (this._onlineUserCount !== count) {
            this._onlineUserCount = count
            this.emit("online-user-count", [count])
        }
    }

    destroy(): void {
        if (this._resyncInterval !== 0) {
            clearInterval(this._resyncInterval)
        }
        clearInterval(this._checkInterval)
        this.disconnect()
        if (env.isNode && typeof process !== "undefined") {
            process.off("exit", this._exitHandler)
        }
        this.awareness.off("update", this._awarenessUpdateHandler)
        this.doc.off("update", this._updateHandler)
        super.destroy()
    }

    connectBc(): void {
        if (this.disableBc) {
            return
        }
        if (!this.bcconnected) {
            bc.subscribe(this.bcChannel, this._bcSubscriber)
            this.bcconnected = true
        }
        // send sync step1 to bc
        // write sync step 1
        const encoderSync = encoding.createEncoder()
        encoding.writeVarUint(encoderSync, messageSync)
        syncProtocol.writeSyncStep1(encoderSync, this.doc)
        bc.publish(this.bcChannel, encoding.toUint8Array(encoderSync), this)
        // broadcast local state
        const encoderState = encoding.createEncoder()
        encoding.writeVarUint(encoderState, messageSync)
        syncProtocol.writeSyncStep2(encoderState, this.doc)
        bc.publish(this.bcChannel, encoding.toUint8Array(encoderState), this)
        // write queryAwareness
        const encoderAwarenessQuery = encoding.createEncoder()
        encoding.writeVarUint(encoderAwarenessQuery, messageQueryAwareness)
        bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessQuery), this)
        // broadcast local awareness state
        const encoderAwarenessState = encoding.createEncoder()
        encoding.writeVarUint(encoderAwarenessState, messageAwareness)
        encoding.writeVarUint8Array(
            encoderAwarenessState,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
        )
        bc.publish(this.bcChannel, encoding.toUint8Array(encoderAwarenessState), this)
    }

    disconnectBc(): void {
        // broadcast message with local awareness state set to null (indicating disconnect)
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, messageAwareness)
        encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID], new Map())
        )
        broadcastMessage(this, encoding.toUint8Array(encoder))
        if (this.bcconnected) {
            bc.unsubscribe(this.bcChannel, this._bcSubscriber)
            this.bcconnected = false
        }
    }

    disconnect(): void {
        this.shouldConnect = false
        this.disconnectBc()
        if (!!this.ws && this.ws?.readyState === WebSocket.OPEN) {
            const value = this.getSendData({buf: new Uint8Array(), docType: notepadActions.leave})
            this.ws?.send(value)
            closeWebsocketConnection(this, this.ws)
        }
    }

    connect(): void {
        this.shouldConnect = true
        if (!this.wsconnected && this.ws === null) {
            setupWS(this)
            this.connectBc()
        }
    }
}
