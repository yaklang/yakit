import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const filePathSource = fs.readFileSync(path.resolve(process.cwd(), 'app/main/filePath.js'), 'utf8')

const loadFilePath = (electronApp) => {
  const module = { exports: {} }
  const mockFs = {
    existsSync: () => true,
    readFileSync: () => '{}',
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    copyFileSync: vi.fn(),
  }

  vm.runInNewContext(filePathSource, {
    module,
    exports: module.exports,
    console: { log: vi.fn() },
    require: (id) => {
      if (id === 'electron') return { app: electronApp }
      if (id === 'electron-is-dev') return false
      if (id === 'os') return { homedir: () => '/home/yakit-test', platform: () => 'linux' }
      if (id === 'path') return path
      if (id === 'process') return { platform: 'win32', env: {} }
      if (id === 'fs') return mockFs
      throw new Error(`Unexpected module: ${id}`)
    },
  })

  return module.exports
}

describe('getYakitInstallDir', () => {
  it('uses the system downloads directory', () => {
    const downloadsPath = 'D:\\WindowsKu\\Download'
    const getPath = vi.fn(() => downloadsPath)
    const { getYakitInstallDir } = loadFilePath({ getName: () => 'yakit', getPath, isPackaged: false })

    expect(getYakitInstallDir()).toBe(downloadsPath)
    expect(getPath).toHaveBeenCalledWith('downloads')
  })

  it('falls back to the legacy home directory when Electron cannot resolve the path', () => {
    const getPath = vi.fn(() => {
      throw new Error('downloads path unavailable')
    })
    const { getYakitInstallDir } = loadFilePath({ getName: () => 'yakit', getPath, isPackaged: false })

    expect(getYakitInstallDir()).toBe(path.join('/home/yakit-test', 'Downloads'))
  })
})
