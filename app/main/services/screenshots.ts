import { randomUUID } from 'node:crypto'
import { registerRenderer, registerMainMethod } from '../ipc/index'
import { sendEvent } from '../ipc/events'
import { preloadPath, rendererPath } from '../paths'
import { screen, BrowserView, BrowserWindow, clipboard, desktopCapturer, dialog, nativeImage } from 'electron'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
class Event {
  defaultPrevented = false

  preventDefault() {
    this.defaultPrevented = true
  }
}

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
 * @return {Display}
 */
const getDisplay = () => {
  const point = screen.getCursorScreenPoint()
  const { id, bounds, scaleFactor } = screen.getDisplayNearestPoint(point)

  return {
    id,
    x: Math.floor(bounds.x),
    y: Math.floor(bounds.y),
    width: Math.floor(bounds.width),
    height: Math.floor(bounds.height),
    scaleFactor,
  }
}

/**
 * 如果string字符串长度小于 length 则在左侧填充字符
 * 如果超出length长度则截断超出的部分。
 * @param {unknown} string
 * @param {number} length
 * @param {string} chars
 * @returns {string}
 */
function padStart(string: unknown, length = 0, chars = ' ') {
  let str = String(string)
  while (str.length < length) {
    str = `${chars}${str}`
  }
  return str
}

import { NodeScreenshots } from './screenshotNative'

type Display = ReturnType<typeof getDisplay>
interface ScreenshotData {
  bounds: { x: number; y: number; width: number; height: number }
  display: Display
}
interface ScreenshotsOpts {
  lang?: Record<string, string>
  singleWindow?: boolean
  isShowLog?: boolean
}

class Screenshots extends EventEmitter {
  /**
   * @name 截图窗口对象
   * @type {BrowserWindow | null}
   */
  $win: BrowserWindow | null = null

  /** @type {BrowserWindow} */
  $view = new BrowserView({
    webPreferences: {
      preload: preloadPath('screenshots'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  // 日志打印方法
  logger = (...args: unknown[]) => {
    const content = []
    for (let item of args) {
      let str = ''
      try {
        str = JSON.stringify(item)
      } catch (err) {
        str = ''
      }
      content.push(str)
    }
    console.log(`SCREENSHOTS-log: ${content.join(' ')}`)
  }

  /** @type {boolean} */
  singleWindow: boolean

  /** @type {Promise} */
  private resolveReady!: () => void
  private readonly resetWaiters = new Map<string, () => void>()
  isReady = new Promise<void>((resolve) => {
    this.resolveReady = resolve
  })

  /** @param {ScreenshotsOpts} opts */
  constructor(opts: ScreenshotsOpts = {}) {
    super()
    registerRenderer(this.$view.webContents, 'screenshots')
    this.logger = !!opts.isShowLog ? this.logger : () => {}
    this.singleWindow = opts?.singleWindow || false
    this.registerMethods()
    this.$view.webContents.loadFile(rendererPath('screenshots'))
    if (opts?.lang) {
      this.setLang(opts.lang)
    }
  }

  /**
   * 开始截图
   * @return {Promise}
   */
  async startCapture() {
    this.logger('startCapture')

    const display = getDisplay()

    const [imageUrl] = await Promise.all([this.capture(display), this.isReady])

    await this.createWindow(display)

    sendEvent(this.$view.webContents, 'SCREENSHOTS:capture', display, imageUrl)
  }

  /**
   * 结束截图
   */
  async endCapture() {
    this.logger('endCapture')
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
  async setLang(lang: Record<string, string>) {
    this.logger('setLang', lang)

    await this.isReady

    sendEvent(this.$view.webContents, 'SCREENSHOTS:setLang', lang)
  }

  async reset() {
    const resetId = randomUUID()
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer)
        this.resetWaiters.delete(resetId)
        resolve()
      }
      const timer = setTimeout(finish, 500)
      this.resetWaiters.set(resetId, finish)
      sendEvent(this.$view.webContents, 'SCREENSHOTS:reset', resetId)
    })
  }

  /**
   * 初始化窗口
   * @param {Display} display
   * @return {Promise}
   */
  async createWindow(display: Display) {
    // 重置截图区域
    await this.reset()

    // 复用未销毁的窗口
    if (!this.$win || this.$win?.isDestroyed?.()) {
      const systemType: Partial<Record<NodeJS.Platform, string>> = {
        darwin: 'panel',
        win32: 'toolbar',
      }

      this.$win = new BrowserWindow({
        title: 'screenshots',
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
        backgroundColor: '#31343f4d',
        titleBarStyle: 'hidden',
        hasShadow: false,
        paintWhenInitiallyHidden: false,
        // mac 特有的属性
        roundedCorners: false,
        enableLargerThanScreen: false,
        acceptFirstMouse: true,
      })

      this.$win.on('show', () => {
        this.$win?.focus()
        this.$win?.setKiosk(true)
      })

      this.$win.on('closed', () => {
        this.$win = null
      })
    }

    this.$win.setBrowserView(this.$view)

    // 适定平台
    if (process.platform === 'darwin') {
      this.$win.setWindowButtonVisibility(false)
    }

    if (process.platform !== 'win32') {
      this.$win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true,
      })
    }

    this.$win.blur()
    this.$win.setBounds(display)
    this.$view.setBounds({
      x: 0,
      y: 0,
      width: display.width,
      height: display.height,
    })
    this.$win.setAlwaysOnTop(true)
    this.$win.show()
  }

  /**
   * @param {Display} display
   * @returns {Promise}
   */
  async capture(display: Display) {
    this.logger('SCREENSHOTS:capture')

    try {
      /**
       * 有些小问题：
       * 1、在某些windows系统的多屏下，electorn获取的屏幕信息里，
       *    x-y坐标数据有问题，导致无法使用截图库正确截取目标屏幕图片(出现场景-多屏并且屏幕分辨率和缩放比都不一样且都不为100%的时候)
       */
      const capturer = NodeScreenshots?.fromPoint(display.x + display.width / 2, display.y + display.height / 2)
      this.logger('SCREENSHOTS:capture NodeScreenshots.fromPoint arguments', display)
      this.logger(
        'SCREENSHOTS:capture NodeScreenshots.fromPoint return',
        capturer
          ? {
              id: capturer.id,
              x: capturer.x,
              y: capturer.y,
              width: capturer.width,
              height: capturer.height,
              rotation: capturer.rotation,
              scaleFactor: capturer.scaleFactor,
              isPrimary: capturer.isPrimary,
            }
          : null,
      )

      if (!capturer) {
        throw new Error(`NodeScreenshots.fromDisplay(${display.id}) get null`)
      }

      const image = await capturer.capture()
      return `data:image/png;base64,${image.toString('base64')}`
    } catch (err) {
      this.logger('SCREENSHOTS:capture NodeScreenshots capture() error %o', err)

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: display.width * display.scaleFactor,
          height: display.height * display.scaleFactor,
        },
      })

      let source
      // Linux系统上，screen.getDisplayNearestPoint 返回的 Display 对象的 id
      // 和这里 source 对象上的 display_id(Linux上，这个值是空字符串) 或 id 的中间部分，都不一致
      // 但是，如果只有一个显示器的话，其实不用判断，直接返回就行
      if (sources.length === 1) {
        source = sources[0]
      } else {
        source = sources.find(
          (item) => item.display_id === display.id.toString() || item.id.startsWith(`screen:${display.id}:`),
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
  registerMethods() {
    const roles = ['screenshots'] as const
    registerMainMethod('ScreenshotReady', () => this.resolveReady(), roles)
    registerMainMethod('ScreenshotReset', ({ resetId }) => this.resetWaiters.get(resetId)?.(), roles)
    /**
     * OK事件
     * @param {Buffer} buffer
     * @param {ScreenshotsData} data
     */
    registerMainMethod(
      'ScreenshotOK',
      async ({ buffer, data }) => {
        this.logger('SCREENSHOTS:ok buffer.length %d, data: %o', buffer.length, data)

        const event = new Event()
        this.emit('ok', event, buffer, data)
        if (event.defaultPrevented) {
          return
        }
        clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(buffer)))
        await this.endCapture()
      },
      roles,
    )
    // CANCEL事件
    registerMainMethod(
      'ScreenshotCancel',
      async () => {
        this.logger('SCREENSHOTS:cancel')

        const event = new Event()
        this.emit('cancel', event)
        if (event.defaultPrevented) {
          return
        }
        await this.endCapture()
      },
      roles,
    )

    /**
     * SAVE事件
     * @param {Buffer} buffer
     * @param {ScreenshotsData} data
     */
    registerMainMethod(
      'ScreenshotSave',
      async ({ buffer, data }, context) => {
        this.logger('SCREENSHOTS:save buffer.length %d, data: %o', buffer.length, data)

        const event = new Event()
        this.emit('save', event, buffer, data)
        if (event.defaultPrevented || !this.$win) {
          return
        }

        const time = new Date()
        const year = time.getFullYear()
        const month = padStart(time.getMonth() + 1, 2, '0')
        const date = padStart(time.getDate(), 2, '0')
        const hours = padStart(time.getHours(), 2, '0')
        const minutes = padStart(time.getMinutes(), 2, '0')
        const seconds = padStart(time.getSeconds(), 2, '0')
        const milliseconds = padStart(time.getMilliseconds(), 3, '0')

        this.$win.setAlwaysOnTop(false)

        const { canceled, filePath } = await dialog.showSaveDialog(this.$win, {
          defaultPath: `${year}${month}${date}${hours}${minutes}${seconds}${milliseconds}.png`,
          filters: [
            { name: 'Image (png)', extensions: ['png'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })

        if (!this.$win || context.signal.aborted) {
          return
        }
        this.$win.setAlwaysOnTop(true)
        if (canceled || !filePath) {
          return
        }

        await fs.writeFile(filePath, buffer, { signal: context.signal })
        await this.endCapture()
      },
      roles,
    )
  }
}

export = Screenshots
