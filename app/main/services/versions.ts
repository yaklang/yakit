import { sendEvent } from '../ipc/events'
import { registerMainMethod } from '../ipc/index'
import type { LocalMethods } from '../../shared/communication/local-methods'
import { app, type BrowserWindow } from 'electron'
import fs from 'node:fs'
import https from 'node:https'
import process from 'node:process'
import childProcess from 'node:child_process'
import spawn from 'cross-spawn'
import type { AxiosRequestConfig } from 'axios'
import { getLocalYaklangEngine } from '../filePath'
import {
  fetchLatestYakEngineVersion,
  fetchLatestYakitEEVersion,
  fetchLatestYakitVersion,
  fetchLatestYakitIRifyVersion,
  fetchLatestYakitIRifyEEVersion,
  getAvailableOSSDomain,
  fetchSpecifiedYakVersionHash,
  fetchLatestYakitMemfitVersion,
} from './downloadClient'
import mainIPC from '../bootstrap'
const { testEngineAvaiableVersion } = mainIPC
import { engineLogOutputFileAndUI } from '../logFile'

async function fetchVersionList() {
  const domain = await getAvailableOSSDomain()
  return new Promise<string>((resolve, reject) => {
    https
      .get(`https://${domain}/yak/version-info/active_versions.txt`, (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('error', reject)
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      })
      .on('error', reject)
  })
}

export function registerVersions(win: BrowserWindow) {
  const handle = <Api extends keyof LocalMethods>(api: Api, handler: Parameters<typeof registerMainMethod<Api>>[1]) =>
    registerMainMethod(api, handler, ['main', 'link'])
  handle('get-available-oss-domain', () => getAvailableOSSDomain())
  handle('is-yaklang-engine-installed', () => {
    const enginePath = getLocalYaklangEngine()
    return !!enginePath && fs.existsSync(enginePath)
  })
  handle('fetch-latest-yaklang-version', async () => String(await fetchLatestYakEngineVersion()).trim())
  handle('fetch-yakit-version', () => app.getVersion())
  handle('fetch-latest-yakit-version', (params, context) => {
    const fetchers: Record<string, typeof fetchLatestYakitVersion> = {
      Yakit: fetchLatestYakitVersion,
      EnpriTrace: fetchLatestYakitEEVersion,
      IRify: fetchLatestYakitIRifyVersion,
      'IRify-EnpriTrace': fetchLatestYakitIRifyEEVersion,
      'Memfit AI': fetchLatestYakitMemfitVersion,
    }
    return (fetchers[params.releaseEditionName] ?? fetchLatestYakitVersion)({
      ...params.config,
      signal: context.signal,
    })
  })
  handle('fetch-check-yaklang-source', ({ version, requestConfig }, context) =>
    fetchSpecifiedYakVersionHash(version, { ...requestConfig, signal: context.signal }),
  )
  handle('fetch-yaklang-version-list', () => fetchVersionList())
  handle('kill-old-engine-process', (type) => sendEvent(win.webContents, 'kill-old-engine-process-callback', type))
  // 获取有效的引擎启动端口
  const asyncGetAvaiablePort = (params: unknown) => {
    return new Promise<number>((resolve, reject) => {
      const commandParams = ['get-random-port', '-type', 'tcp', '-json']
      engineLogOutputFileAndUI(win, '----- 获取启动引擎可用端口号 -----')
      engineLogOutputFileAndUI(win, `执行命令: ${getLocalYaklangEngine()} ${commandParams.join(' ')}`)

      const enginePath = getLocalYaklangEngine()
      if (!enginePath) throw new Error('Engine path is unavailable')
      const child = spawn(enginePath, commandParams, { timeout: 5200 })
      let stdout = ''
      let stderr = ''
      let finished = false
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true
          child.kill()
          try {
            if (process.platform === 'win32') {
              childProcess.exec(`taskkill /PID ${child.pid} /T /F`)
            } else {
              if (child.pid) process.kill(child.pid, 'SIGKILL')
            }
          } catch (e) {
          } finally {
            engineLogOutputFileAndUI(win, '----- 引擎获取端口超时 -----')
            reject('引擎获取端口超时，请重置内置引擎')
          }
        }
      }, 5000)
      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })
      child.on('error', (err) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        engineLogOutputFileAndUI(win, `err: ${err.toString()}`)
        reject(`[YakEnginePort] ${err.name}: ${err.message}`)
      })
      child.on('close', (code) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        engineLogOutputFileAndUI(win, stdout)
        const arr = stdout
          .split('\n')
          .map((item) => item.trim())
          .map((item) => {
            const val =
              item.match(
                /^<f345213fb48cc9370b2abc97429f8e6e98d07fa0bad8577626af6bc8067c1d18>({.*})<\/f345213fb48cc9370b2abc97429f8e6e98d07fa0bad8577626af6bc8067c1d18>$/,
              ) || []
            const match = val[1]
            return match
          })
          .filter(Boolean)
        if (arr.length === 0) {
          engineLogOutputFileAndUI(win, '----- 引擎无法获取可用端口号 -----')
          if (code !== 0 || stderr) {
            engineLogOutputFileAndUI(win, stderr || `Process exited with code ${code}`) // 只在失败时输出stderr
          }
          reject('引擎无法获取可用端口号, 请重置内置引擎')
          return
        }
        try {
          const cleanedOutput = arr[0].trim()
          const result: unknown = JSON.parse(cleanedOutput)
          if (
            !result ||
            typeof result !== 'object' ||
            !('port' in result) ||
            typeof result.port !== 'number' ||
            !Number.isInteger(result.port) ||
            result.port < 1 ||
            result.port > 65535
          )
            throw new Error('Engine returned an invalid port')
          finished = true
          clearTimeout(timer)
          engineLogOutputFileAndUI(win, `----- 获取启动引擎可用端口成功: ${result.port} -----`)
          resolve(result.port)
        } catch (parseError) {
          engineLogOutputFileAndUI(win, '[YakEnginePort] 解析stdout异常: ' + parseError)
          reject(parseError)
        }
      })
    })
  }
  handle('get-avaiable-port', async (params) => {
    return await asyncGetAvaiablePort(params)
  })

  // 获取运行引擎的适配版本
  handle('determine-adapted-version-engine', async (params) => {
    return await testEngineAvaiableVersion(params)
  })

  handle('fetch-local-engine-path', async () => {
    return getLocalYaklangEngine()
  })
}
