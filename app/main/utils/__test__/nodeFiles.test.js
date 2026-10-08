import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import compressing from 'compressing'

const nodeFilesSource = fs.readFileSync(path.resolve(process.cwd(), 'app/main/utils/nodeFiles.js'), 'utf8')
const RISK_ZIP = path.resolve(process.cwd(), 'report', 'risk-html.zip')

/** 与模板 modules/... 引用一一对应的内置静态资源（report/risk-html.zip） */
const EXPECTED_MODULE_FILES = [
  'modules/antd/antd.min.css',
  'modules/antd/antd.min.js',
  'modules/babel/babel.min.js',
  'modules/icons/index.umd.min.js',
  'modules/moment/moment.min.js',
  'modules/react/react-dom.production.min.js',
  'modules/react/react.production.min.js',
]

/**
 * 在 vm 中加载 nodeFiles.js，依赖全部打桩注入：
 * 返回 { handlers } —— ipcMain.handle(channel, fn) 收集的 handler 表，
 * 直接调用 handlers.get('export-risk-html')(event, params) 即可测导出主链路。
 */
const loadNodeFiles = ({ electronApp, handleSaveFileSystem, getHtmlTemplateDir, zipUncompress }) => {
  const module = { exports: {} }
  const handlers = new Map()
  vm.runInNewContext(nodeFilesSource, {
    module,
    exports: module.exports,
    console,
    require: (id) => {
      if (id === 'electron') {
        return {
          app: electronApp,
          ipcMain: { handle: (channel, fn) => handlers.set(channel, fn) },
        }
      }
      if (id === 'fs') return fs
      if (id === 'path') return path
      if (id === 'compressing') {
        return zipUncompress ? { zip: { uncompress: zipUncompress } } : compressing
      }
      if (id === './fileSystemDialog') return { handleSaveFileSystem }
      if (id === '../filePath') return { getHtmlTemplateDir }
      throw new Error(`Unexpected module: ${id}`)
    },
  })
  module.exports.register()
  return { handlers }
}

describe('export-risk-html', () => {
  let tempDir

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-risk-html-export-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  const loadHandlers = (overrides = {}) => {
    const { handlers } = loadNodeFiles({
      electronApp: { getPath: () => os.tmpdir() },
      handleSaveFileSystem: async () => ({ filePath: tempDir }),
      getHtmlTemplateDir: () => path.dirname(RISK_ZIP),
      ...overrides,
    })
    return handlers.get('export-risk-html')
  }

  it('解压内置 zip：导出目录解出全部 modules/ 静态资源，且不把 zip 拷进用户目录', async () => {
    const exportRiskHtml = loadHandlers()

    const result = await exportRiskHtml(null, {
      htmlContent: '<html>risk</html>',
      fileName: 'risk-report',
      data: [{ id: 1, severity: '危险' }],
    })

    expect(result).toBe(tempDir)
    for (const rel of EXPECTED_MODULE_FILES) {
      expect(fs.existsSync(path.join(tempDir, rel))).toBe(true)
    }
    expect(fs.existsSync(path.join(tempDir, 'risk-html.zip'))).toBe(false)
    expect(fs.readFileSync(path.join(tempDir, 'risk-report.html'), 'utf-8')).toBe('<html>risk</html>')
    expect(fs.readFileSync(path.join(tempDir, 'data.js'), 'utf-8')).toBe(
      'const initData = [{"id":1,"severity":"危险"}]',
    )
  })

  it('取消保存：不触发解压、不写任何文件，返回空字符串', async () => {
    const zipUncompress = vi.fn()
    const exportRiskHtml = loadHandlers({
      handleSaveFileSystem: async () => ({ filePath: '' }),
      zipUncompress,
    })

    const result = await exportRiskHtml(null, {
      htmlContent: '<html>risk</html>',
      fileName: 'risk-report',
      data: [],
    })

    expect(result).toBe('')
    expect(zipUncompress).not.toHaveBeenCalled()
    expect(fs.readdirSync(tempDir)).toEqual([])
  })
})
