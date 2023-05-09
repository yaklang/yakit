const {BrowserView, BrowserWindow, clipboard, desktopCapturer, dialog, ipcMain, nativeImage} = require("electron")
const Events = require("events")
const fs = require("fs-extra")
const Event = require("./event")
const getDisplay = require("./getDisplay")
const padStart = require("./padStart")
const path = require("path")
const {NodeScreenshots} = require("./nodeScreenshots")

/**
 * @typedef {Object} Display - 窗口坐标和宽高相关信息
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
/**
 * @typedef {Object} Lang - 坐标展示前缀,截图功能按钮title提示信息
 * @property {string} magnifier_position_label - 坐标信息展示前缀
 * @property {string} operation_ok_title - OK按钮的title
 * @property {string} operation_cancel_title - Cancel按钮的title
 * @property {string} operation_save_title - Save按钮的title
 * @property {string} operation_redo_title - 回复撤销按钮的title
 * @property {string} operation_undo_title - 撤销按钮的title
 * @property {string} operation_mosaic_title - 马赛克按钮的title
 * @property {string} operation_text_title - 文字按钮的title
 * @property {string} operation_brush_title - 画笔按钮的title
 * @property {string} operation_arrow_title - 箭头按钮的title
 * @property {string} operation_ellipse_title - 圆形按钮的title
 * @property {string} operation_rectangle_title - 矩形按钮的title
 */
/**
 * @typedef {Object} ScreenshotsOpts - 截图功能初始化可配置信息
 * @property {Lang} lang - 坐标展示前缀,截图功能按钮title提示信息
 * @property {boolean} singleWindow - Cancel按钮的title
 * @property {boolean} isShowLog - 是否在终端打印截图功能日志
 */

class Screenshots extends Events {
    /**
     * @name 截图窗口对象
     * @type {BrowserWindow | null}
     */
    $win = null

    /** @type {BrowserWindow} */
    $view = new BrowserView({
        webPreferences: {
            preload: require.resolve("./preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        }
    })
    // 日志打印方法
    logger = (...args) => {
        const content = []
        for (let item of args) {
            let str = ""
            try {
                str = JSON.stringify(item)
            } catch (err) {
                str = ""
            }
            content.push(str)
        }
        console.log(`SCREENSHOTS-log: ${content.join(" ")}`)
    }

    /** @type {boolean} */
    singleWindow

    /** @type {Promise} */
    isReady = new Promise((resolve) => {
        ipcMain.once("SCREENSHOTS:ready", () => {
            this.logger("SCREENSHOTS:ready")

            resolve()
        })
    })

    /** @param {ScreenshotsOpts} opts */
    constructor(opts) {
        super()
        this.logger = !!opts.isShowLog ? this.logger : () => {}
        this.singleWindow = opts?.singleWindow || false
        this.listenIpc()
        this.$view.webContents.loadFile(path.resolve(__dirname, "../../renderer/electron/electron.html"))
        if (opts?.lang) {
            this.setLang(opts.lang)
        }
    }

    /**
     * 开始截图
     * @return {Promise}
     */
    async startCapture() {
        this.logger("startCapture")

        const display = getDisplay()

        const [imageUrl] = await Promise.all([this.capture(display), this.isReady])

        await this.createWindow(display)

        this.$view.webContents.send("SCREENSHOTS:capture", display, imageUrl)
    }

    /**
     * 结束截图
     */
    async endCapture() {
        this.logger("endCapture")
        await this.reset()

        if (!this.$win) {
            return
        }

        // 先清除 Kiosk 模式，然后取消全屏才有效
        this.$win.setKiosk(false)
        this.$win.blur()
        this.$win.blurWebView()
        this.$win.unmaximize()
        this.$win.removeBrowserView(this.$view)

        if (this.singleWindow) {
            this.$win.hide()
        } else {
            this.$win.destroy()
        }
    }

    /**
     * 设置语言
     */
    async setLang(lang) {
        this.logger("setLang", lang)

        await this.isReady

        this.$view.webContents.send("SCREENSHOTS:setLang", lang)
    }

    async reset() {
        // 重置截图区域
        this.$view.webContents.send("SCREENSHOTS:reset")

        // 保证 UI 有足够的时间渲染
        await Promise.race([
            new Promise((resolve) => {
                setTimeout(() => resolve(), 500)
            }),
            new Promise((resolve) => {
                ipcMain.once("SCREENSHOTS:reset", () => resolve())
            })
        ])
    }

    /**
     * 初始化窗口
     * @param {Display} display
     * @return {Promise}
     */
    async createWindow(display) {
        // 重置截图区域
        await this.reset()

        // 复用未销毁的窗口
        if (!this.$win || this.$win?.isDestroyed?.()) {
            const systemType = {
                darwin: "panel",
                win32: "toolbar"
            }

            this.$win = new BrowserWindow({
                title: "screenshots",
                x: display.x,
                y: display.y,
                width: display.width,
                height: display.height,
                useContentSize: true,
                type: systemType[process.platform],
                frame: false,
                show: false,
                autoHideMenuBar: true,
                transparent: true,
                resizable: false,
                movable: false,
                minimizable: false,
                maximizable: false,
                // focusable 必须设置为 true, 否则窗口不能及时响应esc按键，输入框也不能输入
                focusable: true,
                skipTaskbar: true,
                alwaysOnTop: true,
                fullscreen: false,
                fullscreenable: false,
                kiosk: true,
                backgroundColor: "#31343f4d",
                titleBarStyle: "hidden",
                hasShadow: false,
                paintWhenInitiallyHidden: false,
                // mac 特有的属性
                roundedCorners: false,
                enableLargerThanScreen: false,
                acceptFirstMouse: true
            })

            this.$win.on("show", () => {
                this.$win?.focus()
                this.$win?.setKiosk(true)
            })

            this.$win.on("closed", () => {
                this.$win = null
            })
        }

        this.$win.setBrowserView(this.$view)

        // 适定平台
        if (process.platform === "darwin") {
            this.$win.setWindowButtonVisibility(false)
        }

        if (process.platform !== "win32") {
            this.$win.setVisibleOnAllWorkspaces(true, {
                visibleOnFullScreen: true,
                skipTransformProcessType: true
            })
        }

        this.$win.blur()
        this.$win.setBounds(display)
        this.$view.setBounds({
            x: 0,
            y: 0,
            width: display.width,
            height: display.height
        })
        this.$win.setAlwaysOnTop(true)
        this.$win.show()
    }

    /**
     * @param {Display} display
     * @returns {Promise}
     */
    async capture(display) {
        this.logger("SCREENSHOTS:capture")

        try {
            /**
             * 有些小问题：
             * 1、在某些windows系统的多屏下，electorn获取的屏幕信息里，
             *    x-y坐标数据有问题，导致无法使用截图库正确截取目标屏幕图片(出现场景-多屏并且屏幕分辨率和缩放比都不一样且都不为100%的时候)
             */
            const capturer = NodeScreenshots.fromPoint(display.x + display.width / 2, display.y + display.height / 2)
            this.logger("SCREENSHOTS:capture NodeScreenshots.fromPoint arguments", display)
            this.logger(
                "SCREENSHOTS:capture NodeScreenshots.fromPoint return",
                capturer
                    ? {
                          id: capturer.id,
                          x: capturer.x,
                          y: capturer.y,
                          width: capturer.width,
                          height: capturer.height,
                          rotation: capturer.rotation,
                          scaleFactor: capturer.scaleFactor,
                          isPrimary: capturer.isPrimary
                      }
                    : null
            )

            if (!capturer) {
                throw new Error(`NodeScreenshots.fromDisplay(${display.id}) get null`)
            }

            const image = await capturer.capture()
            return `data:image/png;base64,${image.toString("base64")}`
        } catch (err) {
            this.logger("SCREENSHOTS:capture NodeScreenshots capture() error %o", err)

            const sources = await desktopCapturer.getSources({
                types: ["screen"],
                thumbnailSize: {
                    width: display.width * display.scaleFactor,
                    height: display.height * display.scaleFactor
                }
            })

            let source
            // Linux系统上，screen.getDisplayNearestPoint 返回的 Display 对象的 id
            // 和这里 source 对象上的 display_id(Linux上，这个值是空字符串) 或 id 的中间部分，都不一致
            // 但是，如果只有一个显示器的话，其实不用判断，直接返回就行
            if (sources.length === 1) {
                source = sources[0]
            } else {
                source = sources.find(
                    (item) => item.display_id === display.id.toString() || item.id.startsWith(`screen:${display.id}:`)
                )
            }

            if (!source) {
                this.logger("SCREENSHOTS:capture Can't find screen source. sources: %o, display: %o", sources, display)
                throw new Error("Can't find screen source")
            }

            return source.thumbnail.toDataURL()
        }
    }

    /**
     * 绑定ipc时间处理
     */
    listenIpc() {
        /**
         * OK事件
         * @param {Buffer} buffer
         * @param {ScreenshotsData} data
         */
        ipcMain.on("SCREENSHOTS:ok", (e, buffer, data) => {
            this.logger("SCREENSHOTS:ok buffer.length %d, data: %o", buffer.length, data)

            const event = new Event()
            this.emit("ok", event, buffer, data)
            if (event.defaultPrevented) {
                return
            }
            clipboard.writeImage(nativeImage.createFromBuffer(buffer))
            this.endCapture()
        })
        // CANCEL事件
        ipcMain.on("SCREENSHOTS:cancel", () => {
            this.logger("SCREENSHOTS:cancel")

            const event = new Event()
            this.emit("cancel", event)
            if (event.defaultPrevented) {
                return
            }
            this.endCapture()
        })

        /**
         * SAVE事件
         * @param {Buffer} buffer
         * @param {ScreenshotsData} data
         */
        ipcMain.on("SCREENSHOTS:save", async (e, buffer, data) => {
            this.logger("SCREENSHOTS:save buffer.length %d, data: %o", buffer.length, data)

            const event = new Event()
            this.emit("save", event, buffer, data)
            if (event.defaultPrevented || !this.$win) {
                return
            }

            const time = new Date()
            const year = time.getFullYear()
            const month = padStart(time.getMonth() + 1, 2, "0")
            const date = padStart(time.getDate(), 2, "0")
            const hours = padStart(time.getHours(), 2, "0")
            const minutes = padStart(time.getMinutes(), 2, "0")
            const seconds = padStart(time.getSeconds(), 2, "0")
            const milliseconds = padStart(time.getMilliseconds(), 3, "0")

            this.$win.setAlwaysOnTop(false)

            const {canceled, filePath} = await dialog.showSaveDialog(this.$win, {
                defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`,
                filters: [
                    {name: "Image (png)", extensions: ["png"]},
                    {name: "All Files", extensions: ["*"]}
                ]
            })

            if (!this.$win) {
                return
            }
            this.$win.setAlwaysOnTop(true)
            if (canceled || !filePath) {
                return
            }

            await fs.writeFile(filePath, buffer)
            this.endCapture()
        })
    }
}

module.exports = Screenshots
