const childProcess = require('child_process')
const { randomBytes } = require('crypto')
const {
  ENGINE_TIMEOUTS,
  normalizeLocalEndpoint,
  grpcTarget,
  endpointArgs,
  matchesEngineEndpoint,
} = require('./engineEndpoint')
const {
  createEngineLineReader,
  parseEngineEvent,
  parseCheckResult,
  classifyEngineFailure,
  redactEngineLog,
  redactEngineData,
} = require('./engineDiagnostics')

const ECHO_TEXT = 'Hello Yakit!'
const MAX_CHECK_OUTPUT = 512 * 1024
const cancelled = (stage) => ({ ok: false, stage, status: 'cancelled', message: '引擎连接已取消' })
const isAlive = (child) => child?.pid && child.exitCode === null && child.signalCode === null

// Only terminate a child we spawned. Never search for engines or kill a process by port/name.
function stopEngineChild(child, execFile = childProcess.execFile, platform = process.platform) {
  if (!isAlive(child)) return Promise.resolve(true)
  return new Promise((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(forceTimer)
      clearTimeout(deadline)
      child.removeListener('close', finish)
      resolve(!isAlive(child))
    }
    const forceTimer = setTimeout(() => {
      if (isAlive(child)) {
        try {
          child.kill('SIGKILL')
        } catch {}
      }
    }, 2000)
    const deadline = setTimeout(finish, 4000)
    child.once('close', finish)
    try {
      if (platform === 'win32') {
        execFile(
          'taskkill.exe',
          ['/PID', String(child.pid), '/T', '/F'],
          { windowsHide: true, timeout: 3000 },
          () => {},
        )
      } else {
        child.kill('SIGTERM')
      }
    } catch {
      try {
        child.kill('SIGKILL')
      } catch {}
    }
  })
}

function validLocalPassword(password) {
  return (
    typeof password === 'string' &&
    password.trim().length > 0 &&
    !/^\*+$/.test(password.trim()) &&
    !/[\r\n\0]/.test(password)
  )
}

function createEngineStartup({
  getCommand,
  getEnv,
  createClient,
  commitConnection,
  log = () => {},
  notify = () => {},
  spawn = childProcess.spawn,
  execFile = childProcess.execFile,
  platform = process.platform,
  timeouts = {},
  onSpawn = () => {},
  onExit = () => {},
}) {
  const limits = { ...ENGINE_TIMEOUTS, ...timeouts }
  let generation = 0
  let active = null
  const children = new Set()

  // Progress is best-effort: a closing renderer must not interrupt engine cleanup.
  function notifyProgress(message) {
    try {
      notify(message)
    } catch {}
  }

  async function operation(stage, work, budget) {
    const id = ++generation
    if (active) await active.cancel()
    if (id !== generation) return cancelled(stage)
    let resolve
    const promise = new Promise((done) => {
      resolve = done
    })
    const resources = new Set()
    const op = {
      child: null,
      finished: false,
      promise,
      deadline: Date.now() + Math.max(0, Math.min(limits[stage], budget?.remaining(stage) ?? Infinity)),
      current: () => !op.finished && id === generation,
      add: (dispose) => {
        resources.add(dispose)
        return () => resources.delete(dispose)
      },
      timer(fn, delay) {
        const timer = setTimeout(() => {
          resources.delete(clear)
          if (op.current()) fn()
        }, delay)
        const clear = () => clearTimeout(timer)
        resources.add(clear)
        return clear
      },
      async finish(result, keepChild = false) {
        if (op.finished) return promise
        op.finished = true
        for (const dispose of resources) {
          try {
            dispose()
          } catch {}
        }
        resources.clear()
        if (!keepChild && op.child && !(await stopEngineChild(op.child, execFile, platform))) {
          result = {
            ...result,
            ok: false,
            stage,
            status: 'stop_failed',
            stopped: false,
            reasonCode: 'owned_process_alive',
            message: '引擎进程尚未退出，请稍后重试或查看日志',
          }
        }
        if (result.stopped === undefined) result.stopped = !op.child || !isAlive(op.child)
        if (active === op) active = null
        resolve({ stage, ...result })
        return promise
      },
      cancel: () => op.finish(cancelled(stage)),
    }
    active = op
    op.timer(
      () => op.finish({ ok: false, status: 'timeout', message: '等待引擎超时，请重试或查看日志' }),
      Math.max(0, op.deadline - Date.now()),
    )
    if (stage === 'check' || stage === 'start') {
      op.timer(
        () => {
          if (!budget || budget.hint()) notifyProgress('LocalEngine.migration_wait_hint')
        },
        Math.max(0, limits.hint - (budget?.spent(stage) || 0)),
      )
    }
    try {
      await work(op)
    } catch (error) {
      op.finish({ ok: false, status: 'exception', message: `引擎启动异常：${redactEngineLog(error.message || error)}` })
    }
    return promise
  }

  function attachProcess(op, args, params, onLine, onClose) {
    const password = params.password || ''
    const child = spawn(getCommand(), args, {
      detached: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: getEnv(params.softwareVersion),
    })
    op.child = child
    children.add(child)
    onSpawn(child, params)
    const overflow = () =>
      op.finish({ ok: false, status: 'protocol_error', message: '引擎启动输出过大，请查看日志或重新安装引擎' })
    const readers = ['stdout', 'stderr'].map((stream) => {
      const reader = createEngineLineReader((line) => {
        // A closed window or failed log write must not strand an engine operation.
        try {
          log(redactEngineLog(line, [password]))
        } catch {}
        if (op.current()) onLine(line, stream)
      }, overflow)
      child[stream].on('data', reader.write)
      child[stream].once('end', reader.end)
      return reader
    })
    child.once('error', (error) =>
      op.finish({
        ok: false,
        status: 'process_error',
        message: `引擎进程启动失败：${redactEngineLog(error.message, [password])}`,
      }),
    )
    child.once('close', (code, signal) => {
      for (const reader of readers) reader.end()
      children.delete(child)
      onExit(child, code, signal)
      if (op.current()) onClose(code, signal)
    })
    return child
  }

  function probe(op, connection, done) {
    let client
    let call
    let finished = false
    let remove = () => {}
    let clearTimer = () => {}
    const dispose = () => {
      if (finished) return
      finished = true
      clearTimer()
      remove()
      try {
        call?.cancel()
      } catch {}
      try {
        client?.close()
      } catch {}
    }
    const finish = (error, data) => {
      if (finished) return
      dispose()
      if (op.current()) done(error, data)
    }
    remove = op.add(dispose)
    const probeMs = Math.max(0, Math.min(limits.probe, op.deadline - Date.now()))
    clearTimer = op.timer(() => finish(new Error('Echo timed out')), probeMs)
    try {
      client = createClient(connection)
      call = client.Echo({ text: ECHO_TEXT }, { deadline: new Date(Date.now() + probeMs) }, (error, data) => {
        finish(
          error ||
            (data?.result !== ECHO_TEXT
              ? Object.assign(new Error('Unexpected Echo response'), { unsafeEndpoint: true })
              : null),
          data,
        )
      })
    } catch (error) {
      finish(error)
    }
  }

  function authenticatedProbe(op, connection, done) {
    probe(op, connection, (error, data) => {
      if (error) return done(error)
      // A different, unauthenticated Echo server can occupy the port between
      // check and start. A successful Echo alone does not establish auth enforcement.
      probe(op, { ...connection, password: '' }, (anonymousError) => {
        if (anonymousError?.code === 16) return done(null, data) // UNAUTHENTICATED, including legacy engines.
        if (anonymousError) return done(anonymousError)
        done(Object.assign(new Error('Local endpoint accepts unauthenticated RPCs'), { unsafeEndpoint: true }))
      })
    })
  }

  function requestedEndpoint(params) {
    return normalizeLocalEndpoint(
      params.endpoint || {
        transport: params.transport || 'tcp',
        host: '127.0.0.1',
        port: params.port,
        path: params.path,
      },
      platform,
    )
  }

  function check(params, budget) {
    return operation(
      'check',
      async (op) => {
        let endpoint
        try {
          endpoint = requestedEndpoint(params)
        } catch {
          return op.finish({ ok: false, status: 'protocol_error', message: '本地引擎端口或连接方式无效，请重新配置' })
        }
        // A cancelled process must have exited before another check touches the same databases.
        for (const child of children) {
          if (isAlive(child))
            return op.finish({
              ok: false,
              status: 'stop_failed',
              stopped: false,
              message: '已有受管引擎尚未停止，请先停止该实例',
            })
        }
        const args = ['check-secret-local-grpc', ...endpointArgs(endpoint)]
        let stdout = ''
        let stderr = ''
        attachProcess(
          op,
          args,
          params,
          (line, stream) => {
            if (stream === 'stdout') stdout += line + '\n'
            else stderr += line + '\n'
            if (stdout.length + stderr.length > MAX_CHECK_OUTPUT) {
              op.finish({ ok: false, status: 'protocol_error', message: '引擎检查输出过大，请查看日志' })
            }
          },
          (code, signal) => {
            try {
              log(`Engine check exited: code=${code ?? 'unknown'}, signal=${signal ?? 'none'}`)
            } catch {}
            // Some legacy engines write the marked result to stderr. Multiple
            // results across either stream remain ambiguous and are rejected.
            const output = stdout + '\n' + stderr
            const json = parseCheckResult(output)
            if (json?.ok === true && code === 0 && !signal) {
              const checkEvent = {
                transport: json.transport || 'tcp',
                address: json.address || json.addr || `127.0.0.1:${json.port}`,
              }
              if (
                (json.address && json.addr && json.address !== json.addr) ||
                (json.schemaVersion !== undefined && ![1, 2].includes(json.schemaVersion)) ||
                !matchesEngineEndpoint(checkEvent, endpoint, platform)
              ) {
                return op.finish({
                  ok: false,
                  status: 'protocol_error',
                  message: '引擎检查返回的地址与请求不一致，请重试或更新引擎',
                })
              }
              // The check's secret is diagnostic data in newer engines (sometimes "***").
              // Generate a fresh production credential here for both old and new engines.
              return op.finish({
                ok: true,
                status: 'success',
                json: { ...redactEngineData(json), endpoint, secret: randomBytes(32).toString('hex') },
              })
            }
            if (json?.ok === false) {
              const failure = classifyEngineFailure(json, 'check')
              const safe = redactEngineData({ ...failure, json })
              return op.finish(safe)
            }
            if (
              endpoint.transport !== 'tcp' &&
              Number.isInteger(code) &&
              code !== 0 &&
              !signal &&
              !json &&
              /(?:flag provided but not defined|unknown flag|unrecognized (?:option|argument))[:=\s]+['"]?--?(?:transport|socket-path)\b/i.test(
                output,
              )
            ) {
              return op.finish({
                ok: false,
                status: 'ipc_unsupported',
                reasonCode: 'ipc_cli_unsupported',
                exitCode: code,
                message: '当前引擎不识别 IPC 参数',
              })
            }
            if (
              /flag provided but not defined|unknown command.*check-secret-local-grpc|No help topic for.*check-secret-local-grpc/i.test(
                output,
              ) ||
              (/check-secret-local-grpc/.test(output) &&
                /no such file or directory|cannot find the file specified/i.test(output))
            ) {
              return op.finish({
                ok: false,
                status: 'old_version',
                message: '当前引擎不支持安全本地启动，请选择其他引擎版本或更新引擎',
              })
            }
            op.finish({
              ok: false,
              status: output.trim() ? 'process_error' : 'antivirus_blocked',
              exitCode: code,
              signal,
              message: output.trim()
                ? `引擎检查未正常完成（退出码 ${code ?? signal ?? '未知'}），请重试或查看日志`
                : `引擎未输出诊断信息便退出（退出码 ${code ?? signal ?? '未知'}）。可能被安全软件拦截，也可能是进程异常；请检查拦截记录和引擎日志，确认文件可信后重试`,
            })
          },
        )
      },
      budget,
    )
  }

  function start(params, budget) {
    return operation(
      'start',
      async (op) => {
        let endpoint
        try {
          endpoint = requestedEndpoint(params)
        } catch {
          return op.finish({ ok: false, status: 'protocol_error', message: '本地引擎连接参数无效，请重新检查引擎' })
        }
        if (!validLocalPassword(params.password)) {
          return op.finish({ ok: false, status: 'protocol_error', message: '本地引擎连接参数无效，请重新检查引擎' })
        }
        for (const child of children) {
          if (isAlive(child))
            return op.finish({
              ok: false,
              status: 'stop_failed',
              stopped: false,
              message: '已有受管引擎尚未停止，请先停止该实例',
            })
        }
        const connection = {
          defaultYakGRPCAddr: grpcTarget(endpoint, platform),
          endpoint,
          caPem: '',
          password: params.password,
          instanceId: params.instanceId,
        }
        const args = [
          'grpc',
          '--local-password',
          params.password,
          '--frontend',
          String(params.version || 'yakit'),
          ...endpointArgs(endpoint),
        ]
        if (params.isEnpriTraceAgent) args.push('--disable-output')
        let inFlight = false
        let ready = endpoint.transport === 'tcp'
        let clearRetry = () => {}
        const tryConnect = () => {
          if (!op.current() || !ready || inFlight || !isAlive(op.child)) return
          clearRetry()
          inFlight = true
          authenticatedProbe(op, connection, (error) => {
            inFlight = false
            if (!isAlive(op.child)) return
            if (error) {
              if (
                error.unsafeEndpoint ||
                error.code === 16 ||
                /secret verify failed|unauthenticated|permission denied/i.test(error.details || '')
              ) {
                return op.finish({
                  ok: false,
                  status: 'protocol_error',
                  grpcCode: error.code,
                  reasonCode: 'authentication_failed',
                  message: '本地引擎认证校验失败，请检查引擎版本和连接信息',
                })
              }
              clearRetry = op.timer(tryConnect, limits.retry)
              return
            }
            try {
              commitConnection(connection)
              op.finish({ ok: true, status: 'success', message: '引擎认证连接成功' }, true)
            } catch (error) {
              op.finish({
                ok: false,
                status: 'exception',
                message: `引擎连接失败：${redactEngineLog(error.message, [params.password])}`,
              })
            }
          })
        }
        attachProcess(
          op,
          args,
          params,
          (line, stream) => {
            if (stream !== 'stdout') return
            const event = parseEngineEvent(line)
            if (
              event?.type === 'invalid' ||
              (event?.type === 'ready' && !matchesEngineEndpoint(event, endpoint, platform))
            ) {
              return op.finish({
                ok: false,
                status: 'protocol_error',
                message: '引擎返回了不兼容的连接信息，请重新检查或更新引擎',
              })
            }
            if (event?.type === 'failed')
              return op.finish(redactEngineData(classifyEngineFailure(event, 'start'), [params.password]))
            if (event?.type === 'ready') ready = true
            if (event?.type === 'ready' || event?.type === 'log_ok') tryConnect()
            if (line.includes('<json-f97f966eb7f8ba8fdb63e4d29109c058>'))
              notifyProgress('LocalEngine.database_initializing')
          },
          (code, signal) =>
            op.finish({
              ok: false,
              status: 'engine_exited',
              message: `引擎进程已退出（${code ?? signal ?? '未知'}），请重试或查看日志`,
            }),
        )
        notifyProgress('LocalEngine.waiting_engine_fully_started')
        clearRetry = op.timer(tryConnect, limits.retry)
      },
      budget,
    )
  }

  function connect(connection, requireLocalAuth = false) {
    return operation('connect', (op) => {
      const connectProbe = requireLocalAuth ? authenticatedProbe : probe
      connectProbe(op, connection, (error, data) => {
        if (error) return op.finish({ ok: false, status: 'dial_error', message: '引擎连接失败，请检查地址和认证信息' })
        try {
          commitConnection(connection)
          op.finish({ ok: true, status: 'success', data })
        } catch (error) {
          op.finish({ ok: false, status: 'exception', message: '引擎连接失败，请重试' })
        }
      })
    })
  }

  async function cancel() {
    generation++
    const pending = active
    if (pending) await pending.cancel()
    const stopped = !pending?.child || !isAlive(pending.child)
    return { ok: stopped, stopped, status: stopped ? 'cancelled' : 'stop_failed' }
  }

  async function dispose() {
    await cancel()
    const results = await Promise.all(
      [...children].map(async (child) => ({
        pid: child.pid,
        stopped: await stopEngineChild(child, execFile, platform),
      })),
    )
    const stopped = results.every((result) => result.stopped)
    return { ok: stopped, stopped, status: stopped ? 'stopped' : 'stop_failed', results }
  }

  function killOnExit() {
    for (const child of children) {
      if (isAlive(child)) {
        try {
          if (platform === 'win32') {
            childProcess.execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
              windowsHide: true,
              timeout: 3000,
              stdio: 'ignore',
            })
          }
        } catch {}
        try {
          child.kill('SIGKILL')
        } catch {}
      }
    }
  }

  return { check, start, connect, cancel, dispose, killOnExit, hasLiveChildren: () => [...children].some(isAlive) }
}

module.exports = { createEngineStartup, stopEngineChild, validLocalPassword }
