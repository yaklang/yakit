const childProcess = require('child_process')
const net = require('net')
const os = require('os')
const path = require('path')

const WINDOWS_PIPE = '\\\\.\\pipe\\ytray-control-v1'
const MAX_RESPONSE_BYTES = 1024 * 1024
const INSTANCE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/
const POWERSHELL_PIPE_CLIENT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$pipe = [IO.Pipes.NamedPipeClientStream]::new('.', 'ytray-control-v1', [IO.Pipes.PipeDirection]::InOut)
try {
  $pipe.Connect(3000)
  $body = [Console]::In.ReadToEnd() + [Environment]::NewLine
  $bytes = [Text.Encoding]::UTF8.GetBytes($body)
  $pipe.Write($bytes, 0, $bytes.Length)
  $pipe.Flush()
  $reader = [IO.StreamReader]::new($pipe, [Text.Encoding]::UTF8, $false, 4096, $true)
  [Console]::Out.Write($reader.ReadLine())
} finally {
  $pipe.Dispose()
}
`

function requestSocket(socketPath, payload, timeoutMs = 3_000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath)
    let response = ''
    let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (error) reject(error)
      else resolve(value)
    }
    socket.setEncoding('utf8')
    socket.setTimeout(timeoutMs, () => finish(new Error('连接 YTray 原生控制服务超时')))
    socket.on('connect', () => socket.write(`${JSON.stringify(payload)}\n`))
    socket.on('data', (chunk) => {
      response += chunk
      if (Buffer.byteLength(response, 'utf8') > MAX_RESPONSE_BYTES) {
        finish(new Error('YTray 原生控制响应过大'))
        return
      }
      const lineEnd = response.indexOf('\n')
      if (lineEnd < 0) return
      try {
        finish(undefined, JSON.parse(response.slice(0, lineEnd)))
      } catch {
        finish(new Error('YTray 原生控制返回了无效 JSON'))
      }
    })
    socket.on('error', (error) => finish(error))
    socket.on('end', () => {
      if (!settled) finish(new Error('YTray 原生控制连接已关闭'))
    })
  })
}

function requestWindowsPipeFromWSL(payload, timeoutMs = 4_000) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', POWERSHELL_PIPE_CLIENT],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => child.kill(), timeoutMs)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      if (Buffer.byteLength(stdout, 'utf8') > MAX_RESPONSE_BYTES) child.kill()
    })
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4096)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim() || '无法连接 Windows YTray 原生控制服务'))
        return
      }
      try {
        resolve(JSON.parse(stdout))
      } catch {
        reject(new Error('YTray 原生控制返回了无效 JSON'))
      }
    })
    child.stdin.end(JSON.stringify(payload))
  })
}

async function requestYTrayControl(payload, socketPath) {
  let response
  try {
    if (socketPath) response = await requestSocket(socketPath, payload)
    else if (process.platform === 'win32') response = await requestSocket(WINDOWS_PIPE, payload)
    else if (process.platform === 'darwin') {
      response = await requestSocket(
        path.join(os.homedir(), 'Library', 'Application Support', 'YTray', 'control.sock'),
        payload,
      )
    } else if (process.env.WSL_INTEROP || os.release().toLowerCase().includes('microsoft')) {
      response = await requestWindowsPipeFromWSL(payload)
    } else {
      throw new Error('当前系统不支持 YTray')
    }
  } catch (error) {
    throw new Error(`无法连接 YTray，请确认 YTray 已启动：${error.message}`)
  }
  if (!response || response.ok !== true) throw new Error(response?.error || 'YTray 原生控制调用失败')
  return response
}

function normalizeInstance(value) {
  if (!value || typeof value !== 'object' || !INSTANCE_ID_PATTERN.test(`${value.id || ''}`)) return undefined
  return {
    id: value.id,
    name: `${value.name || ''}`.slice(0, 160),
    runtime: `${value.runtime || ''}`.slice(0, 160),
    status: value.status === 'failed' ? 'failed' : 'stopped',
    startUrl: `${value.startUrl || ''}`.slice(0, 8192),
    pageTitle: `${value.pageTitle || ''}`.slice(0, 512),
    pageUrl: `${value.pageUrl || ''}`.slice(0, 8192),
    badge: `${value.badge || ''}`.slice(0, 2),
    startedAt: Number.isFinite(value.startedAt) ? value.startedAt : 0,
  }
}

async function listYTrayBrowserHistory(socketPath) {
  const response = await requestYTrayControl({ action: 'list_history' }, socketPath)
  return (Array.isArray(response.instances) ? response.instances : [])
    .map(normalizeInstance)
    .filter(Boolean)
    .sort((left, right) => right.startedAt - left.startedAt)
}

async function restoreYTrayBrowserInstance(id, socketPath) {
  if (!INSTANCE_ID_PATTERN.test(`${id || ''}`)) throw new Error('YTray 浏览器实例 ID 无效')
  await requestYTrayControl({ action: 'restore_history', id }, socketPath)
}

async function claimYTrayLaunchApproval(id, requestId, socketPath) {
  if (!INSTANCE_ID_PATTERN.test(`${id || ''}`)) throw new Error('YTray 浏览器实例 ID 无效')
  if (
    typeof requestId !== 'string' ||
    requestId.length < 1 ||
    requestId.length > 160 ||
    CONTROL_CHARACTER_PATTERN.test(requestId)
  ) {
    throw new Error('浏览器配对请求 ID 无效')
  }
  const response = await requestYTrayControl({ action: 'claim_launch_approval', id, requestId }, socketPath)
  if (typeof response.approved !== 'boolean') throw new Error('YTray 返回了无效的批准结果')
  return { approved: response.approved, reason: `${response.reason || ''}`.slice(0, 64) }
}

function registerYTrayControlHandlers({ ipcMain, assertTrustedAppSender }) {
  const handle = (channel, callback) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, async (event, ...args) => {
      if (assertTrustedAppSender) assertTrustedAppSender(event, channel)
      return callback(...args)
    })
  }
  handle('ListYTrayBrowserHistory', () => listYTrayBrowserHistory())
  handle('ClaimYTrayLaunchApproval', (input) => claimYTrayLaunchApproval(input?.id, input?.requestId))
  handle('RestoreYTrayBrowserInstance', (input) => restoreYTrayBrowserInstance(input?.id))
}

module.exports = {
  claimYTrayLaunchApproval,
  listYTrayBrowserHistory,
  registerYTrayControlHandlers,
  restoreYTrayBrowserInstance,
}
