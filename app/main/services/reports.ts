import { registerMainMethod, invocationWindow } from '../ipc/index'
import { registerRenderer } from '../ipc/index'
import { preloadPath, rendererPath } from '../paths'
import { BrowserWindow } from 'electron'
import isDev from 'electron-is-dev'
import { getHtmlTemplateDir } from '../filePath'
import compressing from 'compressing'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { YakClient } from '../../shared/generated/grpc/types'
import type { GrpcInput } from '../../shared/communication/protocol'
import type { GrpcStream } from '../ipc/streams'
interface HtmlReport {
  outputDir: string
  JsonRaw: unknown
  reportName: string
}
interface PdfReport {
  outputPath: string
  JsonRaw: unknown
  reportName?: string
  hideCatalog?: boolean
}
interface MarkdownReport {
  outputPath: string
  code: string
  theme?: string
}

function waitForPrint<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => finish(new Error('Printing aborted'))
    let settled = false
    const timer = setTimeout(() => finish(new Error('Print operation timed out')), 120_000)
    const finish = (error?: unknown, data?: T) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve(data as T)
    }
    signal.addEventListener('abort', abort, { once: true })
    work.then(
      (data) => finish(undefined, data),
      (error) => finish(error),
    )
    if (signal.aborted) abort()
  })
}

export function registerReportServices() {
  // 文件复制
  const copyFileByDir = (src1: string, src2: string) => {
    return new Promise((resolve, reject) => {
      fs.readFile(src1, (err, data) => {
        if (err) return reject(err)
        fs.writeFile(src2, data, (err) => {
          if (err) return reject(err)
          resolve('复制文件成功')
        })
      })
    })
  }

  // 删除文件夹下所有文件
  const delDir = (path: string) => {
    let files: string[] = []
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path)
      files.forEach((file, index) => {
        let curPath = path + '/' + file
        if (fs.statSync(curPath).isDirectory()) {
          delDir(curPath) //递归删除文件夹
        } else {
          fs.unlinkSync(curPath) //删除文件
        }
      })
      fs.rmdirSync(path)
    }
  }

  const findReportTemplateEntryHtml = (reportDir: string) => {
    const indexPath = path.join(reportDir, 'index.html')
    if (fs.existsSync(indexPath)) {
      return indexPath
    }
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(reportDir, { withFileTypes: true })
    } catch (e) {
      return null
    }
    for (const dirent of entries) {
      if (dirent.isFile() && dirent.name.toLowerCase().endsWith('.html')) {
        return path.join(reportDir, dirent.name)
      }
    }
    return null
  }

  const patchTemplateForPdfLayout = (entryHtmlPath: string) => {
    if (!entryHtmlPath || !fs.existsSync(entryHtmlPath)) {
      return
    }
    let htmlContent = fs.readFileSync(entryHtmlPath, 'utf-8')
    const printPatchStyle = `
<style id="yakit-pdf-layout-patch">
#markdown-bar,
.main-container .left,
.main-container .right,
#catalog,
#toc,
#directory,
.catalog,
.toc,
.directory,
.report-catalog,
.report-toc,
[data-type="catalog"],
[data-type="toc"] {
  display: none !important;
}
.main-container {
  margin: 0 !important;
}
.main-container .mid {
  margin: 0 8px !important;
  max-width: none !important;
  width: auto !important;
}
table {
  width: 100% !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
}
thead {
  display: table-header-group !important;
}
tfoot {
  display: table-footer-group !important;
}
tr,
th,
td {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
th,
td {
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: anywhere !important;
  vertical-align: top !important;
}
@media print {
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .main-container,
  .main-container .mid,
  #content {
    overflow: visible !important;
  }
}
</style>`
    if (!htmlContent.includes('yakit-pdf-layout-patch')) {
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', `${printPatchStyle}\n</head>`)
      } else {
        htmlContent = `${printPatchStyle}\n${htmlContent}`
      }
    }
    fs.writeFileSync(entryHtmlPath, htmlContent, 'utf-8')
  }

  const asyncDownloadHtmlReport = (params: HtmlReport) => {
    return new Promise<{ ok: boolean; outputDir: string }>(async (resolve, reject) => {
      const { outputDir, JsonRaw, reportName } = params
      const inputFile = path.join(getHtmlTemplateDir(), 'template.zip')
      const outputFile = path.join(outputDir, 'template.zip')
      const reportNameFile = reportName.replaceAll(/\\|\/|\:|\*|\?|\"|\<|\>|\|/g, '') || 'html报告'
      // 判断报告名是否存在？
      const ReportItemName = path.join(outputDir, reportNameFile)
      const judgeReportName = fs.existsSync(ReportItemName)
      let isCreatDir = false
      try {
        // 复制模板到生成文件地址
        await copyFileByDir(inputFile, outputFile)
        // 文件夹已存在 则先清空之前内容
        if (judgeReportName) delDir(ReportItemName)
        {
          fs.mkdirSync(ReportItemName)
          isCreatDir = true
        }
        // 解压模板
        await compressing.zip.uncompress(outputFile, ReportItemName)
        // 删除zip
        fs.unlinkSync(outputFile)
        // 修改模板入口文件
        const initDir = path.join(ReportItemName, 'js', 'init.js')
        // 模板源注入
        fs.writeFileSync(initDir, `let initData = ${JSON.stringify(JsonRaw)}`)
        resolve({
          ok: true,
          outputDir: ReportItemName,
        })
      } catch (error) {
        // 如若错误 删除已创建文件夹
        if (isCreatDir) delDir(ReportItemName)
        reject(error)
      }
    })
  }
  registerMainMethod('DownloadHtmlReport', async (params) => {
    return await asyncDownloadHtmlReport(params)
  })

  /**
   * 基于 report/template.zip 导出 PDF（与 HTML 模板样式保持一致）
   * 1) 复制并解压模板到临时目录，注入 init.js 数据源
   * 2) 可选应用 PDF 布局补丁（隐藏目录/侧边栏、修正打印样式）
   * 3) 隐藏窗口加载模板页，等待字体/图片资源就绪
   * 4) 将 ECharts 实例转为静态图片后替换原 DOM，避免打印阶段重排导致的偏移/截断
   * 5) 调用 webContents.printToPDF 输出文件，并清理临时目录
   */
  const asyncPrintReportPdfFromTemplate = async (params: PdfReport, signal: AbortSignal) => {
    const { outputPath, JsonRaw, reportName, hideCatalog = true } = params || {}
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('PrintReportPdfFromTemplate: outputPath required')
    }
    if (JsonRaw === undefined || JsonRaw === null) {
      throw new Error('PrintReportPdfFromTemplate: JsonRaw required')
    }
    const inputFile = path.join(getHtmlTemplateDir(), 'template.zip')
    if (!fs.existsSync(inputFile)) {
      throw new Error(`HTML report template not found: ${inputFile}`)
    }
    const reportNameFile = (reportName || 'html报告').replaceAll(/\\|\/|\:|\*|\?|\"|\<|\>|\|/g, '') || 'html报告'
    const workDir = path.join(os.tmpdir(), `yakit-report-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const reportDir = path.join(workDir, reportNameFile)
    const outputZip = path.join(workDir, 'template.zip')
    let printWin: BrowserWindow | null = null
    try {
      fs.mkdirSync(workDir, { recursive: true })
      await copyFileByDir(inputFile, outputZip)
      if (fs.existsSync(reportDir)) {
        delDir(reportDir)
      }
      fs.mkdirSync(reportDir)
      await compressing.zip.uncompress(outputZip, reportDir)
      fs.unlinkSync(outputZip)
      const initDir = path.join(reportDir, 'js', 'init.js')
      fs.writeFileSync(initDir, `let initData = ${JSON.stringify(JsonRaw)}`, 'utf-8')
      const entryHtml = findReportTemplateEntryHtml(reportDir)
      if (!entryHtml) {
        throw new Error('PrintReportPdfFromTemplate: no entry html in template')
      }
      if (hideCatalog) {
        patchTemplateForPdfLayout(entryHtml)
      }
      if (signal.aborted) throw new Error('Printing aborted')
      printWin = new BrowserWindow({
        show: false,
        width: 1280,
        height: 1800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })
      await waitForPrint(printWin.loadFile(entryHtml), signal)
      // 第一次注入：等待页面字体与图片资源加载完毕，减少打印缺字/缺图和布局抖动
      await waitForPrint(
        printWin.webContents.executeJavaScript(`
                new Promise((resolve) => {
                    const done = () => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => resolve(true))
                        })
                    }
                    const waitFonts = (document.fonts && document.fonts.ready)
                        ? document.fonts.ready.catch(() => {})
                        : Promise.resolve()
                    const imgs = Array.from(document.images || [])
                    const waitImages = Promise.all(
                        imgs.map((img) => {
                            if (img.complete) return Promise.resolve()
                            return new Promise((r) => {
                                img.addEventListener('load', r, { once: true })
                                img.addEventListener('error', r, { once: true })
                            })
                        })
                    )
                    Promise.all([waitFonts, waitImages]).then(() => {
                        setTimeout(done, 500)
                    })
                });
            `),
        signal,
      )
      // 第二次注入：将 ECharts 实例转成静态图片并替换原 DOM，规避打印阶段 canvas 重绘偏移
      await waitForPrint(
        printWin.webContents.executeJavaScript(`
                (() => {
                    if (window.echarts && typeof window.echarts.getInstanceByDom === 'function') {
                        const chartDoms = Array.from(document.querySelectorAll('.echart-item'))
                        chartDoms.forEach((dom) => {
                            try {
                                const chart = window.echarts.getInstanceByDom(dom)
                                if (!chart) return
                                chart.resize && chart.resize()
                                const dataURL = chart.getDataURL({
                                  type: 'png',
                                  pixelRatio: 2,
                                  backgroundColor: '#fff',
                                })
                                const width = chart.getWidth ? chart.getWidth() : dom.clientWidth
                                const height = chart.getHeight ? chart.getHeight() : dom.clientHeight
                                const wrapper = document.createElement('div')
                                wrapper.style.setProperty('width', '100%', 'important')
                                wrapper.style.setProperty('display', 'flex', 'important')
                                wrapper.style.setProperty('justify-content', 'center', 'important')
                                wrapper.style.setProperty('align-items', 'center', 'important')
                                const img = document.createElement('img')
                                img.src = dataURL
                                img.style.maxWidth = '100%'
                                img.style.width = (width || 600) + 'px'
                                img.style.height = (height || 400) + 'px'
                                img.style.objectFit = 'contain'
                                img.style.display = 'block'
                                wrapper.appendChild(img)
                                dom.innerHTML = ''
                                dom.style.setProperty('display', 'flex', 'important')
                                dom.style.setProperty('justify-content', 'center', 'important')
                                dom.style.setProperty('align-items', 'center', 'important')
                                dom.style.setProperty('width', '100%', 'important')
                                dom.style.setProperty('max-width', '100%', 'important')
                                dom.appendChild(wrapper)
                            } catch (_) {}
                        })
                    }
                    return true
                })();
            `),
        signal,
      )
      // 第三次注入：等待两帧渲染，确保替换后的图片布局稳定后再打印
      await waitForPrint(
        printWin.webContents.executeJavaScript(`
                new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))));
            `),
        signal,
      )
      const pdfBuffer = await waitForPrint(
        printWin.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          landscape: false,
        }),
        signal,
      )
      fs.writeFileSync(outputPath, pdfBuffer)
      return { ok: true }
    } finally {
      if (printWin && !printWin.isDestroyed()) {
        printWin.destroy()
      }
      try {
        if (fs.existsSync(workDir)) {
          delDir(workDir)
        }
      } catch (_) {}
    }
  }
  registerMainMethod('PrintReportPdfFromTemplate', async (params, context) => {
    return await asyncPrintReportPdfFromTemplate(params, context.signal)
  })

  /** markdown PDF：printId -> { code, theme } */
  const markdownPdfPrintWindows = new Map<string, BrowserWindow>()
  const markdownPdfPrintPayloadMap = new Map<string, { code: string; theme: string }>()
  const markdownPdfPrintReadyResolvers = new Map<string, () => void>()

  registerMainMethod('GetMarkdownPdfPrintPayload', async (printId, context) => {
    if (markdownPdfPrintWindows.get(printId) !== invocationWindow(context))
      throw new Error('Print session does not belong to this window')
    return markdownPdfPrintPayloadMap.get(printId) || null
  })

  registerMainMethod('MarkdownPdfPrintReady', async (printId, context) => {
    if (markdownPdfPrintWindows.get(printId) !== invocationWindow(context))
      throw new Error('Print session does not belong to this window')
    const resolve = markdownPdfPrintReadyResolvers.get(printId)
    if (resolve) {
      markdownPdfPrintReadyResolvers.delete(printId)
      resolve()
    }
    return { ok: true }
  })

  const patchMarkdownPdfPrintLayout = async (printWin: BrowserWindow) => {
    await printWin.webContents.insertCSS(`
      @page { margin: 0; size: A4; }
      html, body, #root {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        background: var(--Colors-Use-Neutral-Bg-Hover, #f0f1f3) !important;
      }
      [class*="markdown-pdf-print"] {
        box-sizing: border-box !important;
        padding: 20px !important;
        background: var(--Colors-Use-Neutral-Bg-Hover, #f0f1f3) !important;
      }
      .stream-markdown .container,
      .stream-markdown .\\!container {
        width: 100% !important;
        max-width: none !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }
    `)
  }

  const waitMarkdownPrintPageResources = async (printWin: BrowserWindow) => {
    await printWin.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const done = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve(true))
          })
        }
        const waitFonts = (document.fonts && document.fonts.ready)
          ? document.fonts.ready.catch(() => {})
          : Promise.resolve()
        const imgs = Array.from(document.images || [])
        const waitImages = Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve()
            return new Promise((r) => {
              img.addEventListener('load', r, { once: true })
              img.addEventListener('error', r, { once: true })
            })
          })
        )
        Promise.all([waitFonts, waitImages]).then(() => {
          setTimeout(done, 500)
        })
      });
    `)
    await printWin.webContents.executeJavaScript(`
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))));
    `)
  }

  /**
   * Markdown 导出 PDF：隐藏窗口加载 StreamMarkdown 页面（与 YakRunner 预览一致）
   */
  const asyncPrintMarkdownPdfFromTemplate = async (params: MarkdownReport, signal: AbortSignal) => {
    const { outputPath, code, theme = 'light' } = params || {}
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('PrintMarkdownPdfFromTemplate: outputPath required')
    }
    if (code === undefined || code === null) {
      throw new Error('PrintMarkdownPdfFromTemplate: code required')
    }

    const printId = `md-${Date.now()}-${Math.random().toString(36).slice(2)}`
    markdownPdfPrintPayloadMap.set(printId, { code: String(code), theme: theme || 'light' })

    let printWin: BrowserWindow | null = null
    let readyTimer: NodeJS.Timeout | undefined
    try {
      const readyPromise = new Promise<void>((resolve, reject) => {
        markdownPdfPrintReadyResolvers.set(printId, resolve)
        readyTimer = setTimeout(() => {
          if (markdownPdfPrintReadyResolvers.has(printId)) {
            markdownPdfPrintReadyResolvers.delete(printId)
            reject(new Error('PrintMarkdownPdfFromTemplate: render timeout'))
          }
        }, 120000)
      })

      void readyPromise.catch(() => {})

      // A4 可打印宽度约 794px（96dpi），与 PDF 页宽对齐，避免两侧白边
      if (signal.aborted) throw new Error('Printing aborted')
      printWin = new BrowserWindow({
        show: false,
        width: 794,
        height: 1800,
        webPreferences: {
          preload: preloadPath('main'),
          nodeIntegration: true,
          contextIsolation: false,
          sandbox: true,
        },
      })
      markdownPdfPrintWindows.set(printId, printWin)
      registerRenderer(printWin.webContents, 'main')

      const search = `window=markdown-pdf-print&printId=${encodeURIComponent(printId)}`
      if (isDev) {
        await waitForPrint(printWin.loadURL(`http://127.0.0.1:3000/?${search}`), signal)
      } else {
        await waitForPrint(printWin.loadFile(rendererPath('main'), { search }), signal)
      }

      await waitForPrint(readyPromise, signal)
      await waitForPrint(patchMarkdownPdfPrintLayout(printWin), signal)
      await waitForPrint(waitMarkdownPrintPageResources(printWin), signal)

      const pdfBuffer = await waitForPrint(
        printWin.webContents.printToPDF({
          printBackground: true,
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
          pageSize: 'A4',
          preferCSSPageSize: true,
          landscape: false,
        }),
        signal,
      )
      fs.writeFileSync(outputPath, pdfBuffer)
      return { ok: true }
    } finally {
      clearTimeout(readyTimer)
      markdownPdfPrintWindows.delete(printId)
      markdownPdfPrintPayloadMap.delete(printId)
      markdownPdfPrintReadyResolvers.delete(printId)
      if (printWin && !printWin.isDestroyed()) {
        printWin.destroy()
      }
    }
  }

  registerMainMethod('PrintMarkdownPdfFromTemplate', async (params, context) => {
    return await asyncPrintMarkdownPdfFromTemplate(params, context.signal)
  })
}
