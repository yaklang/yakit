const {contextBridge, ipcRenderer, IpcRendererEvent} = require("electron")

/**
 * @typedef {Object} Display - 显示窗口的相关信息
 * @property {number} x - 显示窗口的原点中x坐标
 * @property {number} y - 显示窗口的原点中y坐标
 * @property {number} width - 显示窗口的宽
 * @property {number} height - 显示窗口的高
 * @property {number} id - 与显示相关联的唯一的标志符
 * @property {number} scaleFactor - 输出设备的像素比例因子
 */

/**
 * @typedef {Object} Bounds - 显示窗口的界限信息
 * @property {number} x - 显示窗口的原点中x坐标
 * @property {number} y - 显示窗口的原点中y坐标
 * @property {number} width - 显示窗口的宽
 * @property {number} height - 显示窗口的高
 */

/**
 * @typedef {Object} ScreenshotsData - 显示窗口的对应坐标信息
 * @property {Bounds} bounds - 显示窗口的原点中x坐标
 * @property {Display} display - 显示窗口的原点中y坐标
 */

const map = new Map()

contextBridge.exposeInMainWorld("screenshots", {
    ready: () => {
        ipcRenderer.send("SCREENSHOTS:ready")
    },
    reset: () => {
        ipcRenderer.send("SCREENSHOTS:reset")
    },
    /**
     * @param {ArrayBuffer} arrayBuffer
     * @param {ScreenshotsData} data
     */
    save: (arrayBuffer, data) => {
        ipcRenderer.send("SCREENSHOTS:save", Buffer.from(arrayBuffer), data)
    },
    cancel: () => {
        ipcRenderer.send("SCREENSHOTS:cancel")
    },
    /**
     * @param {ArrayBuffer} arrayBuffer
     * @param {ScreenshotsData} data
     */
    ok: (arrayBuffer, data) => {
        ipcRenderer.send("SCREENSHOTS:ok", Buffer.from(arrayBuffer), data)
    },
    /**
     * @param {string} channel
     * @param {() => void} fn
     */
    on: (channel, fn) => {
        /** @param {IpcRendererEvent} event */
        const listener = (event, ...args) => {
            fn(...args)
        }

        const listeners = map.get(fn) ?? {}
        listeners[channel] = listener
        map.set(fn, listeners)

        ipcRenderer.on(`SCREENSHOTS:${channel}`, listener)
    },
    /**
     * @param {string} channel
     * @param {() => void} fn
     */
    off: (channel, fn) => {
        const listeners = map.get(fn) ?? {}
        const listener = listeners[channel]
        delete listeners[channel]

        if (!listener) {
            return
        }

        ipcRenderer.off(`SCREENSHOTS:${channel}`, listener)
    }
})
