// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { build } from 'esbuild'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import {
  buildChildWindowTheme,
  buildElectron,
  checkRegistry,
  codeOptions,
  exists,
  repoRoot,
  validateRendererArtifacts,
} from '../../../scripts/build-electron.mjs'
import { waitForRenderers } from '../../../scripts/start-electron.mjs'

const require = createRequire(import.meta.url)
let temporary
let developmentSize
const output = path.join(repoRoot, 'dist/electron')
const execFileAsync = promisify(execFile)

beforeAll(async () => {
  await mkdir(path.join(repoRoot, 'dist'), { recursive: true })
  temporary = await mkdtemp(path.join(repoRoot, 'dist/.electron-test-'))
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
  it('builds with only root dependencies and main sources, then reuses its own theme', async () => {
    const isolated = path.join(temporary, 'standalone')
    await mkdir(path.join(isolated, 'scripts'), { recursive: true })
    for (const file of [
      'package.json',
      'tsconfig.electron.json',
      'tsconfig.preload.json',
      'scripts/build-electron.mjs',
    ]) {
      await cp(path.join(repoRoot, file), path.join(isolated, file))
    }
    await cp(path.join(repoRoot, 'app/main'), path.join(isolated, 'app/main'), {
      recursive: true,
      filter: (file) => !['theme.css', '__test__'].includes(path.basename(file)),
    })
    await symlink(path.join(repoRoot, 'node_modules'), path.join(isolated, 'node_modules'), 'junction')
    const cold = await execFileAsync(process.execPath, ['scripts/build-electron.mjs', '--mode', 'production'], {
      cwd: isolated,
    })
    expect(cold.stdout).toContain('theme: generated')
    const cssPath = path.join(isolated, 'dist/electron/resources/child-window/theme.css')
    const css = await readFile(cssPath, 'utf8')
    expect(css).toBe(require('@yakit-libs/color/css').generateThemeCss('#F17F30'))
    const warm = await execFileAsync(process.execPath, ['scripts/build-electron.mjs', '--mode', 'development'], {
      cwd: isolated,
    })
    expect(warm.stdout).toContain('theme: cached')
    expect(await readFile(cssPath, 'utf8')).toBe(css)
    expect(await exists(path.join(isolated, 'app/renderer'))).toBe(false)
    expect(await exists(path.join(isolated, 'app/main/handlers/openNewChildWindow/theme.css'))).toBe(false)
  }, 30000)

  it.each(['valid', 'missing-css', 'corrupt-css', 'color', 'version', 'invalid-metadata'])(
    'validates the %s theme cache before reusing it',
    async (state) => {
      const previous = path.join(temporary, `theme-cache-${state}`)
      const next = path.join(temporary, `theme-next-${state}`)
      const info = await buildChildWindowTheme(previous, path.join(temporary, 'no-cache'))
      const cssPath = path.join(previous, 'resources/child-window/theme.css')
      const css = await readFile(cssPath, 'utf8')
      const theme = { ...info }
      if (state === 'missing-css') await rm(cssPath)
      if (state === 'corrupt-css') await writeFile(cssPath, 'stale theme')
      if (state === 'color') theme.mainColor = '#000000'
      if (state === 'version') theme.colorVersion = '0.0.0'
      await writeFile(
        path.join(previous, 'build-info.json'),
        state === 'invalid-metadata' ? '{' : JSON.stringify({ theme }),
      )
      const generate = vi.spyOn(require('@yakit-libs/color/node'), 'writeThemeCss')
      try {
        expect(await buildChildWindowTheme(next, previous)).toEqual(info)
        expect(generate).toHaveBeenCalledTimes(state === 'valid' ? 0 : 1)
        expect(await readFile(path.join(next, 'resources/child-window/theme.css'), 'utf8')).toBe(css)
      } finally {
        generate.mockRestore()
      }
    },
  )

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

  it.each([
    ['development', 'uiOperate'],
    ['production', 'uiOperate'],
    ['development', 'newUiOperate'],
    ['production', 'newUiOperate'],
  ])('updates CPU samples in the strict %s bundle for %s', async (mode, group) => {
    const result = await build({
      ...codeOptions(mode),
      entryPoints: [`app/main/${group}/hardware.js`],
      outfile: path.join(temporary, `${group}-${mode}.cjs`),
      tsconfig: path.join(repoRoot, 'tsconfig.electron.json'),
      external: ['*'],
      write: false,
    })
    const source = result.outputFiles.find((file) => file.path.endsWith('.cjs')).text
    expect(source).toMatch(/^["']use strict["']/)

    const handlers = new Map()
    let tick = 0
    const cpus = vi.fn(() => {
      tick += 1
      // Two cores with 20% and 30% idle time produce 75% total CPU usage.
      return [{ times: { idle: tick * 20, user: tick * 80 } }, { times: { idle: tick * 30, user: tick * 70 } }]
    })
    vi.useFakeTimers()
    try {
      const context = {
        module: { exports: {} },
        setInterval,
        clearInterval,
        require: (id) => {
          if (id === 'electron') return { ipcMain: { handle: (channel, callback) => handlers.set(channel, callback) } }
          if (id === 'os') return { cpus }
          if (id === '../filePath' || id === '../logFile') return {}
          return require(id)
        },
      }
      vm.runInNewContext(source, context)
      const prefix = group === 'newUiOperate' ? 'Child:' : ''
      if (prefix) context.module.exports.registerNewIPC({}, vi.fn(), prefix)
      else context.module.exports({}, vi.fn())

      const samples = () => Array.from(handlers.get(`${prefix}fetch-compute-percent`)())
      expect(samples()).toEqual(Array(10).fill(0))
      handlers.get(`${prefix}start-compute-percent`)()
      // Advancing timers also flushes Promise callbacks; Vitest fails on unhandled rejections.
      await vi.advanceTimersByTimeAsync(2000)
      expect(samples()).toHaveLength(10)
      expect(samples()).toContain(75)
      expect(samples().every((value) => value === 0 || value === 75)).toBe(true)
      expect(Object.hasOwn(context, 'type')).toBe(false)

      handlers.get(`${prefix}clear-compute-percent`)()
      await vi.advanceTimersByTimeAsync(1000)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it.each(['development', 'production'])('handles port listeners in the strict %s bundle', async (mode) => {
    const result = await build({
      ...codeOptions(mode),
      entryPoints: ['app/main/handlers/listenPort.js'],
      outfile: path.join(temporary, `listen-port-${mode}.cjs`),
      tsconfig: path.join(repoRoot, 'tsconfig.electron.json'),
      external: ['electron'],
      write: false,
    })
    const source = result.outputFiles.find((file) => file.path.endsWith('.cjs')).text
    expect(source).toMatch(/^["']use strict["']/)

    const handlers = new Map()
    const streams = Array.from({ length: 2 }, () =>
      Object.assign(new EventEmitter(), { write: vi.fn(), cancel: vi.fn() }),
    )
    const openPort = vi.fn().mockReturnValueOnce(streams[0]).mockReturnValueOnce(streams[1])
    const send = vi.fn()
    const context = {
      module: { exports: {} },
      Buffer,
      require: (id) => {
        if (id === 'electron') return { ipcMain: { handle: (channel, callback) => handlers.set(channel, callback) } }
        throw new Error(`Unexpected module: ${id}`)
      },
    }
    vm.runInNewContext(source, context)
    context.module.exports({ webContents: { send } }, () => ({ OpenPort: openPort }))

    const listen = handlers.get('listening-port')
    await listen({}, '127.0.0.1', 9001)
    await listen({}, '127.0.0.1', 9002)
    expect(streams[0].write).toHaveBeenCalledWith({ host: '127.0.0.1', port: 9001 })
    expect(streams[1].write).toHaveBeenCalledWith({ host: '127.0.0.1', port: 9002 })
    expect(Array.from(handlers.get('listening-port-query-addrs')())).toEqual(['127.0.0.1:9001', '127.0.0.1:9002'])
    await expect(listen({}, '127.0.0.1', 9001)).rejects.toThrow('listened port')
    expect(openPort).toHaveBeenCalledTimes(2)
    expect(Object.hasOwn(context, 'stream')).toBe(false)

    await handlers.get('listening-port-input')({}, '127.0.0.1:9001', 'hello')
    expect(streams[0].write).toHaveBeenLastCalledWith({ raw: Buffer.from('hello', 'utf8') })
    expect(streams[1].write).toHaveBeenCalledTimes(1)
    const error = new Error('connection closed')
    const data = { raw: Buffer.from('response') }
    streams[0].emit('error', error)
    streams[0].emit('data', data)
    streams[0].emit('end')
    expect(send.mock.calls).toEqual([
      ['client-listening-port-error-127.0.0.1:9001', error],
      ['client-listening-port-data-127.0.0.1:9001', data],
      ['client-listening-port-end-127.0.0.1:9001', '127.0.0.1:9001'],
    ])

    await handlers.get('listening-port-cancel')({}, '127.0.0.1:9001')
    expect(streams[0].cancel).toHaveBeenCalledTimes(1)
    expect(streams[1].cancel).not.toHaveBeenCalled()
    expect(Array.from(handlers.get('listening-port-query-addrs')())).toEqual(['127.0.0.1:9002'])
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

const rendererResources = [
  'app/renderer/pages/main/index.html',
  'app/renderer/pages/main/yakit-aux.html',
  'app/renderer/pages/main/theme.css',
  'app/renderer/engine-link-startup/dist/index.html',
  'app/renderer/electron/electron.html',
  'app/protos/grpc.proto',
  'app/assets/导入模板.xlsx',
]

async function writeFixtureFile(root, file, contents = 'fixture') {
  const target = path.join(root, file)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, contents)
}

// Run the unchanged build script in a fresh Node process so packBuild is isolated.
// Small source/resource fixtures exercise the real build and filesystem without packaging Electron.
async function createPackFixture() {
  const root = await mkdtemp(path.join(temporary, 'pack-'))
  await mkdir(path.join(root, 'scripts'))
  for (const file of ['scripts/build-electron.mjs', 'tsconfig.electron.json', 'tsconfig.preload.json']) {
    await cp(path.join(repoRoot, file), path.join(root, file))
  }
  await symlink(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction')
  await writeFixtureFile(root, 'package.json', JSON.stringify({ version: '1.2.3', dependencies: {} }))
  for (const file of ['index.js', 'preload.js', 'engineLinkPreload.js', 'screenshots/preload.js', 'ipcModules.js']) {
    await writeFixtureFile(root, `app/main/${file}`, 'module.exports = {}\n')
  }
  await mkdir(path.join(root, 'app/main/screenshots/lib'), { recursive: true })
  await writeFixtureFile(root, 'app/main/handlers/libs/fixture.js', 'module.exports = {}\n')
  await writeFixtureFile(root, 'app/main/handlers/openNewChildWindow/index.html', '<html></html>')
  for (const file of rendererResources) await writeFixtureFile(root, file)
  return {
    root,
    run: async (body) => {
      await writeFixtureFile(
        root,
        'verify.mjs',
        `
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { prepareElectronPack, repoRoot } from './scripts/build-electron.mjs'
const require = createRequire(import.meta.url)
const context = (platform, arch, config = {}) => ({ electronPlatformName: platform, arch, packager: { config } })
const output = path.join(repoRoot, 'dist/electron')
${body}
`,
      )
      return execFileAsync(process.execPath, ['verify.mjs'], {
        cwd: root,
        env: { ...process.env, YAKIT_EDITION: 'memfit' },
      })
    },
  }
}

describe('Electron package preparation', () => {
  it('shares one build across concurrent architectures and archives matching maps and metadata', async () => {
    const fixture = await createPackFixture()
    const result = await fixture.run(`
const targets = [context('linux', 1, { electronVersion: '22.3.27' }), context('linux', 3)]
await Promise.all(targets.map((target) => prepareElectronPack(target)))
await prepareElectronPack(targets[0])
const info = JSON.parse(await readFile(path.join(output, 'build-info.json'), 'utf8'))
assert.equal(info.mode, 'production')
assert.equal(info.version, '1.2.3')
assert.equal(Object.keys(info.hashes).length, 4)
for (const [index, architecture] of ['x64', 'arm64'].entries()) {
  const electronVersion = index === 0 ? '22.3.27' : require('electron/package.json').version
  const archive = path.join(repoRoot, 'reports/electron-build',
    '1.2.3-memfit-linux-' + architecture + '-' + electronVersion + '-' + info.hashes['main/index.js'].slice(0, 12))
  assert.deepEqual(JSON.parse(await readFile(path.join(archive, 'build-info.json'), 'utf8')),
    { ...info, electronVersion, platform: 'linux', architecture })
  for (const [entry, hash] of Object.entries(info.hashes)) {
    assert.equal(createHash('sha256').update(await readFile(path.join(output, entry))).digest('hex'), hash)
    assert.deepEqual(await readFile(path.join(archive, entry + '.map')), await readFile(path.join(output, entry + '.map')))
  }
}
`)
    expect(result.stdout.match(/\[electron-build\] production:/g)).toHaveLength(1)
  }, 30000)

  it.each(['renderer', 'build'])(
    'allows retry after a %s failure',
    async (failure) => {
      const fixture = await createPackFixture()
      const missing = failure === 'renderer' ? rendererResources[3] : 'app/main/screenshots/preload.js'
      const expected = failure === 'renderer' ? 'Missing runtime resource:' : 'Expected one JS/TS entry'
      const result = await fixture.run(`
const missing = ${JSON.stringify(missing)}
const original = await readFile(missing)
await rm(missing)
const target = context('linux', 1)
await assert.rejects(prepareElectronPack(target), (error) => error.message.includes(${JSON.stringify(expected)}))
await writeFile(missing, original)
await prepareElectronPack(target)
assert.equal(JSON.parse(await readFile(path.join(output, 'build-info.json'), 'utf8')).mode, 'production')
`)
      expect(result.stdout.match(/\[electron-build\] production:/g)).toHaveLength(1)
    },
    30000,
  )

  it.each(rendererResources)('rejects packaging resources missing %s', async (missing) => {
    const fixture = await createPackFixture()
    await expect(validateRendererArtifacts(fixture.root)).resolves.toBeUndefined()
    await rm(path.join(fixture.root, missing))
    await expect(validateRendererArtifacts(fixture.root)).rejects.toThrow(`Missing runtime resource: ${missing};`)
  })

  it.each([
    ['darwin', 1, 'node-screenshots.darwin-x64.node', null],
    ['darwin', 3, 'node-screenshots.darwin-arm64.node', null],
    ['win32', 0, 'node-screenshots.win32-ia32-msvc.node', 'fastlist-0.3.0-x86.exe'],
    ['win32', 1, 'node-screenshots.win32-x64-msvc.node', 'fastlist-0.3.0-x64.exe'],
    ['win32', 3, 'node-screenshots.win32-arm64-msvc.node', null],
    ['linux', 1, null, null],
    ['linux', 3, null, null],
  ])(
    'checks only the required resources for %s architecture %s',
    async (platform, arch, nativeFile, helper) => {
      const fixture = await createPackFixture()
      if (nativeFile) await writeFixtureFile(fixture.root, `app/main/screenshots/lib/${nativeFile}`)
      if (helper) await writeFixtureFile(fixture.root, `app/main/handlers/libs/extVendor/${helper}`)
      await fixture.run(`
const target = context(${JSON.stringify(platform)}, ${arch})
await prepareElectronPack(target)
const nativeFile = ${JSON.stringify(nativeFile)}
if (nativeFile) {
  const file = path.join(output, 'resources/screenshots', nativeFile)
  const original = await readFile(file)
  await rm(file)
  await assert.rejects(prepareElectronPack(target), { message: 'Missing native resource: ' + file })
  await writeFile(file, original)
}
const helper = ${JSON.stringify(helper)}
if (helper) {
  const file = path.join(output, 'resources/vendor/extVendor', helper)
  await rm(file)
  await assert.rejects(prepareElectronPack(target), { message: 'Missing Windows process helper: ' + file })
}
`)
    },
    30000,
  )
})
