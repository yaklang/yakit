import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { access, cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 从脚本位置定位仓库，避免调用方的工作目录影响入口和资源路径。
export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
// 键对应产物路径；源码省略扩展名，允许各入口独立从 JS 迁移到 TS。
const entrySources = {
  'main/index': 'app/main/index',
  'preload/main': 'app/main/preload',
  'preload/engine-link': 'app/main/engineLinkPreload',
  'preload/screenshots': 'app/main/screenshots/preload',
}

// 检查路径是否可访问；缺失或无权限时均视为不可用。
export const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  )
// 继承终端输出，并将启动失败、非零退出或信号退出传递给构建调用方。
export const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: 'inherit', ...options })
    child.once('error', reject)
    child.once('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited: ${signal || code}`)),
    )
  })

export function assertMode(mode) {
  if (!['development', 'production'].includes(mode)) throw new Error(`Unknown Electron build mode: ${mode}`)
}

// 主进程、preload 及构建测试共用的转换选项。
export function codeOptions(mode) {
  assertMode(mode)
  return {
    absWorkingDir: repoRoot,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    // 以 Electron 22 的运行时版本为语法兼容下限。
    target: ['node16.17', 'chrome108'],
    minify: mode === 'production',
    // 发布也生成 map，但不在 JS 中附加引用；开发产物附加引用方便调试。
    sourcemap: mode === 'production' ? 'external' : 'linked',
    sourcesContent: true,
    legalComments: 'external',
    metafile: true,
    // 供 runtimePaths 判断当前运行的是 bundle，切换资源路径的定位方式。
    define: { __YAKIT_BUNDLE__: 'true' },
    logLevel: 'warning',
  }
}

// esbuild 只转换 TS 语法，类型检查交给 tsc；主进程与 preload 分别使用各自配置。
export async function typecheck() {
  const tsc = require.resolve('typescript/bin/tsc')
  for (const config of ['tsconfig.electron.json', 'tsconfig.preload.json']) {
    await run(process.execPath, [tsc, '-p', config])
  }
}

// 迁移期间禁止同目录下同时存在同名 .js/.ts，避免模块解析选中错误的实现。
// 声明文件、测试及第三方库目录不参与这项业务源码检查。
async function checkSourceNames(directory = path.join(repoRoot, 'app/main')) {
  const names = new Set()
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!['__test__', 'libs', 'lib'].includes(item.name)) await checkSourceNames(path.join(directory, item.name))
    } else if (/\.(js|ts)$/.test(item.name) && !item.name.endsWith('.d.ts')) {
      const name = item.name.replace(/\.(js|ts)$/, '')
      if (names.has(name)) throw new Error(`Duplicate JS/TS module: ${path.join(directory, name)}`)
      names.add(name)
    }
  }
}

// bundle 依赖显式的 IPC 模块清单；逐组核对目录，及时发现新增或删除后未同步的模块。
// 此处只读取 loader 的名称，不执行 loader，避免触发业务模块的初始化。
export async function checkRegistry() {
  const modules = require('../app/main/ipcModules.js')
  for (const [group, loaders] of Object.entries(modules)) {
    const files = (await readdir(path.join(repoRoot, 'app/main', group)))
      .filter((file) => /\.(js|ts)$/.test(file) && !file.endsWith('.d.ts'))
      .map((file) => file.replace(/\.(js|ts)$/, ''))
      .sort()
    if (JSON.stringify(files) !== JSON.stringify(Object.keys(loaders).sort())) {
      throw new Error(
        `IPC module list differs from app/main/${group}; update app/main/ipcModules.js (no duplicate JS/TS names)`,
      )
    }
  }
}

// 每个入口必须且只能有一种源码扩展名，缺失或重复都中止构建。
async function resolveEntry(base) {
  const candidates = []
  for (const ext of ['js', 'ts'])
    if (await exists(path.join(repoRoot, `${base}.${ext}`))) candidates.push(`${base}.${ext}`)
  if (candidates.length !== 1) throw new Error(`Expected one JS/TS entry for ${base}, found ${candidates.length}`)
  return candidates[0]
}

// 原生模块、独立窗口页面及 vendor 文件保留文件形态，复制到统一的资源目录。
async function copyResources(outputDir, mode) {
  const copies = [
    ['app/main/screenshots/lib', 'screenshots'],
    ['app/main/handlers/openNewChildWindow/index.html', 'child-window/index.html'],
    ['app/main/handlers/libs', 'vendor'],
  ]
  // 发布优先采用渲染端构建生成的主题；开发读取源码目录中生成的主题。
  const themeCandidates =
    mode === 'development'
      ? ['app/main/handlers/openNewChildWindow/theme.css']
      : ['app/renderer/pages/main/theme.css', 'app/main/handlers/openNewChildWindow/theme.css']
  const theme = (
    await Promise.all(themeCandidates.map(async (file) => ((await exists(path.join(repoRoot, file))) ? file : null)))
  ).find(Boolean)
  if (!theme) throw new Error('Missing child-window theme.css; start or build the main renderer first')
  copies.push([theme, 'child-window/theme.css'])
  for (const [source, target] of copies) {
    const dest = path.join(outputDir, 'resources', target)
    await mkdir(path.dirname(dest), { recursive: true })
    await cp(path.join(repoRoot, source), dest, { recursive: true })
  }
}

// 打安装包前检查页面及公共运行资源；仅构建主进程时不要求两个渲染端已有产物。
export async function validateRendererArtifacts(root = repoRoot) {
  const required = [
    'app/renderer/pages/main/index.html',
    'app/renderer/pages/main/yakit-aux.html',
    'app/renderer/pages/main/theme.css',
    'app/renderer/engine-link-startup/dist/index.html',
    'app/renderer/electron/electron.html',
    'app/protos/grpc.proto',
    'app/assets/导入模板.xlsx',
  ]
  for (const file of required) {
    if (!(await exists(path.join(root, file))))
      throw new Error(`Missing runtime resource: ${file}; build both renderers before packaging`)
  }
}

// 单次构建：检查源码 → 构建四个入口 → 复制资源 → 替换输出目录。
// 不监听源码变化，也不启动或重启 Electron。
export async function buildElectron({ mode = 'production' } = {}) {
  assertMode(mode)
  // 开发构建只转换和打包；类型检查可独立执行，发布构建仍强制检查。
  if (mode === 'production') await typecheck()
  await checkRegistry()
  await checkSourceNames()
  const manifest = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'))
  const parent = path.join(repoRoot, 'dist')
  await mkdir(parent, { recursive: true })
  // 先写临时目录，入口编译或资源复制失败时保留原有产物。
  const staging = await mkdtemp(path.join(parent, '.electron-'))
  const output = path.join(parent, 'electron')
  const hashes = {}
  const metadata = {}
  try {
    for (const [name, source] of Object.entries(entrySources)) {
      const entry = await resolveEntry(source)
      const isPreload = name.startsWith('preload/')
      const result = await build({
        ...codeOptions(mode),
        entryPoints: [entry],
        outfile: path.join(staging, `${name}.js`),
        // 主进程的生产依赖由安装包提供；preload 则打入普通依赖，减少沙箱内的 require。
        external: isPreload ? ['electron'] : ['electron', ...Object.keys(manifest.dependencies)],
        tsconfig: path.join(repoRoot, isPreload ? 'tsconfig.preload.json' : 'tsconfig.electron.json'),
      })
      // 沙箱 preload 只能 require Electron 及有限的内置模块，构建时拦截不支持的外部依赖。
      for (const artifact of Object.values(result.metafile.outputs)) {
        for (const imported of artifact.imports) {
          if (
            isPreload &&
            imported.external &&
            !['electron', 'events', 'node:events', 'timers', 'node:timers', 'url', 'node:url'].includes(imported.path)
          ) {
            throw new Error(`Sandbox preload ${name} cannot require ${imported.path}`)
          }
        }
      }
      // 用内容哈希关联实际 JS 产物与诊断文件，metafile 则记录 bundle 的依赖组成。
      hashes[`${name}.js`] = createHash('sha256')
        .update(await readFile(path.join(staging, `${name}.js`)))
        .digest('hex')
      metadata[name] = result.metafile
    }
    await copyResources(staging, mode)
    await writeFile(
      path.join(staging, 'build-info.json'),
      JSON.stringify({ mode, version: manifest.version, hashes }, null, 2) + '\n',
    )
    await writeFile(path.join(staging, 'metafile.json'), JSON.stringify(metadata, null, 2) + '\n')
    // 所有入口和资源准备完成后才替换正式目录，同时清除上次构建遗留的文件。
    await rm(output, { recursive: true, force: true })
    await rename(staging, output)
    console.log(`[electron-build] ${mode}: ${Object.keys(hashes).join(', ')}`)
    return output
  } finally {
    // 成功时临时目录已被移动；失败时删除尚未完成的临时产物。
    await rm(staging, { recursive: true, force: true })
  }
}

// electron-builder 可能在同一进程中并行准备多个架构；共享构建 Promise，
// 让各架构使用同一份完整产物，避免重复构建时互相覆盖输出目录。
let packBuild
export async function prepareElectronPack(context) {
  if (!packBuild) {
    packBuild = (async () => {
      await validateRendererArtifacts()
      return buildElectron({ mode: 'production' })
    })().catch((error) => {
      // 失败后清除缓存，允许后续调用重新尝试构建。
      packBuild = undefined
      throw error
    })
  }
  const output = await packBuild
  // electron-builder 的架构参数是数字枚举，转换为资源文件名使用的架构标识。
  const architecture = { 0: 'ia32', 1: 'x64', 3: 'arm64' }[context.arch]
  const info = JSON.parse(await readFile(path.join(output, 'build-info.json'), 'utf8'))
  const electronVersion = context.packager.config.electronVersion || require('electron/package.json').version
  // 按应用版本、发行版、平台、架构、Electron 版本和主入口哈希隔离诊断文件。
  const diagnosticName = [
    info.version,
    process.env.YAKIT_EDITION || 'yakit',
    context.electronPlatformName,
    architecture,
    electronVersion,
    info.hashes['main/index.js'].slice(0, 12),
  ].join('-')
  // map 单独归档供发布问题排查；安装包是否包含这些文件由打包配置控制。
  const diagnostics = path.join(repoRoot, 'reports/electron-build', diagnosticName)
  for (const entry of Object.keys(entrySources)) {
    const dest = path.join(diagnostics, `${entry}.js.map`)
    await mkdir(path.dirname(dest), { recursive: true })
    await cp(path.join(output, `${entry}.js.map`), dest)
  }
  await writeFile(
    path.join(diagnostics, 'build-info.json'),
    JSON.stringify({ ...info, electronVersion, platform: context.electronPlatformName, architecture }, null, 2) + '\n',
  )
  // 检查目标平台需要的截图原生模块，以及 Windows 对应位数的进程查询程序。
  const platform = context.electronPlatformName
  if (['darwin', 'win32'].includes(platform)) {
    const suffix = platform === 'win32' ? '-msvc' : ''
    const nativeFile = path.join(
      output,
      'resources/screenshots',
      `node-screenshots.${platform}-${architecture}${suffix}.node`,
    )
    if (!(await exists(nativeFile))) throw new Error(`Missing native resource: ${nativeFile}`)
  }
  if (platform === 'win32' && ['ia32', 'x64'].includes(architecture)) {
    const binary = architecture === 'ia32' ? 'x86' : 'x64'
    const executable = path.join(output, 'resources/vendor/extVendor', `fastlist-0.3.0-${binary}.exe`)
    if (!(await exists(executable))) throw new Error(`Missing Windows process helper: ${executable}`)
  }
}

// 仅直接执行脚本时解析 CLI 参数；被打包钩子或测试导入时只提供函数。
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 2 || args[0] !== '--mode'))
    throw new Error('Usage: build-electron.mjs [--mode development|production]')
  await buildElectron({ mode: args[1] || 'production' })
}
