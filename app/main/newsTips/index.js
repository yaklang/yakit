// const {BrowserView, BrowserWindow, ipcMain} = require("electron")
// const getDisplay = require("../screenshots/getDisplay")
// const path = require("path")

// /**
//  * @typedef {Object} Display - 窗口坐标和宽高相关信息
//  * @property {number} x - 显示窗口的原点中x坐标
//  * @property {number} y - 显示窗口的原点中y坐标
//  * @property {number} width - 显示窗口的宽
//  * @property {number} height - 显示窗口的高
//  * @property {number} id - 与显示相关联的唯一的标志符
//  * @property {number} scaleFactor - 输出设备的像素比例因子
//  */
// /**
//  * @typedef {Object} Bounds - 显示窗口的界限信息
//  * @property {number} x - 显示窗口的原点中x坐标
//  * @property {number} y - 显示窗口的原点中y坐标
//  * @property {number} width - 显示窗口的宽
//  * @property {number} height - 显示窗口的高
//  */
// /**
//  * @typedef {Object} ScreenshotsData - 显示窗口的对应坐标信息
//  * @property {Bounds} bounds - 显示窗口的原点中x坐标
//  * @property {Display} display - 显示窗口的原点中y坐标
//  */
// /**
//  * @typedef {Object} Lang - 坐标展示前缀,截图功能按钮title提示信息
//  * @property {string} magnifier_position_label - 坐标信息展示前缀
//  * @property {string} operation_ok_title - OK按钮的title
//  * @property {string} operation_cancel_title - Cancel按钮的title
//  * @property {string} operation_save_title - Save按钮的title
//  * @property {string} operation_redo_title - 回复撤销按钮的title
//  * @property {string} operation_undo_title - 撤销按钮的title
//  * @property {string} operation_mosaic_title - 马赛克按钮的title
//  * @property {string} operation_text_title - 文字按钮的title
//  * @property {string} operation_brush_title - 画笔按钮的title
//  * @property {string} operation_arrow_title - 箭头按钮的title
//  * @property {string} operation_ellipse_title - 圆形按钮的title
//  * @property {string} operation_rectangle_title - 矩形按钮的title
//  */
// /**
//  * @typedef {Object} ScreenshotsOpts - 截图功能初始化可配置信息
//  * @property {Lang} lang - 坐标展示前缀,截图功能按钮title提示信息
//  * @property {boolean} singleWindow - Cancel按钮的title
//  * @property {boolean} isShowLog - 是否在终端打印截图功能日志
//  */

// class NewsTips {
//     /**
//      * @name 截图窗口对象
//      * @type {BrowserWindow | null}
//      */
//     $win = null

//     /** @type {BrowserWindow} */
//     $view = new BrowserView({
//         webPreferences: {
//             preload: require.resolve("./preload.js"),
//             nodeIntegration: false,
//             contextIsolation: true
//         }
//     })
//     // 日志打印方法
//     logger = (...args) => {
//         const content = []
//         for (let item of args) {
//             let str = ""
//             try {
//                 str = JSON.stringify(item)
//             } catch (err) {
//                 str = ""
//             }
//             content.push(str)
//         }
//         console.log(`SCREENSHOTS-log: ${content.join(" ")}`)
//     }

//     /** @type {boolean} */
//     singleWindow

//     /** @type {Promise} */
//     isReady = new Promise((resolve) => {
//         ipcMain.once("SCREENSHOTS:ready", () => {
//             this.logger("SCREENSHOTS:ready")

//             resolve()
//         })
//     })

//     /** @param {ScreenshotsOpts} opts */
//     constructor(opts) {
//         super()
//         this.logger = !!opts.isShowLog ? this.logger : () => {}
//         this.singleWindow = opts?.singleWindow || false
//         this.$view.webContents.loadFile(path.resolve(__dirname, "../../renderer/electron/electron.html"))
//     }

//     /**
//      * 开始截图
//      * @return {Promise}
//      */
//     async startCapture() {
//         this.logger("startCapture")

//         const display = getDisplay()

//         const [imageUrl] = await Promise.all([this.capture(display), this.isReady])

//         await this.createWindow(display)

//         this.$view.webContents.send("SCREENSHOTS:capture", display, imageUrl)
//     }

//     /**
//      * 结束消息提示
//      */
//     async endCapture() {
//         this.logger("endNewsTips")
//         await this.reset()

//         if (!this.$win) {
//             return
//         }

//         // 先清除 Kiosk 模式，然后取消全屏才有效
//         this.$win.setKiosk(false)
//         this.$win.setSimpleFullScreen(false)
//         this.$win.blur()
//         this.$win.blurWebView()
//         this.$win.removeBrowserView(this.$view)

//         if (this.singleWindow) {
//             this.$win.hide()
//         } else {
//             this.$win.destroy()
//         }
//     }

//     async reset() {
//         // 重置消息提示区域
//         this.$view.webContents.send("SCREENSHOTS:reset")

//         // 保证 UI 有足够的时间渲染
//         await Promise.race([
//             new Promise((resolve) => {
//                 setTimeout(() => resolve(), 500)
//             }),
//             new Promise((resolve) => {
//                 ipcMain.once("SCREENSHOTS:reset", () => resolve())
//             })
//         ])
//     }

//     /**
//      * 初始化窗口
//      * @param {Display} display
//      * @return {Promise}
//      */
//     async createWindow(display) {
//         // 重置提示信息区域
//         await this.reset()

//         // 复用未销毁的窗口
//         if (!this.$win || this.$win?.isDestroyed?.()) {
//             this.$win = new BrowserWindow({
//                 title: "newstips",
//                 x: display.width / 2 - 110,
//                 y: 120,
//                 width: 220,
//                 height: 60,
//                 useContentSize: true,
//                 frame: false,
//                 show: false,
//                 autoHideMenuBar: true,
//                 transparent: true,
//                 resizable: false,
//                 movable: false,
//                 // focusable 必须设置为 true, 否则窗口不能及时响应esc按键，输入框也不能输入
//                 focusable: true,
//                 fullscreenable: false,
//                 // 设为true 防止mac新开一个桌面，影响效果
//                 simpleFullscreen: false,
//                 backgroundColor: "#31343fcc",
//                 titleBarStyle: "hidden",
//                 alwaysOnTop: true,
//                 enableLargerThanScreen: true,
//                 skipTaskbar: true,
//                 hasShadow: false,
//                 paintWhenInitiallyHidden: false,
//                 acceptFirstMouse: true
//             })

//             this.$win.on("show", () => {
//                 this.$win?.focus()
//                 this.$win?.setKiosk(process.platform !== "darwin")
//             })

//             this.$win.on("closed", () => {
//                 this.$win = null
//             })
//         }

//         this.$win.setBrowserView(this.$view)

//         // 适定平台
//         if (process.platform === "darwin") {
//             this.$win.setWindowButtonVisibility(false)
//         }

//         if (process.platform !== "win32") {
//             this.$win.setVisibleOnAllWorkspaces(true, {
//                 visibleOnFullScreen: true,
//                 skipTransformProcessType: true
//             })
//         }

//         this.$win.blur()
//         this.$win.setKiosk(false)

//         if (process.platform === "darwin") {
//             this.$win.setSimpleFullScreen(true)
//         }

//         this.$win.setBounds(display)
//         this.$view.setBounds({
//             x: display.width / 2 - 110,
//             y: 120,
//             width: 220,
//             height: 60
//         })
//         this.$win.setAlwaysOnTop(true)
//         this.$win.show()
//     }
// }

// module.exports = NewsTips
