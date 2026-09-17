import { registerMainMethod } from '../ipc/index'
import type { LocalMethods, DownloadProgress } from '../../shared/communication/local-methods'
import type { InvocationContext } from '../ipc/router'
import { shell, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import path from 'node:path'
import fs from 'node:fs'
import Zip from 'node-stream-zip'
import { validateOpenPath } from '../security'
import {
  getYakitHome,
  getRemoteLinkDir,
  getYaklangEngineDir,
  getBasicDir,
  getRemoteLinkFile,
  getCodeDir,
  loadExtraFilePath,
  getYakitInstallDir,
} from '../filePath'
import {
  downloadYakitEE,
  downloadYakitCommunity,
  downloadIntranetYakit,
  downloadYakEngine,
  getDownloadUrl,
  getSuffix,
  fetchSpecifiedYakVersionHash,
} from './downloadClient'
import {
  getLocalEngineCacheName,
  writeEngineBuildType,
  writeEngineBuildTypeByVersion,
  fetchEngineBuildType,
  getLatestYakLocalEnginePath,
  fileSha256,
  getOssEngineVersion,
} from './engineVersion'
import { engineCancelRequestWithProgress, yakitCancelRequestWithProgress } from './downloadTask'
import { engineLogOutputFileAndUI } from '../logFile'
import type { YakClient } from '../../shared/generated/grpc/types'

interface RemoteAuth {
  name: string
  host: string
  port: string | number
  tls: boolean
  password: string
  caPem: string
}
interface Edition {
  isEnterprise: boolean
  isIRify: boolean
  isMemfit: boolean
}
const isWindows = process.platform === 'win32'
const runFile = promisify(execFile)
const getLatestYakLocalEngine = getLatestYakLocalEnginePath
const linkMethods = new Set([
  'GetBuildInEngineVersion',
  'InitCVEDatabase',
  'RestoreEngineAndPlugin',
  'cancel-download-yak-engine-version',
  'cancel-download-yakit-version',
  'clear-local-yaklang-version-cache',
  'download-latest-yak',
  'download-latest-yakit',
  'fetch-yak-engine-build-type',
  'generate-start-engine',
  'get-current-yak',
  'get-yakit-remote-auth-all',
  'install-yak-engine',
  'open-specified-file',
  'remove-yakit-remote-auth',
  'save-yakit-remote-auth',
  'write-engine-key-to-yakit-projects',
  'yak-engine-version-exists-and-correctness',
])

async function initial(): Promise<void> {
  for (const directory of [
    getRemoteLinkDir(),
    getBasicDir(),
    path.join(getYakitHome(), 'chrome-profile'),
    getYaklangEngineDir(),
    getCodeDir(),
  ]) {
    await fs.promises.mkdir(directory, { recursive: true })
  }
  try {
    const source = loadExtraFilePath(path.join('bins', 'resources'))
    if (!fs.existsSync(path.join(getBasicDir(), 'flag.txt'))) {
      for (const name of await fs.promises.readdir(source)) {
        if (name.endsWith('.txt')) {
          await fs.promises.copyFile(path.join(source, name), path.join(getBasicDir(), name)).catch(console.error)
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

function loadSecrets(): RemoteAuth[] {
  try {
    const values: unknown = JSON.parse(fs.readFileSync(getRemoteLinkFile(), 'utf8'))
    if (!Array.isArray(values)) return []
    return values.flatMap((value: unknown) => {
      if (!value || typeof value !== 'object' || !('host' in value) || !('port' in value)) return []
      const record = value as Record<string, unknown>
      if (
        typeof record.host !== 'string' ||
        !record.host ||
        !(typeof record.port === 'string' || typeof record.port === 'number') ||
        !record.port
      )
        return []
      return [
        {
          host: record.host,
          port: record.port,
          name: typeof record.name === 'string' && record.name ? record.name : `${record.host}:${record.port}`,
          tls: record.tls === true,
          password: typeof record.password === 'string' ? record.password : '',
          caPem: typeof record.caPem === 'string' ? record.caPem : '',
        },
      ]
    })
  } catch {
    return []
  }
}
function saveSecrets(values: RemoteAuth[]): void {
  const unique = values.filter((value, index) => values.findIndex((entry) => entry.name === value.name) === index)
  fs.writeFileSync(getRemoteLinkFile(), JSON.stringify(unique), { mode: 0o600 })
  if (!isWindows) fs.chmodSync(getRemoteLinkFile(), 0o600)
}

async function resolveEngineBuildType(version: string) {
  const localType = await fetchEngineBuildType(version)
  if (localType === 'slim') return localType
  const ver = getOssEngineVersion(version || '').replace(/^v/, '')
  if (!ver || ver === 'dev' || ver.startsWith('dev/')) return localType
  try {
    const engine = getLatestYakLocalEngine()
    if (!fs.existsSync(engine)) return localType
    const hash = await fetchSpecifiedYakVersionHash(`slim/${ver}`, { timeout: 3000 })
    if (hash && (await fileSha256(engine)) === hash) {
      try {
        writeEngineBuildType('slim')
      } catch {}
      return 'slim'
    }
  } catch {}
  return localType
}

async function writeEngineKey(version?: string): Promise<void> {
  if (process.platform !== 'darwin') return
  const target = path.join(getYakitHome(), 'engine-sha256.txt')
  await fs.promises.rm(target, { force: true })
  if (version) {
    const hash = await fetchSpecifiedYakVersionHash(version, { timeout: 2000 })
    await fs.promises.writeFile(target, hash)
  } else {
    const source = loadExtraFilePath(path.join('bins', 'engine-sha256.txt'))
    if (fs.existsSync(source)) await fs.promises.writeFile(target, (await fs.promises.readFile(source, 'utf8')).trim())
  }
}

async function removeEngine(target: string): Promise<void> {
  for (let remaining = 2; ; remaining--) {
    try {
      await fs.promises.rm(target, { force: true })
      return
    } catch (error) {
      if (
        remaining === 0 ||
        !(error instanceof Error) ||
        !/operation not permitted|resource busy|permission denied/i.test(error.message)
      )
        throw error
      await delay(500)
    }
  }
}

async function installYakEngine(version: string): Promise<void> {
  const source = path.join(getYaklangEngineDir(), getLocalEngineCacheName(version))
  const target = getLatestYakLocalEngine()
  await fs.promises.access(source, fs.constants.R_OK)
  await removeEngine(target)
  await fs.promises.copyFile(source, target)
  if (!isWindows) await fs.promises.chmod(target, 0o755)
  try {
    writeEngineBuildTypeByVersion(version)
  } catch {}
}

async function extractZip(source: string, entry: string | null, target: string): Promise<void> {
  if (!fs.existsSync(source)) throw new Error(`${source} not found`)
  const archive = new Zip.async({ file: source, storeEntries: true })
  try {
    await archive.extract(entry, target)
  } finally {
    await archive.close()
  }
}
async function extractScript(archiveName: string, fileName: string, targetDirectory: string): Promise<string> {
  const target = path.join(targetDirectory, fileName)
  await extractZip(loadExtraFilePath(path.join('bins/scripts', archiveName)), fileName, target)
  if (!isWindows) await fs.promises.chmod(target, 0o755)
  return target
}
async function initBuildInEngine(): Promise<void> {
  const source = loadExtraFilePath(path.join('bins', 'yak.zip'))
  const extracted = path.join(getYaklangEngineDir(), 'yak.build-in')
  const entry =
    process.platform === 'win32'
      ? 'bins/yak_windows_amd64.exe'
      : process.platform === 'darwin' || process.platform === 'linux'
        ? `bins/yak_${process.platform}_${process.arch === 'arm64' ? 'arm64' : 'amd64'}`
        : ''
  if (!entry) throw new Error(`Unsupported platform: ${process.platform}`)
  await extractZip(source, entry, extracted)
  const target = getLatestYakLocalEngine()
  await fs.promises.copyFile(extracted, target)
  if (!isWindows) await fs.promises.chmod(target, 0o755)
  try {
    writeEngineBuildType('full')
  } catch {}
}

function registerUpdates(win: BrowserWindow, ready: Promise<void> = Promise.resolve()): void {
  function handle<Api extends keyof LocalMethods>(name: Api, callback: Parameters<typeof registerMainMethod<Api>>[1]) {
    registerMainMethod(
      name,
      async (params, context) => {
        await ready
        if (context.signal.aborted) throw new Error('Operation aborted')
        return callback(params, context)
      },
      linkMethods.has(name) ? ['main', 'link'] : ['main'],
    )
  }
  handle('save-yakit-remote-auth', (params) => {
    if (
      !params.host ||
      !Number.isInteger(Number(params.port)) ||
      Number(params.port) < 1 ||
      Number(params.port) > 65535
    )
      throw new Error('Invalid remote engine host or port')
    const name = params.name || `${params.host}:${params.port}`
    saveSecrets([...loadSecrets().filter((entry) => entry.name !== name), { ...params, name }])
  })
  handle('remove-yakit-remote-auth', (name) => {
    saveSecrets(loadSecrets().filter((entry) => entry.name !== name))
  })
  handle('get-yakit-remote-auth-all', () => {
    return loadSecrets().flatMap((entry) => {
      const port = Number(entry.port)
      return Number.isInteger(port) && port >= 1 && port <= 65535 ? [{ ...entry, port }] : []
    })
  })
  handle('get-yakit-remote-auth-dir', () => {
    return getRemoteLinkDir()
  })
  let latestVersion: string | undefined
  let fetchingVersion: Promise<string> | undefined
  let cacheGeneration = 0
  function clearVersion() {
    latestVersion = undefined
    cacheGeneration++
  }
  async function runVersion(timeout: number): Promise<string> {
    const command = getLatestYakLocalEngine()
    try {
      await fs.promises.access(command, fs.constants.X_OK)
      const result = await runFile(command, ['-v'], { timeout, killSignal: 'SIGKILL', windowsHide: true })
      if (result.stderr) throw new Error(result.stderr)
      engineLogOutputFileAndUI(win, result.stdout)
      return result.stdout
    } catch (error) {
      engineLogOutputFileAndUI(
        win,
        `命令执行失败: ${command}\n${error instanceof Error ? error.message : String(error)}`,
      )
      throw error
    }
  }
  async function currentVersion(): Promise<string> {
    if (latestVersion) return latestVersion
    if (fetchingVersion) return fetchingVersion
    const generation = cacheGeneration
    fetchingVersion = (async () => {
      const stdout = await runVersion(5000)
      const version = /.*?yak(\.exe)?\s+version\s+(\S+)/.exec(stdout)?.[2]
      if (!version) throw new Error('引擎无法获取 yak 本地版本')
      if (generation === cacheGeneration) latestVersion = version
      return version
    })()
    try {
      return await fetchingVersion
    } finally {
      fetchingVersion = undefined
    }
  }
  handle('clear-local-yaklang-version-cache', clearVersion)
  handle('get-current-yak', currentVersion)
  handle('diagnosing-yak-version', () => runVersion(20000))
  handle('write-engine-key-to-yakit-projects', (version) => writeEngineKey(version))
  handle('fetch-yak-engine-build-type', (version, context) => resolveEngineBuildType(version || ''))
  handle('yak-engine-version-exists-and-correctness', async (version, context) => {
    const source = path.join(getYaklangEngineDir(), getLocalEngineCacheName(version))
    if (!fs.existsSync(source)) throw new Error('Engine version directory does not exist')
    const hash = await fetchSpecifiedYakVersionHash(version, { timeout: 3000 })
    return hash !== '' && (await fileSha256(source, context.signal)) === hash
  })
  handle(
    'download-latest-yak',
    (version, context) =>
      new Promise<void>((resolve, reject) => {
        const target = path.join(getYaklangEngineDir(), getLocalEngineCacheName(version))
        void downloadYakEngine(version, target, context.progress, resolve, reject, context.signal).catch(reject)
      }),
  )
  handle('install-yak-engine', async (version, context) => {
    await installYakEngine(version)
    clearVersion()
  })
  handle('download-latest-yakit', async ({ version: inputVersion, edition }, context) => {
    let version = inputVersion
    version = version.replace(/^v/, '')
    const { isEnterprise, isIRify, isMemfit } = edition
    const type = isIRify
      ? isEnterprise
        ? 'IRifyEE'
        : 'IRifyCE'
      : isMemfit
        ? 'Memfit'
        : isEnterprise
          ? 'YakitEE'
          : 'YakitCE'
    const url = await getDownloadUrl(version, type)
    await fs.promises.mkdir(getYakitInstallDir(), { recursive: true })
    const destination = path.join(getYakitInstallDir(), path.basename(url))
    await new Promise<void>((resolve, reject) => {
      const progress = context.progress
      const download =
        isEnterprise && !isMemfit
          ? downloadYakitEE(version, isIRify, destination, progress, resolve, reject, context.signal)
          : downloadYakitCommunity(version, isIRify, isMemfit, destination, progress, resolve, reject, context.signal)
      void download.catch(reject)
    })
  })
  async function downloadIntranet(
    url: string,
    context: Omit<InvocationContext, 'progress'> & { progress(data: DownloadProgress | 100): void },
  ): Promise<true | void> {
    await fs.promises.mkdir(getYakitInstallDir(), { recursive: true })
    const destination = path.join(getYakitInstallDir(), path.basename(url))
    if (fs.existsSync(destination)) return true
    await new Promise<void>((resolve, reject) => {
      void downloadIntranetYakit(url, destination, context.progress, resolve, reject, context.signal).catch(reject)
    })
  }
  handle('download-latest-intranet-yakit', (url, context) => downloadIntranet(url, context))
  handle('download-enpriTrace-latest-yakit', (url, context) => downloadIntranet(url, context))
  handle('update-enpritrace-info', () => {
    const suffix = getSuffix()
    const version =
      process.platform === 'darwin'
        ? `darwin${suffix}-${process.arch === 'arm64' ? 'arm64' : 'x64'}`
        : process.platform === 'win32'
          ? `windows${suffix}-amd64`
          : `linux${suffix}-${process.arch === 'arm64' ? 'arm64' : 'amd64'}`
    return { version }
  })
  handle('get-windows-install-dir', () => getLatestYakLocalEngine())
  handle('fetch-code-path', () => getCodeDir())
  handle('open-specified-file', (target) => {
    return shell.showItemInFolder(validateOpenPath(target, { allowBlockedExtensions: true }))
  })
  handle('generate-install-script', () =>
    extractScript(
      'auto-install-cert.zip',
      isWindows ? 'auto-install-cert.bat' : 'auto-install-cert.sh',
      getYakitHome(),
    ),
  )
  handle('generate-start-engine', async () => {
    const name = isWindows ? 'start-engine-grpc.bat' : 'start-engine-grpc.sh'
    if (!fs.existsSync(path.join(getYaklangEngineDir(), name)))
      await extractScript('start-engine.zip', name, getYaklangEngineDir())
    return ''
  })
  handle('generate-chrome-plugin', async () => {
    const target = path.join(getYakitHome(), 'google-chrome-plugin')
    await fs.promises.mkdir(target, { recursive: true })
    await extractZip(loadExtraFilePath(path.join('bins/scripts', 'google-chrome-plugin.zip')), null, target)
    return target
  })
  handle('InitCVEDatabase', async () => {
    const target = path.join(getYakitHome(), 'default-cve.db.gzip')
    const source = loadExtraFilePath(path.join('bins', 'database', 'default-cve.db.gzip'))
    if (!fs.existsSync(target) && fs.existsSync(source)) await fs.promises.copyFile(source, target)
  })
  handle('GetBuildInEngineVersion', async () => {
    if (!fs.existsSync(loadExtraFilePath(path.join('bins', 'yak.zip')))) return ''
    return (await fs.promises.readFile(loadExtraFilePath(path.join('bins', 'engine-version.txt')), 'utf8')).trim()
  })
  handle('RestoreEngineAndPlugin', async () => {
    clearVersion()
    const target = getLatestYakLocalEngine()
    await fs.promises.rm(path.join(getYaklangEngineDir(), 'yak.build-in'), { force: true })
    if (isWindows && fs.existsSync(target)) await fs.promises.access(target, fs.constants.F_OK | fs.constants.W_OK)
    await fs.promises.rm(path.join(getBasicDir(), 'flag.txt'), { force: true })
    await removeEngine(target)
    await initBuildInEngine()
  })
}

export { getLatestYakLocalEngine, initial, registerUpdates }
