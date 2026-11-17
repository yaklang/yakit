// @vitest-environment node
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { build } from 'esbuild'
import { describe, expect, it, vi } from 'vitest'

const load = (webUtils) => {
  const module = { exports: {} }
  vm.runInNewContext(readFileSync(new URL('../preloadFilePath.js', import.meta.url), 'utf8'), {
    module,
    require: (id) => {
      if (id !== 'electron') throw new Error(`Unexpected dependency: ${id}`)
      return { webUtils }
    },
  })
  return module.exports
}

describe('preload file paths', () => {
  it('uses Electron webUtils for modern File objects', () => {
    const file = { name: 'selected.txt' }
    const getPathForFile = vi.fn(() => 'C:\\selected.txt')
    expect(load({ getPathForFile }).getPathForFile(file)).toBe('C:\\selected.txt')
    expect(getPathForFile).toHaveBeenCalledWith(file)
  })

  it('preserves the legacy File.path behavior and rejects pathless files', () => {
    const { getPathForFile } = load(undefined)
    expect(getPathForFile({ path: '/tmp/selected.txt' })).toBe('/tmp/selected.txt')
    expect(getPathForFile({ name: 'generated.txt' })).toBe('')
  })

  it('does not silently replace a pathless modern file with a legacy path', () => {
    expect(load({ getPathForFile: () => '' }).getPathForFile({ path: '/tmp/forged.txt' })).toBe('')
  })

  it('installs File.path for the main window and leaves a broken read empty', () => {
    class File {}
    const scope = { File }
    const read = vi.fn(() => 'C:\\selected.txt')
    load({ getPathForFile: read }).installFilePath(scope)
    const selected = new scope.File()
    expect(selected.path).toBe('C:\\selected.txt')
    read.mockImplementation(() => {
      throw new Error('not a file')
    })
    expect(new scope.File().path).toBe('')
  })

  it.each(['preload.js', 'engineLinkPreload.js'])('exposes modern and legacy file paths in %s', async (entry) => {
    const result = await build({
      entryPoints: [fileURLToPath(new URL(`../${entry}`, import.meta.url))],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      external: ['electron'],
      write: false,
    })
    for (const modern of [false, true]) {
      const process = Object.assign(new EventEmitter(), { argv: [] })
      const window = { addEventListener: vi.fn() }
      let bridge
      const getPathForFile = vi.fn(() => '/modern.txt')
      vm.runInNewContext(result.outputFiles[0].text, {
        process,
        window,
        require: (id) => {
          expect(id).toBe('electron')
          return {
            ipcRenderer: new EventEmitter(),
            webUtils: modern ? { getPathForFile } : undefined,
            contextBridge: { exposeInMainWorld: (_name, value) => (bridge = value) },
          }
        },
      })
      if (entry === 'preload.js') {
        class File {}
        window.File = File
        process.emit('loaded')
        bridge = window.yakitBridge
        if (modern) {
          const selected = new window.File()
          expect(selected.path).toBe('/modern.txt')
          expect(getPathForFile).toHaveBeenCalledWith(selected)
        }
        expect(bridge.app.getPathForFile).toBeUndefined()
        continue
      }
      const file = { path: '/legacy.txt' }
      expect(bridge.app.getPathForFile(file)).toBe(modern ? '/modern.txt' : '/legacy.txt')
      if (modern) expect(getPathForFile).toHaveBeenCalledWith(file)
    }
  })
})
