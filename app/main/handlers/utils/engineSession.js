const { randomBytes } = require('crypto')
const { createEngineStartup, stopEngineChild } = require('./engineStartup')
const { ENGINE_TIMEOUTS, createLocalEndpoint, endpointAddress, validPort } = require('./engineEndpoint')
const { redactEngineData } = require('./engineDiagnostics')

const id = () => randomBytes(16).toString('hex')
const alive = (child) => !!child?.pid && child.exitCode === null && child.signalCode === null
const failure = (status, message) => ({ ok: false, status, message })

function mayFallback(result) {
  if (
    result.ok ||
    !result.stopped ||
    ['cancelled', 'stop_failed', 'protocol_error', 'database_error'].includes(result.status)
  )
    return false
  const code = result.reasonCode || result.engineEvent?.reasonCode
  if (['database', 'auth', 'dial', 'version_rpc', 'wait_connect'].includes(result.engineEvent?.phase)) return false
  // General bind_failed, UNAVAILABLE, timeout and silent exits are NOT capability evidence.
  return ['ipc_cli_unsupported', 'ipc_bind_in_use', 'ipc_bind_denied'].includes(code)
}

function createEngineSession(options) {
  const platform = options.platform || process.platform
  const limits = { ...ENGINE_TIMEOUTS, ...options.timeouts }
  const records = new Map()
  const plans = new Map()
  let currentId = null
  let active = null
  let epoch = 0
  const startup = createEngineStartup({
    ...options,
    commitConnection(connection) {
      // This callback is reached only after both positive and negative auth probes.
      options.commitConnection(connection)
      currentId = connection.instanceId || null
      const record = records.get(currentId)
      if (record) {
        record.connection = connection
        record.state = 'ready'
      }
    },
    onSpawn(child, params) {
      const record = records.get(params.instanceId)
      if (record) {
        record.child = child
        record.pid = child.pid
        record.state = params.checking ? 'checking' : 'starting'
      }
    },
    onExit(child, code, signal) {
      for (const record of records.values()) {
        if (record.child !== child) continue
        record.state = 'exited'
        record.exitCode = code
        record.signal = signal
        record.connection = undefined
        if (record.id === currentId) currentId = null
      }
    },
  })

  function dto(record) {
    const running = alive(record.child)
    return {
      id: record.id,
      operationId: record.operationId,
      attemptId: record.attemptId,
      pid: record.pid,
      endpoint: record.endpoint,
      transport: record.endpoint.transport,
      displayEndpoint: endpointAddress(record.endpoint),
      port: record.endpoint.transport === 'tcp' ? record.endpoint.port : undefined,
      state: record.state,
      version: record.version,
      fallbackReason: record.fallbackReason,
      ownership: 'managed',
      current: currentId === record.id && running,
      actions: { stop: running && !active && record.state !== 'stopping', connect: false },
      actionReason: 'connection_settings_required',
    }
  }

  function prepare(params = {}) {
    if (!validPort(params.port) || !['auto', 'ipc', 'tcp'].includes(params.policy || 'auto'))
      return failure('protocol_error', '本地连接策略或 TCP 兼容端口无效')
    // Version/download decisions happen before spawning. A plan has no credentials or live engine.
    plans.clear()
    const launchId = id()
    plans.set(launchId, {
      port: Number(params.port),
      policy: params.policy || 'auto',
      softwareVersion: params.softwareVersion,
      created: Date.now(),
    })
    return { ok: true, status: 'success', json: { port: Number(params.port), launchId } }
  }

  async function launch(input = {}) {
    if (active) return failure('operation_busy', '已有引擎启动或停止操作正在进行')
    if (startup.hasLiveChildren())
      return { ...failure('stop_failed', '已有受管引擎尚未停止，请先停止该实例'), stopped: false }
    const plan = input.launchId ? plans.get(input.launchId) : input
    if (!plan || (plan.created && Date.now() - plan.created > 30 * 60 * 1000))
      return failure('protocol_error', '连接准备已过期，请重新连接')
    plans.clear()
    const token = ++epoch
    const operationId = id()
    const started = Date.now()
    const spent = { check: 0, start: 0 }
    let hinted = false
    const attempts = []
    const budget = {
      remaining: (stage) => Math.max(0, Math.min(limits[stage] - spent[stage], limits.total - (Date.now() - started))),
      spent: (stage) => spent[stage],
      hint: () => {
        if (hinted) return false
        hinted = true
        return true
      },
    }
    const state = { cancelled: false, promise: null }
    active = state
    const params = { ...input, ...plan }
    const work = async () => {
      let resource
      try {
        resource = createLocalEndpoint(params.policy || 'auto', params.port, params.softwareVersion, platform)
        for (let attempt = 0; attempt < 2; attempt++) {
          if (state.cancelled || token !== epoch) return failure('cancelled', '引擎连接已取消')
          const record = {
            id: id(),
            launchId: input.launchId,
            operationId,
            attemptId: id(),
            endpoint: resource.endpoint,
            state: 'checking',
            cleanup: resource.cleanup,
            fallbackReason: attempts.length
              ? {
                  status: attempts[0].status,
                  reasonCode: attempts[0].reasonCode || attempts[0].engineEvent?.reasonCode,
                  stage: attempts[0].stage,
                }
              : undefined,
          }
          records.set(record.id, record)
          // Bound retained history, but never discard a live/stopping process.
          for (const [key, item] of records)
            if (records.size > 100 && !alive(item.child) && key !== record.id) records.delete(key)
          const stageParams = { ...params, endpoint: record.endpoint, instanceId: record.id }
          let result
          for (const stage of ['check', 'start']) {
            if (budget.remaining(stage) <= 0) {
              result = { ...failure('timeout', '等待引擎超时'), stopped: true, stage }
              break
            }
            if (state.cancelled || token !== epoch) {
              result = { ...failure('cancelled', '引擎连接已取消'), stopped: !alive(record.child) }
              break
            }
            const before = Date.now()
            result = await startup[stage](
              {
                ...stageParams,
                checking: stage === 'check',
                password: stage === 'start' ? randomBytes(32).toString('hex') : undefined,
              },
              budget,
            )
            spent[stage] += Date.now() - before
            if (!result.ok) break
            if (stage === 'check')
              record.version = typeof result.json?.version === 'string' ? result.json.version : undefined
          }
          if (result.ok)
            return {
              ok: true,
              status: 'success',
              operationId,
              instance: dto(record),
              attempts,
              fallback: attempts.length > 0,
            }
          const safe = { ...redactEngineData(result), json: undefined, transport: record.endpoint.transport }
          attempts.push(safe)
          if (!alive(record.child)) resource.cleanup()
          if (
            (params.policy && params.policy !== 'auto') ||
            record.endpoint.transport === 'tcp' ||
            attempt !== 0 ||
            state.cancelled ||
            token !== epoch ||
            !mayFallback(safe)
          ) {
            return { ...safe, operationId, attempts, remaining: list().filter((item) => item.state !== 'exited') }
          }
          // The low-level result confirms exit, but recheck the actual owned child too.
          if (startup.hasLiveChildren())
            return { ...failure('stop_failed', '引擎尚未停止，未执行 TCP 回退'), stopped: false, operationId, attempts }
          resource = createLocalEndpoint('tcp', params.port, params.softwareVersion, platform)
        }
      } catch (error) {
        return { ...failure('protocol_error', '本地引擎参数或运行环境无效，请检查日志'), operationId, attempts }
      } finally {
        if (!startup.hasLiveChildren()) resource?.cleanup()
        if (active === state) active = null
      }
    }
    state.promise = work()
    return state.promise
  }

  function list() {
    return [...records.values()].map(dto)
  }
  function current() {
    const record = records.get(currentId)
    return record ? dto(record) : null
  }

  async function connect(params) {
    if (active) return failure('operation_busy', '已有引擎操作正在进行')
    const record =
      records.get(params.InstanceId) ||
      [...records.values()].find(
        (item) => params.LaunchId && item.launchId === params.LaunchId && item.id === currentId,
      )
    if (!record?.connection || !alive(record.child))
      return failure('connection_settings_required', '此实例没有可验证的本地连接记录，请使用连接设置')
    return startup.connect(record.connection, true)
  }

  async function cancel() {
    if (active?.kind === 'mutation') return { ...failure('operation_busy', '引擎文件操作尚未完成'), stopped: false }
    ++epoch
    plans.clear()
    const pending = active
    if (pending) pending.cancelled = true
    await startup.cancel()
    if (pending?.promise) await pending.promise
    const remaining = list().filter((item) => item.state !== 'exited')
    const stopped = !startup.hasLiveChildren()
    return { ok: stopped, stopped, status: stopped ? 'cancelled' : 'stop_failed', remaining }
  }

  async function stop(instanceId) {
    if (active) return failure('operation_busy', '已有引擎操作正在进行，请等待停止结果')
    const record = records.get(instanceId)
    if (!record) return failure('not_owned', '此引擎不由当前 Yakit 管理')
    if (!alive(record.child)) return { ok: true, stopped: true, id: instanceId }
    const state = { cancelled: false }
    active = state
    record.state = 'stopping'
    try {
      const stopped = await stopEngineChild(record.child, options.execFile, platform)
      record.state = stopped ? 'exited' : 'stop_failed'
      if (stopped) {
        record.cleanup()
        if (currentId === instanceId) currentId = null
      }
      return { ok: stopped, stopped, id: instanceId, status: stopped ? 'stopped' : 'stop_failed' }
    } finally {
      if (active === state) active = null
    }
  }

  async function stopAll() {
    const cancellation = await cancel()
    if (active) return cancellation
    const results = []
    for (const record of records.values()) if (alive(record.child)) results.push(await stop(record.id))
    return { ok: results.every((item) => item.ok), stopped: !startup.hasLiveChildren(), results }
  }

  async function withStopped(work) {
    if (active) throw new Error('Engine operation already in progress')
    const result = await stopAll()
    if (!result.ok || !result.stopped || active) throw new Error('Engine processes have not stopped')
    const state = { cancelled: false, kind: 'mutation' }
    active = state
    try {
      return await work()
    } finally {
      if (active === state) active = null
    }
  }

  return {
    prepare,
    launch,
    connect,
    list,
    current,
    cancel,
    stop,
    stopAll,
    withStopped,
    killOnExit: startup.killOnExit,
    connectRemote: (connection) =>
      active ? Promise.resolve(failure('operation_busy', '已有引擎操作正在进行')) : startup.connect(connection),
    disconnect: () => {
      if (active) return failure('operation_busy', '已有引擎操作正在进行')
      options.disconnectConnection?.()
      currentId = null
      return { ok: true }
    },
  }
}

module.exports = { createEngineSession, mayFallback }
