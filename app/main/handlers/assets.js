const { ipcMain, BrowserWindow } = require('electron')
const { htmlTemplateDir } = require('../filePath')
const compressing = require('compressing')
const fs = require('fs')
const os = require('os')
const path = require('path')

module.exports = (win, getClient) => {
  // asyncQueryPorts wrapper
  const asyncQueryPorts = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryPorts(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryPorts', async (e, params) => {
    return await asyncQueryPorts(params)
  })

  // asyncDeletePorts wrapper
  const asyncDeletePorts = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeletePorts(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeletePorts', async (e, params) => {
    return await asyncDeletePorts(params)
  })

  // asyncGenerateWebsiteTree wrapper
  const asyncGenerateWebsiteTree = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GenerateWebsiteTree(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GenerateWebsiteTree', async (e, params) => {
    return await asyncGenerateWebsiteTree(params)
  })

  // asyncQueryDomains wrapper
  const asyncQueryDomains = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryDomains(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryDomains', async (e, params) => {
    return await asyncQueryDomains(params)
  })

  // asyncQueryDomains wrapper
  const asyncDeleteDomains = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteDomains(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteDomains', async (e, params) => {
    return await asyncDeleteDomains(params)
  })

  // asyncQueryDomains wrapper
  const asyncQueryPortsGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryPortsGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryPortsGroup', async (e, params) => {
    return await asyncQueryPortsGroup(params)
  })

  // asyncQueryRisks wrapper
  const asyncQueryRisks = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryRisks(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryRisks', async (e, params) => {
    return await asyncQueryRisks(params)
  })

  const asyncSetTagForRisk = (params) => {
    return new Promise((resolve, reject) => {
      getClient().SetTagForRisk(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('SetTagForRisk', async (e, params) => {
    return await asyncSetTagForRisk(params)
  })

  const asyncQueryRiskTags = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryRiskTags(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryRiskTags', async (e, params) => {
    return await asyncQueryRiskTags(params)
  })

  const asyncRiskFieldGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().RiskFieldGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('RiskFieldGroup', async (e, params) => {
    return await asyncRiskFieldGroup(params)
  })

  // asyncQueryRisk wrapper
  const asyncQueryRisk = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryRisk(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryRisk', async (e, params) => {
    return await asyncQueryRisk(params)
  })

  // asyncDeleteRisk wrapper
  const asyncDeleteRisk = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteRisk(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteRisk', async (e, params) => {
    return await asyncDeleteRisk(params)
  })

  // asyncQueryAvailableRiskType wrapper
  const asyncQueryAvailableRiskType = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAvailableRiskType(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryAvailableRiskType', async (e, params) => {
    return await asyncQueryAvailableRiskType(params)
  })

  // asyncQueryAvailableRiskLevel wrapper
  const asyncQueryAvailableRiskLevel = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAvailableRiskLevel(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryAvailableRiskLevel', async (e, params) => {
    return await asyncQueryAvailableRiskLevel(params)
  })

  // asyncQueryRiskTableStats wrapper
  const asyncQueryRiskTableStats = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryRiskTableStats(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryRiskTableStats', async (e, params) => {
    return await asyncQueryRiskTableStats(params)
  })

  // asyncResetRiskTableStats wrapper
  const asyncResetRiskTableStats = (params) => {
    return new Promise((resolve, reject) => {
      getClient().ResetRiskTableStats(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('ResetRiskTableStats', async (e, params) => {
    return await asyncResetRiskTableStats(params)
  })

  /** 获取最新的漏洞与风险数据 */
  const asyncFetchLatestRisk = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryNewRisk(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('fetch-latest-risk-info', async (e, params) => {
    return await asyncFetchLatestRisk(params)
  })

  const asyncSetRiskInfoRead = (params) => {
    return new Promise((resolve, reject) => {
      getClient().NewRiskRead(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  /** 将单条/全部风险未读数据设置为已读 */
  ipcMain.handle('set-risk-info-read', async (e, params) => {
    return await asyncSetRiskInfoRead(params)
  })

  const asyncUploadRiskToOnline = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UploadRiskToOnline(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }

  // 风险漏洞误报反馈
  const asyncRiskFeedbackToOnline = (params) => {
    return new Promise((resolve, reject) => {
      getClient().RiskFeedbackToOnline(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('RiskFeedbackToOnline', async (e, params) => {
    return await asyncRiskFeedbackToOnline(params)
  })

  /** 同步数据 */
  ipcMain.handle('upload-risk-to-online', async (e, params) => {
    return await asyncUploadRiskToOnline(params)
  })

  // asyncDeleteHistoryHTTPFuzzerTask wrapper
  const asyncDeleteHistoryHTTPFuzzerTask = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteHistoryHTTPFuzzerTask(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteHistoryHTTPFuzzerTask', async (e, params) => {
    return await asyncDeleteHistoryHTTPFuzzerTask(params)
  })

  // asyncQueryReports wrapper
  const asyncQueryReports = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryReports(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryReports', async (e, params) => {
    return await asyncQueryReports(params)
  })

  // asyncQueryReport wrapper
  const asyncQueryReport = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryReport(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryReport', async (e, params) => {
    return await asyncQueryReport(params)
  })

  // 文件复制
  const copyFileByDir = (src1, src2) => {
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
  const delDir = (path) => {
    let files = []
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

  const findReportTemplateEntryHtml = (reportDir) => {
    const indexPath = path.join(reportDir, 'index.html')
    if (fs.existsSync(indexPath)) {
      return indexPath
    }
    let entries = []
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

  const patchTemplateForPdfLayout = (entryHtmlPath) => {
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

  const asyncDownloadHtmlReport = (params) => {
    return new Promise(async (resolve, reject) => {
      const { outputDir, JsonRaw, reportName } = params
      const inputFile = path.join(htmlTemplateDir, 'template.zip')
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
        if (!judgeReportName) {
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
  ipcMain.handle('DownloadHtmlReport', async (e, params) => {
    return await asyncDownloadHtmlReport(params)
  })

  // asyncDeleteReport wrapper
  const asyncDeleteReport = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteReport(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteReport', async (e, params) => {
    return await asyncDeleteReport(params)
  })

  // asyncQueryAvailableReportFrom wrapper
  const asyncQueryAvailableReportFrom = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAvailableReportFrom(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryAvailableReportFrom', async (e, params) => {
    return await asyncQueryAvailableReportFrom(params)
  })

  // asyncQueryChaosMakerRule wrapper
  const asyncQueryChaosMakerRule = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryChaosMakerRule(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // asyncIsScrecorderReady wrapper
  const asyncIsScrecorderReady = (params) => {
    return new Promise((resolve, reject) => {
      getClient().IsScrecorderReady(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }

  ipcMain.handle('QueryChaosMakerRules', async (e, params) => {
    return await asyncQueryChaosMakerRule(params)
  })
  ipcMain.handle('QueryChaosMakerRule', async (e, params) => {
    return await asyncQueryChaosMakerRule(params)
  })

  // asyncImportChaosMakerRules wrapper
  const asyncImportChaosMakerRules = (params) => {
    return new Promise((resolve, reject) => {
      getClient().ImportChaosMakerRules(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }

  ipcMain.handle('IsScrecorderReady', async (e, params) => {
    return await asyncIsScrecorderReady(params)
  })

  // asyncQueryScreenRecorders wrapper
  const asyncQueryScreenRecorders = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryScreenRecorders(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('ImportChaosMakerRules', async (e, params) => {
    return await asyncImportChaosMakerRules(params)
  })

  const handlerHelper = require('./handleStreamWithContext')

  const streamExecuteChaosMakerRuleMap = new Map()
  ipcMain.handle('cancel-ExecuteChaosMakerRule', handlerHelper.cancelHandler(streamExecuteChaosMakerRuleMap))
  ipcMain.handle('ExecuteChaosMakerRule', (e, params, token) => {
    let stream = getClient().ExecuteChaosMakerRule(params)
    handlerHelper.registerHandler(win, stream, streamExecuteChaosMakerRuleMap, token)
  })

  ipcMain.handle('QueryScreenRecorders', async (e, params) => {
    return await asyncQueryScreenRecorders(params)
  })

  const asyncUploadScreenRecorders = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UploadScreenRecorders(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('UploadScreenRecorders', async (e, params) => {
    return await asyncUploadScreenRecorders(params)
  })

  const asyncGetOneScreenRecorders = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetOneScreenRecorders(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GetOneScreenRecorders', async (e, params) => {
    return await asyncGetOneScreenRecorders(params)
  })

  const asyncUpdateScreenRecorders = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateScreenRecorders(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('UpdateScreenRecorders', async (e, params) => {
    return await asyncUpdateScreenRecorders(params)
  })

  const asyncDeleteScreenRecorders = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteScreenRecorders(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteScreenRecorders', async (e, params) => {
    return await asyncDeleteScreenRecorders(params)
  })

  const streamInstallScrecorderMap = new Map()
  ipcMain.handle('cancel-InstallScrecorder', handlerHelper.cancelHandler(streamInstallScrecorderMap))
  ipcMain.handle('InstallScrecorder', (e, params, token) => {
    let stream = getClient().InstallScrecorder(params)
    handlerHelper.registerHandler(win, stream, streamInstallScrecorderMap, token)
  })

  const streamStartScrecorderMap = new Map()
  ipcMain.handle('cancel-StartScrecorder', handlerHelper.cancelHandler(streamStartScrecorderMap))
  ipcMain.handle('StartScrecorder', (e, params, token) => {
    let stream = getClient().StartScrecorder(params)
    handlerHelper.registerHandler(win, stream, streamStartScrecorderMap, token)
  })
  // asyncQueryCVE wrapper
  const asyncQueryCVE = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryCVE(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryCVE', async (e, params) => {
    return await asyncQueryCVE(params)
  })

  // asyncGetCVE wrapper
  const asyncGetCVE = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetCVE(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GetCVE', async (e, params) => {
    return await asyncGetCVE(params)
  })

  /**
   * 基于 report/template.zip 导出 PDF（与 HTML 模板样式保持一致）
   * 1) 复制并解压模板到临时目录，注入 init.js 数据源
   * 2) 可选应用 PDF 布局补丁（隐藏目录/侧边栏、修正打印样式）
   * 3) 隐藏窗口加载模板页，等待字体/图片资源就绪
   * 4) 将 ECharts 实例转为静态图片后替换原 DOM，避免打印阶段重排导致的偏移/截断
   * 5) 调用 webContents.printToPDF 输出文件，并清理临时目录
   */
  const asyncPrintReportPdfFromTemplate = async (params) => {
    const { outputPath, JsonRaw, reportName, hideCatalog = true } = params || {}
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('PrintReportPdfFromTemplate: outputPath required')
    }
    if (JsonRaw === undefined || JsonRaw === null) {
      throw new Error('PrintReportPdfFromTemplate: JsonRaw required')
    }
    const inputFile = path.join(htmlTemplateDir, 'template.zip')
    if (!fs.existsSync(inputFile)) {
      throw new Error(`HTML report template not found: ${inputFile}`)
    }
    const reportNameFile = (reportName || 'html报告').replaceAll(/\\|\/|\:|\*|\?|\"|\<|\>|\|/g, '') || 'html报告'
    const workDir = path.join(os.tmpdir(), `yakit-report-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const reportDir = path.join(workDir, reportNameFile)
    const outputZip = path.join(workDir, 'template.zip')
    let printWin = null
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
      printWin = new BrowserWindow({
        show: false,
        width: 1280,
        height: 1800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })
      await printWin.loadFile(entryHtml)
      // 第一次注入：等待页面字体与图片资源加载完毕，减少打印缺字/缺图和布局抖动
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
      // 第二次注入：将 ECharts 实例转成静态图片并替换原 DOM，规避打印阶段 canvas 重绘偏移
      await printWin.webContents.executeJavaScript(`
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
            `)
      // 第三次注入：等待两帧渲染，确保替换后的图片布局稳定后再打印
      await printWin.webContents.executeJavaScript(`
                new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))));
            `)
      const pdfBuffer = await printWin.webContents.printToPDF({
        printBackground: true,
        marginsType: 0,
        pageSize: 'A4',
        landscape: false,
      })
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
  ipcMain.handle('PrintReportPdfFromTemplate', async (e, params) => {
    return await asyncPrintReportPdfFromTemplate(params)
  })
}
