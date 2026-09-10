const { StringDecoder } = require('string_decoder')

const CHECK_MARKER = '50551aa97b5aa5ae8a3c3243ac60a8a7'
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const stringValue = (value) => (typeof value === 'string' ? value : '')

function redactEngineLog(value, secrets = []) {
  let text = String(value)
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join('***')
  }
  return text
    .replace(/("(?:secret|password)"\s*:\s*)"(?:\\.|[^"\\])*"/gi, '$1"***"')
    .replace(/((?:generated random secret for testing|secret|password)\s*[:=]\s*)\S+/gi, '$1***')
    .replace(/(bearer\s+)\S+/gi, '$1***')
}

function redactEngineData(value, secrets = []) {
  if (typeof value === 'string') return redactEngineLog(value, secrets)
  if (Array.isArray(value)) return value.map((item) => redactEngineData(item, secrets))
  if (isObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /^(secret|password)$/i.test(key) ? '***' : redactEngineData(item, secrets),
      ]),
    )
  return value
}

// Decode bytes before splitting lines: both JSON and UTF-8 characters can span chunks.
function createEngineLineReader(onLine, onOverflow, maxLength = 64 * 1024) {
  const decoder = new StringDecoder('utf8')
  let pending = ''
  let ended = false
  function consume(text) {
    pending += text
    let index
    while ((index = pending.indexOf('\n')) !== -1) {
      if (index > maxLength) return overflow()
      const line = pending.slice(0, index).replace(/\r$/, '')
      pending = pending.slice(index + 1)
      onLine(line)
    }
    if (pending.length > maxLength) overflow()
  }
  function overflow() {
    ended = true
    pending = ''
    onOverflow()
  }
  return {
    write(data) {
      if (!ended) consume(decoder.write(Buffer.isBuffer(data) ? data : Buffer.from(data)))
    },
    end() {
      if (ended) return
      consume(decoder.end())
      if (ended) return
      ended = true
      if (pending) onLine(pending.replace(/\r$/, ''))
      pending = ''
    },
  }
}

function parseEngineEvent(line) {
  const text = line.trim()
  if (text === 'yak grpc ok') return { type: 'log_ok' }
  const match = /^(yak grpc (ready|failed)) (.*)$/.exec(text)
  if (!match) return null
  try {
    const data = JSON.parse(match[3])
    if (!isObject(data)) return { type: 'invalid' }
    if (match[2] === 'ready') {
      if (![1, 2].includes(data.schemaVersion) || typeof data.address !== 'string') return { type: 'invalid' }
      if (data.transport !== undefined && typeof data.transport !== 'string') return { type: 'invalid' }
    }
    return { ...data, type: match[2], transport: data.transport || 'tcp' }
  } catch {
    return { type: 'invalid' }
  }
}

function parseCheckResult(stdout) {
  // Only the check-secret result is authoritative; unrelated JSON log markers are ignored.
  const pattern = new RegExp(`<json-${CHECK_MARKER}>([\\s\\S]*?)<\\/json-${CHECK_MARKER}>`, 'g')
  const matches = [...stdout.matchAll(pattern)]
  if (matches.length !== 1) return null
  try {
    const result = JSON.parse(matches[0][1])
    return isObject(result) && typeof result.ok === 'boolean' ? result : null
  } catch {
    return null
  }
}

function classifyEngineFailure(data = {}, stage = 'check') {
  const phase = stringValue(data.phase)
  const reasons = (Array.isArray(data.reason) ? data.reason : [data.reason]).map(stringValue)
  const detail = stringValue(data.info) || (typeof data.reason === 'string' ? data.reason : '')
  let reasonCode = stringValue(data.reasonCode)
  if (!reasonCode) reasonCode = /^\[([a-z_]+)\]/.exec(detail)?.[1] || ''
  if (!reasonCode) {
    const legacy = reasons.join('\n')
    if (/net\.Listen/.test(legacy)) {
      reasonCode = /EACCES|WSAEACCES|10013|permission denied|forbidden by its access permissions/i.test(detail)
        ? 'tcp_bind_denied'
        : 'tcp_bind_in_use' // Preserve the legacy recovery path when errno is unavailable.
    } else if (/database[ _]error/.test(legacy)) reasonCode = 'database_error'
    else if (/build yak grpc|build_server_failed/.test(legacy)) reasonCode = 'build_server_failed'
    else if (/dial grpc|dial_failed/.test(legacy)) reasonCode = 'dial_failed'
    else if (/Version RPC|version_rpc_failed/.test(legacy)) reasonCode = 'version_rpc_failed'
    else if (/waiting grpc|wait_connect_failed/.test(legacy)) reasonCode = 'wait_connect_failed'
  }
  const statusByCode = {
    tcp_bind_in_use: 'port_occupied',
    tcp_bind_denied: 'port_denied',
    tcp_bind_failed: 'endpoint_unreachable',
    database_error: 'database_error',
    database_failed: 'database_error',
    build_server_failed: stage === 'check' ? 'build_yak_error' : 'engine_init_failed',
    dial_failed: 'dial_error',
    version_rpc_failed: 'call_error',
    wait_connect_failed: 'timeout',
  }
  const statusByPhase = {
    database: 'database_error',
    build_server: stage === 'check' ? 'build_yak_error' : 'engine_init_failed',
    dial: 'dial_error',
    version_rpc: 'call_error',
    wait_connect: 'timeout',
    serve: 'engine_exited',
    init: 'engine_init_failed',
    cert: 'engine_init_failed',
  }
  const status =
    (Object.hasOwn(statusByCode, reasonCode) && statusByCode[reasonCode]) ||
    (Object.hasOwn(statusByPhase, phase) && statusByPhase[phase]) ||
    (stage === 'check' ? 'unknownReason' : 'engine_failed')
  const messages = {
    port_occupied: '端口被占用，请切换端口或检查占用进程',
    port_denied: '系统拒绝使用该端口，请切换端口或检查系统策略',
    endpoint_unreachable: '引擎监听失败，请检查端口配置后重试',
    database_error: '数据库初始化失败，可点击修复进行处理',
    build_yak_error: '引擎服务构建失败，请查看日志或重新安装引擎',
    dial_error: '引擎连接失败，请查看日志或重试',
    call_error: '引擎认证失败，请重新检查连接',
    timeout: '等待引擎就绪超时，请重试',
  }
  const message = stringValue(data.reasonI18n?.zh) || messages[status] || detail || '引擎启动失败，请查看日志或重试'
  return {
    ok: false,
    stage,
    status,
    message,
    engineEvent: {
      type: 'failed',
      phase,
      reasonCode,
      reason: detail,
      reasonI18n: isObject(data.reasonI18n) ? data.reasonI18n : null,
      phaseI18n: isObject(data.phaseI18n) ? data.phaseI18n : null,
    },
  }
}

module.exports = {
  createEngineLineReader,
  parseEngineEvent,
  parseCheckResult,
  classifyEngineFailure,
  redactEngineLog,
  redactEngineData,
}
