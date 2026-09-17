import { spawn } from 'node:child_process'
import { getLocalYaklangEngine } from '../filePath'
import { psYakList, killYakGRPC } from '../services/processes'
import { registerMainMethod } from '../ipc/index'
import type { LocalMethods } from '../../shared/communication/local-methods'

type DynamicControlParams = LocalMethods['start-dynamic-control']['request']
let pid: number | undefined
let cancelStart: (() => void) | undefined

export async function asyncKillDynamicControl(): Promise<void> {
  cancelStart?.()
  const ownedPid = pid
  if (!ownedPid) return
  const processes = await psYakList()
  const processItem = processes.find((item) => (process.platform === 'win32' ? item.ppid : item.pid) === ownedPid)
  if (processItem) await killYakGRPC(processItem.pid)
  if (pid === ownedPid) pid = undefined
}

export function startDynamicControl(params: DynamicControlParams, signal: AbortSignal): Promise<{ alive: boolean }> {
  if (signal.aborted)
    return Promise.reject(Object.assign(new Error('Dynamic control startup aborted'), { code: 'ABORTED' }))
  if (cancelStart) return Promise.reject(new Error('Dynamic control is already starting'))
  if (pid) return Promise.resolve({ alive: true })
  const enginePath = getLocalYaklangEngine()
  if (!enginePath) return Promise.reject(new Error('Engine path is unavailable'))
  return new Promise((resolve, reject) => {
    let settled = false
    let ready = false
    let output = ''
    let readyTimer: ReturnType<typeof setTimeout> | undefined
    const subprocess = spawn(
      enginePath,
      [
        'xgrpc',
        '--server',
        params.server,
        '--gen-tls-crt',
        String(params.gen_tls_crt),
        '--secret',
        params.secret,
        '--note',
        params.note,
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    pid = subprocess.pid
    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      clearTimeout(readyTimer)
      signal.removeEventListener('abort', abort)
      if (cancelStart === abort) cancelStart = undefined
      if (error) {
        if (pid === subprocess.pid) pid = undefined
        subprocess.kill()
        reject(error)
      } else resolve({ alive: false })
    }
    const abort = () => finish(Object.assign(new Error('Dynamic control startup aborted'), { code: 'ABORTED' }))
    cancelStart = abort
    signal.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(() => finish(new Error('启动动态控制超时（30s内未收到 yak grpc ok）')), 30_000)
    subprocess.stdout.on('data', (data: Buffer) => {
      if (settled || ready) return
      output = (output + data.toString('utf8')).slice(-4096)
      if (!output.includes('yak grpc ok')) return
      ready = true
      clearTimeout(timeout)
      readyTimer = setTimeout(() => finish(), 1000)
    })
    // Consume unused stderr so a verbose child cannot block on a full pipe.
    subprocess.stderr.resume()
    subprocess.once('error', finish)
    subprocess.once('close', (code) => {
      if (pid === subprocess.pid) pid = undefined
      finish(new Error(`Dynamic control exited before startup (${code})`))
    })
    if (signal.aborted) abort()
  })
}

export function registerControlServices() {
  registerMainMethod('start-dynamic-control', (params, context) => startDynamicControl(params, context.signal))
  registerMainMethod('kill-dynamic-control', () => asyncKillDynamicControl())
  registerMainMethod('alive-dynamic-control-status', () => !!pid && !cancelStart)
}
