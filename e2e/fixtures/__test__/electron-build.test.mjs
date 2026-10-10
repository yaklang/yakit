// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { build } from 'esbuild'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { buildElectron, checkRegistry, codeOptions, exists, repoRoot, run } from '../../../scripts/build-electron.mjs'
import { waitForRenderers } from '../../../scripts/start-electron.mjs'

const require = createRequire(import.meta.url)
let temporary
let developmentSize
const output = path.join(repoRoot, 'dist/electron')

beforeAll(async () => {
  await mkdir(path.join(repoRoot, 'dist'), { recursive: true })
  temporary = await mkdtemp(path.join(repoRoot, 'dist/.electron-test-'))
  if (!(await exists(path.join(repoRoot, 'app/main/handlers/openNewChildWindow/theme.css')))) {
    await run(process.execPath, ['app/renderer/src/main/scripts/generate-theme-css.cjs'])
  }
  await buildElectron({ mode: 'development' })
  developmentSize = (await readFile(path.join(output, 'main/index.js'))).length
  await writeFile(path.join(output, 'obsolete.js'), 'obsolete output')
  await buildElectron({ mode: 'production' })
}, 60000)

afterAll(async () => {
  if (temporary) await rm(temporary, { recursive: true, force: true })
})

async function bundleFixture(entry, name, options = {}) {
  const outfile = path.join(temporary, name)
  await build({ ...codeOptions('production'), entryPoints: [entry], outfile, packages: 'external', ...options })
  return require(outfile)
}

describe('Electron bundle contract', () => {
  it('creates compressed production entries and removes stale development files', async () => {
    const source = await readFile(path.join(output, 'main/index.js'), 'utf8')
    expect(Buffer.byteLength(source)).toBeLessThan(developmentSize)
    expect(source).not.toContain('sourceMappingURL=')
    expect(source).not.toContain('fs.readdirSync')
    expect(await exists(path.join(output, 'obsolete.js'))).toBe(false)
    const info = JSON.parse(await readFile(path.join(output, 'build-info.json'), 'utf8'))
    expect(info.mode).toBe('production')
    expect(Object.keys(info.hashes)).toHaveLength(4)
    const metadata = JSON.parse(await readFile(path.join(output, 'metafile.json'), 'utf8'))
    const modules = require('../../../app/main/ipcModules.js')
    await checkRegistry()
    for (const [group, loaders] of Object.entries(modules)) {
      for (const name of Object.keys(loaders)) {
        expect(
          Object.keys(metadata['main/index'].inputs).some(
            (file) => file === `app/main/${group}/${name}.js` || file === `app/main/${group}/${name}.ts`,
          ),
        ).toBe(true)
      }
    }
    for (const metadataEntry of Object.values(metadata)) {
      for (const artifact of Object.values(metadataEntry.outputs)) {
        expect(artifact.imports.filter((item) => item.external && item.path.startsWith('.'))).toEqual([])
      }
    }
  })

  it('keeps registration lazy until called', async () => {
    const registry = await readFile(path.join(repoRoot, 'app/main/ipcModules.js'), 'utf8')
    const loaded = []
    const context = {
      module: { exports: {} },
      require: (name) => {
        loaded.push(name)
        return {}
      },
    }
    vm.runInNewContext(registry, context)
    expect(loaded).toEqual([])
    context.module.exports.api.index()
    expect(loaded).toEqual(['./api/index'])
  })

  it.each(['main', 'engine-link', 'screenshots'])(
    'runs %s preload with only the sandbox Electron bridge',
    async (name) => {
      const exposed = {}
      const ipcRenderer = Object.assign(new EventEmitter(), { send: vi.fn(), invoke: vi.fn(), sendSync: vi.fn() })
      const process = Object.assign(new EventEmitter(), {
        argv: [],
        getHeapStatistics: () => ({ usedHeapSize: 1024, heapSizeLimit: 2048, totalAvailableSize: 1024 }),
        getBlinkMemoryInfo: () => ({ allocated: 1024, total: 2048 }),
      })
      const window = { addEventListener: vi.fn() }
      vm.runInNewContext(await readFile(path.join(output, `preload/${name}.js`), 'utf8'), {
        require: (id) => {
          expect(id).toBe('electron')
          return {
            ipcRenderer,
            contextBridge: {
              exposeInMainWorld: (key, value) => {
                exposed[key] = value
              },
            },
          }
        },
        process,
        window,
        Buffer,
      })
      if (name === 'main') {
        process.emit('loaded')
        expect(window.yakitBridge).toBeDefined()
      } else if (name === 'engine-link') {
        await exposed.yakitBridge.system.isDev()
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('EngineLink:is-dev')
      } else {
        exposed.screenshots.ready()
        expect(ipcRenderer.send).toHaveBeenCalledWith('SCREENSHOTS:ready')
      }
    },
  )

  it('resolves resources from a relocated bundle without a source directory', async () => {
    const main = path.join(temporary, 'application/dist/electron/main')
    await mkdir(main, { recursive: true })
    const paths = await bundleFixture('app/main/runtimePaths.js', 'application/dist/electron/main/paths.cjs')
    const root = path.join(temporary, 'application')
    expect(paths.appResourcePath('protos', 'grpc.proto')).toBe(path.join(root, 'app/protos/grpc.proto'))
    expect(paths.preloadPath('main')).toBe(path.join(root, 'dist/electron/preload/main.js'))
    expect(paths.resourcePath('screenshots', 'capture.node')).toBe(
      path.join(root, 'dist/electron/resources/screenshots/capture.node'),
    )
  })

  it('checks strict TS while allowing JS imports, and runs the mixed bundle', async () => {
    const js = path.join(temporary, 'legacy.js')
    const entry = path.join(temporary, 'typed.ts')
    const caller = path.join(temporary, 'caller.js')
    await writeFile(js, 'exports.increment = (value) => value + 1\n')
    await writeFile(entry, "import { increment } from './legacy'\nexport const value: number = increment(41)\n")
    await writeFile(caller, "module.exports = require('./typed').value\n")
    const config = ts.readConfigFile(path.join(repoRoot, 'tsconfig.electron.json'), ts.sys.readFile)
    const options = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot).options
    const diagnostics = () => ts.getPreEmitDiagnostics(ts.createProgram([entry, js, caller], options))
    expect(diagnostics().map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([])
    expect(await bundleFixture(caller, 'mixed.cjs')).toBe(42)
    await writeFile(entry, 'export const value: number = "invalid"\n')
    expect(diagnostics().some((d) => d.code === 2322)).toBe(true)
  })

  it('executes the minified screenshot function in an independent renderer context', async () => {
    const { captureYakitScreenshot } = await bundleFixture('app/main/yakitScreenshot.js', 'screenshot.cjs')
    const context = { drawImage() {}, fillRect() {}, fillText() {}, measureText: () => ({ width: 80 }) }
    const contents = Object.assign(new EventEmitter(), {
      isDestroyed: () => false,
      isLoadingMainFrame: () => false,
      isCrashed: () => false,
      capturePage: async () => ({ isEmpty: () => false, toPNG: () => Buffer.from('image') }),
      executeJavaScriptInIsolatedWorld: async (_, [{ code }]) =>
        vm.runInNewContext(code, {
          atob: (value) => Buffer.from(value, 'base64').toString('binary'),
          Blob,
          createImageBitmap: async () => ({ width: 800, height: 600, close() {} }),
          document: {
            createElement: () => ({ getContext: () => context, toDataURL: () => 'data:image/png;base64,aW1hZ2U=' }),
          },
        }),
    })
    const win = Object.assign(new EventEmitter(), {
      isDestroyed: () => false,
      getContentSize: () => [800, 600],
      webContents: contents,
    })
    const result = await captureYakitScreenshot(win)
    expect(result.width).toBe(800)
    expect(result.data).toBe('aW1hZ2U=')
  })

  it('keeps browser bootstrap URL fields intact after minification', async () => {
    const { buildManagedChromeArguments } = await bundleFixture(
      'app/main/handlers/managedBrowserProfiles.js',
      'browser.cjs',
    )
    const args = buildManagedChromeArguments(
      {
        slotHint: 'right',
        id: 'test-id',
        extensionPath: '/extension',
        startingUrl: 'https://example.test/',
        lastStartedAt: 'now',
      },
      '/profile',
      false,
    )
    const url = new URL(args.find((arg) => arg.startsWith('chrome-extension:')))
    expect(url.searchParams.get('instanceId')).toBe('test-id')
    expect(url.searchParams.get('badge')).toBe('B')
    expect(url.searchParams.get('target')).toBe('https://example.test/')
  })

  it('requires valid HTTP page content instead of a listening port', async () => {
    let ready = false
    const server = createServer((_, response) => {
      response.statusCode = 200
      response.end(ready ? '<div id="root"></div>' : 'compiling')
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const urls = [`http://127.0.0.1:${server.address().port}`]
    try {
      await expect(waitForRenderers({ urls, timeoutMs: 20 })).rejects.toThrow('Renderer pages not ready')
      ready = true
      await waitForRenderers({ urls, timeoutMs: 100 })
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  })
})
