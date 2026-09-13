// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'

describe('log export and shutdown flush', () => {
  let root
  let logs

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-log-flush-test-'))
    const module = { exports: {} }
    vm.runInNewContext(fs.readFileSync(path.resolve('app/main/logFile.js'), 'utf8'), {
      module,
      exports: module.exports,
      setTimeout,
      clearTimeout,
      console,
      require: (id) => {
        if (id === 'fs') return fs
        if (id === 'path') return path
        if (id === 'electron') return { shell: { openPath: vi.fn() } }
        if (id === './filePath')
          return {
            getEngineLogDir: () => path.join(root, 'engine'),
            getRenderLogDir: () => path.join(root, 'render'),
            getPrintLogDir: () => path.join(root, 'print'),
          }
        throw new Error(`Unexpected module: ${id}`)
      },
    })
    logs = module.exports
    logs.initAllLogFolders()
    await logs.getAllLogHandles()
  })

  afterEach(async () => {
    await logs.closeAllLogHandles()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('makes all current-session log files available', () => {
    expect(Object.keys(logs.getCurrentLogFiles()).sort()).toEqual(['engine', 'print', 'render'])
    for (const file of Object.values(logs.getCurrentLogFiles())) expect(fs.existsSync(file)).toBe(true)
  })

  it('flushes all three buffers immediately before the 500 ms timer', async () => {
    logs.renderLogOutputFile('last crash')
    logs.printLogOutputFile('last operation')
    logs.engineLogOutputFile('last engine event')
    await logs.flushAllLogs()
    const files = logs.getCurrentLogFiles()
    expect(fs.readFileSync(files.render, 'utf8')).toContain('last crash')
    expect(fs.readFileSync(files.print, 'utf8')).toContain('last operation')
    expect(fs.readFileSync(files.engine, 'utf8')).toContain('last engine event')
    await logs.flushAllLogs()
    expect(fs.readFileSync(files.render, 'utf8').match(/last crash/g)).toHaveLength(1)
  })

  it('waits for in-flight writes and keeps buffered entries on immediate shutdown', async () => {
    logs.renderLogOutputFile('first crash')
    const flushing = logs.flushAllLogs()
    logs.renderLogOutputFile('second crash')
    await logs.closeAllLogHandles()
    await flushing
    const content = fs.readFileSync(logs.getCurrentLogFiles().render, 'utf8')
    expect(content).toContain('first crash')
    expect(content).toContain('second crash')
    expect(content).toContain('结束日志收集')
  })
})
