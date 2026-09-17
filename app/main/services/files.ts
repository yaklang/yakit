import type { YakClient } from '../../shared/generated/grpc/types'
import type { StreamFactory } from '../ipc/streams'
import syncFs from 'node:fs'
import { createHash } from 'node:crypto'
import { getYakProjects, getYakTemp, getLocalYaklangEngine, getYakitHome, loadExtraFilePath } from '../filePath'
import { app, dialog, type BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import FS from 'node:fs'
import path from 'node:path'
import { registerMainMethod } from '../ipc/index'
import { handleSaveFileSystem } from './fileDialog'

export function registerFileServices(win: BrowserWindow) {
  registerMainMethod('fetch-file-content', (filePath, context) => readFileContent(filePath, context.signal), [
    'main',
    'link',
  ])
  registerMainMethod('fetch-certificate-content', (filePath, context) =>
    fs.readFile(filePath, { signal: context.signal }),
  )
  registerMainMethod('GenerateTempFilePath', (fileName) => path.join(getYakTemp(), fileName))
  registerMainMethod('GenerateProjectsFilePath', (fileName) => path.join(getYakProjects(), fileName))
  registerMainMethod('GetProjectsFilePath', () => getYakProjects())
  registerMainMethod('read-file-content', (filePath, context) =>
    fs.readFile(filePath, { encoding: 'utf-8', signal: context.signal }),
  )
  registerMainMethod('pathJoin', ({ dir, file }) => path.join(dir, file))
  registerMainMethod('pathParent', ({ filePath }) => path.dirname(filePath))
  registerMainMethod('pathFileName', ({ filePath, isExtra = true }) =>
    path.basename(filePath, isExtra ? undefined : path.extname(filePath)),
  )
  registerMainMethod('relativePathByBase', ({ basePath, filePath }) => path.relative(basePath, filePath))
  registerMainMethod('show-save-dialog', async (defaultPath) => {
    const selection = await dialog.showSaveDialog(win, { title: '保存文件', defaultPath })
    return { ...selection, name: selection.filePath ? path.basename(selection.filePath) : '' }
  })
  registerMainMethod('delelte-code-file', async (filePath) => {
    await fs.unlink(filePath)
    return 'success'
  })
  registerMainMethod('assert-file-absent', async (filePath) => {
    try {
      await fs.access(filePath)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return
      throw error
    }
    throw Object.assign(new Error('File already exists'), { code: 'EEXIST' })
  })
  registerMainMethod('rename-file', async (params) => {
    if (!params.old || !params.new) return 'fail'
    await fs.rename(params.old, params.new)
    return 'success'
  })
  registerMainMethod('write-file', async ({ route, data }, context) => {
    if (!route) return 'fail'
    await fs.writeFile(route, data, { signal: context.signal })
    return 'success'
  })
  registerMainMethod('SaveCodecOutputToTxt', async ({ outputDir, fileName, data }, context) => {
    const filePath = path.join(outputDir, fileName)
    await fs.writeFile(filePath, data, { signal: context.signal })
    return { ok: true, outputDir: filePath }
  })
  registerMainMethod('importCodecByPath', (filePath, context) =>
    fs.readFile(filePath, { encoding: 'utf-8', signal: context.signal }),
  )
  registerMainMethod('fetch-file-info-by-path', async (filePath) => {
    const stats = await fs.stat(filePath)
    return { size: stats.size, mtimeMs: stats.mtimeMs, ctimeMs: stats.ctimeMs, isDirectory: stats.isDirectory() }
  })
  registerMainMethod('export-risk-html', async ({ htmlContent, fileName, data }, context) => {
    const selection = await handleSaveFileSystem({
      title: fileName,
      defaultPath: path.join(app.getPath('desktop'), fileName),
    })
    if (selection.canceled || !selection.filePath || context.signal.aborted) return ''
    await fs.mkdir(selection.filePath, { recursive: true })
    await fs.writeFile(path.join(selection.filePath, `${fileName}.html`), htmlContent, {
      encoding: 'utf-8',
      signal: context.signal,
    })
    await fs.writeFile(path.join(selection.filePath, 'data.js'), `const initData = ${JSON.stringify(data)}`, {
      encoding: 'utf-8',
      signal: context.signal,
    })
    return selection.filePath
  })
  // 获取通过文件路径获取文件名称/后缀
  registerMainMethod('fetch-file-name-by-path', (data) => {
    const fileInfo = {
      name: '',
      suffix: '',
    }
    try {
      if (!data || typeof data !== 'string') return fileInfo
      fileInfo.suffix = path.extname(data).toLowerCase()
      fileInfo.name = path.basename(data, fileInfo.suffix)
    } catch (error) {}
    return fileInfo
  })

  // 获取通过文件路径判断是否是文件夹
  registerMainMethod('fetch-file-is-dir-by-path', (path: string) => {
    try {
      if (!path || typeof path !== 'string') return false
      return FS.statSync(path).isDirectory()
    } catch (error) {
      return false
    }
  })

  /**
   * @name 判断路径A和路径B是否存在包含关系
   * @param {string} pathA 路径A
   * @param {string} pathB 路径B
   * @return {number} 0：相等；1：A包含B；2：B包含A；3：无包含关系；4：异常
   */
  registerMainMethod('fetch-path-contains-relation', (params: { pathA: string; pathB: string }) => {
    try {
      const { pathA, pathB } = params

      const pa = path.resolve(pathA)
      const pb = path.resolve(pathB)

      if (pa === pb) return 0

      const relAtoB = path.relative(pa, pb)
      // A是否包含B
      if (relAtoB && !relAtoB.startsWith('..') && !path.isAbsolute(relAtoB)) {
        return 1
      }

      const relBtoA = path.relative(pb, pa)
      // B是否包含A
      if (relBtoA && !relBtoA.startsWith('..') && !path.isAbsolute(relBtoA)) {
        return 2
      }

      return 3
    } catch (error) {
      return 4
    }
  })
  /**
   * @name 获取目标路径中，基于基础路径的所有相关路径列表
   * @param {string} basePath 基础路径
   * @param {string[]} targetPath 目标路径列表
   * @return {string[]} 相关路径列表（保持原始路径格式）
   */
  registerMainMethod('get-relevant-paths', (params: { basePath: string; targetPath: string[] }) => {
    const { basePath, targetPath } = params
    if (!targetPath || targetPath.length === 0) {
      return []
    }
    const relevantPaths: string[] = []
    const resolvedBasePath = path.resolve(basePath)
    for (const fullPath of targetPath) {
      const resolvedFullPath = path.resolve(fullPath)
      const relativePath = path.relative(resolvedBasePath, resolvedFullPath)

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        continue
      }

      const parts = relativePath.split(path.sep).filter(Boolean)
      let currentPath = resolvedBasePath

      for (const part of parts) {
        currentPath = path.join(currentPath, part)
        if (!relevantPaths.includes(currentPath)) {
          relevantPaths.push(currentPath)
        }
      }
    }
    return relevantPaths
  })
}

export async function calculateEngineHashes(signal: AbortSignal, includeBundled: boolean) {
  const hashes: string[] = []
  const files = [
    ...(includeBundled ? [loadExtraFilePath(path.join('bins', 'engine-sha256.txt'))] : []),
    ...(process.platform === 'darwin' ? [path.join(getYakitHome(), 'engine-sha256.txt')] : []),
  ]
  for (const file of files) {
    try {
      hashes.push((await fs.readFile(file, { encoding: 'utf-8', signal })).replace(/\r?\n/g, '').trim())
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error
    }
  }
  const engine = getLocalYaklangEngine()
  if (!engine) throw new Error('get engine path failed')
  const sum = createHash('sha256')
  for await (const chunk of FS.createReadStream(engine, { signal, highWaterMark: 1024 * 1024 })) sum.update(chunk)
  hashes.push(sum.digest('hex'))
  return hashes
}

import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
const parser = new XMLParser({ ignoreAttributes: false })

type SharedString = { t?: string | number; r?: { t: string } | { t: string }[] }
type Cell = { '@_r'?: string; '@_t'?: string; v?: string | number | boolean }
type SheetRow = { c?: Cell | Cell[] }
type Sheet = { '@_name': string }
export type WorkbookData = { name: string; data: (string | number | boolean)[][] }

// 列名转索引（A → 0, B → 1）
function columnToIndex(col: string) {
  let index = 0
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64)
  }
  return index - 1
}

// 解析 sharedStrings
function parseSharedStrings(xml: string): string[] {
  if (!xml) return []
  const json = parser.parse(xml) as { sst?: { si?: SharedString | SharedString[] } }
  const si = json?.sst?.si || []
  const arr = Array.isArray(si) ? si : [si]

  return arr.map((item) => {
    if (item.t !== undefined) return String(item.t)
    if (item.r) return (Array.isArray(item.r) ? item.r : [item.r]).map((r) => r.t).join('')
    return ''
  })
}

// 解析 sheet
function parseSheetData(sheetXml: string, sharedStrings: string[]) {
  const json = parser.parse(sheetXml) as { worksheet?: { sheetData?: { row?: SheetRow | SheetRow[] } } }
  const rows = json?.worksheet?.sheetData?.row || []
  const rowArr = Array.isArray(rows) ? rows : [rows]

  const result: (string | number | boolean)[][] = []

  rowArr.forEach((row) => {
    const rowData: (string | number | boolean)[] = []
    const cells = row.c || []
    const cellArr = Array.isArray(cells) ? cells : [cells]

    cellArr.forEach((cell) => {
      const ref = cell['@_r'] // A1
      if (!ref) return

      const col = ref.replace(/\d/g, '')
      const colIndex = columnToIndex(col)

      let value = cell.v ?? ''

      // sharedStrings
      if (cell['@_t'] === 's') {
        value = sharedStrings[Number(value)] || ''
      }

      rowData[colIndex] = value
    })

    // 补空位
    for (let i = 0; i < rowData.length; i++) {
      if (rowData[i] === undefined) rowData[i] = ''
    }

    result.push(rowData)
  })

  return result
}

// 解析 xlsx
export function parseXlsx(filePath: string) {
  const zip = new AdmZip(filePath)

  // sharedStrings
  let sharedStrings: string[] = []
  const sharedEntry = zip.getEntry('xl/sharedStrings.xml')
  if (sharedEntry) {
    sharedStrings = parseSharedStrings(sharedEntry.getData().toString())
  }

  // workbook
  const workbook = zip.getEntry('xl/workbook.xml')
  if (!workbook) throw new Error('Invalid xlsx: workbook is missing')
  const workbookXml = workbook.getData().toString()
  const workbookJson = parser.parse(workbookXml) as { workbook?: { sheets?: { sheet?: Sheet | Sheet[] } } }

  const sheets = workbookJson?.workbook?.sheets?.sheet || []
  const sheetList = Array.isArray(sheets) ? sheets : [sheets]

  const result: WorkbookData[] = []

  for (let i = 0; i < sheetList.length; i++) {
    const sheet = sheetList[i]
    const name = sheet['@_name']

    const sheetPath = `xl/worksheets/sheet${i + 1}.xml`
    const sheetEntry = zip.getEntry(sheetPath)
    if (!sheetEntry) continue

    const sheetXml = sheetEntry.getData().toString()
    const data = parseSheetData(sheetXml, sharedStrings)

    result.push({
      name,
      data,
    })
  }

  return result
}

export async function readFileContent(filePath: string, signal?: AbortSignal): Promise<WorkbookData[] | string> {
  const type = filePath.split('.').pop()?.toLowerCase()
  if (type === 'xls') throw new Error('暂不支持 .xls，请转为 .xlsx')
  if (type === 'xlsx') return parseXlsx(filePath)
  const content = await fs.readFile(filePath, { encoding: 'utf8', signal })
  if (type === 'csv') return [{ name: 'Sheet1', data: content.split(/\r?\n/).map((line) => line.split(',')) }]
  return content
}

export function exportFingerprintStream(getClient: () => YakClient): StreamFactory {
  return {
    requestStream: false,
    responseStream: true,
    pauseable: true,
    create(params) {
      if (!params || typeof params !== 'object' || !('TargetPath' in params) || typeof params.TargetPath !== 'string') {
        throw new Error('Fingerprint export requires TargetPath')
      }
      if (!syncFs.existsSync(getYakProjects())) syncFs.mkdirSync(getYakProjects(), { recursive: true })
      return getClient().ExportFingerprint({ ...params, TargetPath: path.join(getYakProjects(), params.TargetPath) })
    },
  }
}
