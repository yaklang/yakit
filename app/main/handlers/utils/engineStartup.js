const childProcess = require('child_process')
const { randomBytes } = require('crypto')
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

function isProcessGroupAlive(groupId, killProcess) {
  if (!groupId) return false
  try {
    killProcess(-groupId, 0)
    return true
  } catch (error) {
    return error?.code !== 'ESRCH'
  }
}

function isOwnedProcessAlive(child, platform, killProcess) {
  if (platform !== 'win32' && child?.ownedProcessGroupExited) return false
  if (platform !== 'win32' && child?.ownedProcessGroup) {
    const alive = isProcessGroupAlive(child.ownedProcessGroup, killProcess)
    if (!alive) {
      child.ownedProcessGroup = null
      child.ownedProcessGroupExited = true
    }
    return alive
  }
  return Boolean(isAlive(child))
}

// Only terminate a child we spawned. Never search for engines or kill a process by port/name.
function stopEngineChild(
  child,
  execFile = childProcess.execFile,
  platform = process.platform,
  killProcess = process.kill,
) {
  if (!isOwnedProcessAlive(child, platform, killProcess)) return Promise.resolve(true)
  return new Promise((resolve) => {
    let finished = false
    let forceTimer
    let deadline
    let pollTimer
    const finish = (confirmedExit = !isOwnedProcessAlive(child, platform, killProcess)) => {
      if (finished) return
      finished = true
      clearTimeout(forceTimer)
      clearTimeout(deadline)
      clearTimeout(pollTimer)
      child.removeListener('close', checkExit)
      resolve(confirmedExit)
    }

    const checkExit = () => {
      if (!isOwnedProcessAlive(child, platform, killProcess)) return finish(true)
      clearTimeout(pollTimer)
      pollTimer = setTimeout(checkExit, 50)
    }

    const signalOwnedProcess = (signal) => {
      if (!isOwnedProcessAlive(child, platform, killProcess)) return checkExit()
      try {
        if (platform !== 'win32' && child.ownedProcessGroup) {
          killProcess(-child.ownedProcessGroup, signal)
        } else {
          child.kill(signal)
        }
      } catch {}
      checkExit()
    }

    forceTimer = setTimeout(() => signalOwnedProcess('SIGKILL'), 2000)
    deadline = setTimeout(() => finish(), 4000)
    child.on('close', checkExit)
    try {
      if (platform === 'win32') {
        execFile(
          'taskkill.exe',
          ['/PID', String(child.pid), '/T', '/F'],
          { windowsHide: true, timeout: 3000 },
          () => {},
        )
      } else {
        signalOwnedProcess('SIGTERM')
      }
    } catch {
      signalOwnedProcess('SIGKILL')
    }
  })
}

function validPort(port) {
  return /^(?:[1-9]\d*)$/.test(String(port)) && Number(port) <= 65535
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
  killProcess = process.kill,
  timeouts = {},
}) {
  const limits = { check: 180000, start: 180000, connect: 10000, probe: 2000, retry: 500, ...timeouts }
  let generation = 0
  let active = null
  let cleanupPromise = null
  let cleanupFailure = null
  const children = new Set()

  function ownedChildAlive(child) {
    const alive = isOwnedProcessAlive(child, platform, killProcess)
    if (!alive) {
      clearTimeout(child?.ownedProcessGroupWatcher)
      if (child) child.ownedProcessGroupWatcher = null
      children.delete(child)
    }
    return alive
  }

  function watchOwnedChild(child) {
    if (!child?.ownedProcessGroup || child.ownedProcessGroupWatcher) return
    const check = () => {
      child.ownedProcessGroupWatcher = null
      if (!ownedChildAlive(child)) return
      child.ownedProcessGroupWatcher = setTimeout(check, 250)
      child.ownedProcessGroupWatcher.unref?.()
    }
    child.ownedProcessGroupWatcher = setTimeout(check, 250)
    child.ownedProcessGroupWatcher.unref?.()
  }

  // Progress is best-effort: a closing renderer must not interrupt engine cleanup.
  function notifyProgress(message) {
    try {
      notify(message)
    } catch {}
  }

  function logCleanup(event, { operationId, stage, child, confirmedExit, elapsedMs = 0 }) {
    try {
      log(
        redactEngineLog(
          JSON.stringify({
            event,
            operationId,
            stage,
            ownedChildPid: child?.pid ?? null,
            exitCode: child?.exitCode ?? null,
            signal: child?.signalCode ?? null,
            confirmedExit,
            elapsedMs,
          }),
        ),
      )
    } catch {}
  }

  async function stopOwnedChild(child, operationId, stage) {
    const startedAt = Date.now()
    logCleanup('cleanup_start', {
      operationId,
      stage,
      child,
      confirmedExit: !ownedChildAlive(child),
    })
    const confirmedExit = await stopEngineChild(child, execFile, platform, killProcess)
    if (confirmedExit) children.delete(child)
    logCleanup('cleanup_result', {
      operationId,
      stage,
      child,
      confirmedExit,
      elapsedMs: Date.now() - startedAt,
    })
    return confirmedExit
  }

  async function operation(stage, work) {
    const id = ++generation
    if (cleanupPromise) await cleanupPromise
    if (id !== generation) return cancelled(stage)
    if (cleanupFailure) return { stage, ...cleanupFailure }
    if (active) {
      const previous = active
      await previous.cancel()
      if (previous.cleanupFailed || ownedChildAlive(previous.child)) {
        cleanupFailure = {
          ok: false,
          status: 'process_error',
          message: '引擎进程尚未退出，请稍后重试或查看日志',
        }
        return { stage, ...cleanupFailure }
      }
    }
    if (id !== generation) return cancelled(stage)
    let resolve
    const promise = new Promise((done) => {
      resolve = done
    })
    const resources = new Set()
    const op = {
      child: null,
      cleanupFailed: false,
      finished: false,
      promise,
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
        if (!keepChild && op.child && !(await stopOwnedChild(op.child, id, stage))) {
          op.cleanupFailed = true
          cleanupFailure = { ok: false, status: 'process_error', message: '引擎进程尚未退出，请稍后重试或查看日志' }
          result = cleanupFailure
        }
        if (active === op) active = null
        resolve({ stage, ...result })
        return promise
      },
      cancel: () => op.finish(cancelled(stage)),
    }
    active = op
    op.timer(
      () => op.finish({ ok: false, status: 'timeout', message: '等待引擎超时，请重试或查看日志' }),
      limits[stage],
    )
    if (stage === 'check' || stage === 'start') {
      op.timer(() => notifyProgress('LocalEngine.migration_wait_hint'), 20000)
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
      detached: platform !== 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: getEnv(params.softwareVersion),
    })
    if (platform !== 'win32' && child.pid) {
      child.ownedProcessGroup = child.pid
      child.ownedProcessGroupExited = false
    }
    op.child = child
    children.add(child)
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
      if (ownedChildAlive(child)) watchOwnedChild(child)
      if (op.current()) onClose(code, signal)
    })
    return child
  }

  function probe(op, connection, done, deadlineAt = Date.now() + limits.probe) {
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
    const remaining = Math.max(0, deadlineAt - Date.now())
    clearTimer = op.timer(() => finish(new Error('Echo timed out')), remaining)
    try {
      client = createClient(connection)
      call = client.Echo({ text: ECHO_TEXT }, { deadline: new Date(deadlineAt) }, (error, data) => {
        finish(error || (data?.result !== ECHO_TEXT ? new Error('Unexpected Echo response') : null), data)
      })
    } catch (error) {
      finish(error)
    }
  }

  function authenticatedProbe(op, connection, done, deadlineAt) {
    probe(
      op,
      connection,
      (error, data) => {
        if (error) return done(error)
        // A different, unauthenticated Echo server can occupy the port between
        // check and start. A successful Echo alone does not establish auth enforcement.
        probe(
          op,
          { ...connection, password: '' },
          (anonymousError) => {
            if (anonymousError?.code === 16) return done(null, data) // UNAUTHENTICATED, including legacy engines.
            if (anonymousError) return done(anonymousError)
            done(Object.assign(new Error('Local endpoint accepts unauthenticated RPCs'), { unsafeEndpoint: true }))
          },
          deadlineAt,
        )
      },
      deadlineAt,
    )
  }

  function check(params) {
    return operation('check', async (op) => {
      if (!validPort(params.port) || (params.transport && params.transport !== 'tcp')) {
        return op.finish({ ok: false, status: 'protocol_error', message: '本地引擎端口或连接方式无效，请重新配置' })
      }
      // A cancelled process must have exited before another check touches the same databases.
      for (const child of children) {
        if (ownedChildAlive(child))
          return op.finish({
            ok: false,
            status: 'port_occupied',
            message: '已有本地引擎进程正在运行，请先断开或切换端口',
          })
      }
      const args = ['check-secret-local-grpc', '--port', String(params.port)]
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
            if ((json.transport && json.transport !== 'tcp') || Number(json.port) !== Number(params.port)) {
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
              json: { ...json, secret: randomBytes(32).toString('hex') },
            })
          }
          if (json?.ok === false) {
            const failure = classifyEngineFailure(json, 'check')
            const safe = redactEngineData({ ...failure, json })
            return op.finish(safe)
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
    })
  }

  function start(params) {
    return operation('start', async (op) => {
      if (
        !validPort(params.port) ||
        !validLocalPassword(params.password) ||
        (params.transport && params.transport !== 'tcp')
      ) {
        return op.finish({ ok: false, status: 'protocol_error', message: '本地引擎连接参数无效，请重新检查引擎' })
      }
      for (const child of children) {
        if (ownedChildAlive(child))
          return op.finish({
            ok: false,
            status: 'port_occupied',
            message: '已有本地引擎进程正在运行，请先断开或切换端口',
          })
      }
      const connection = { defaultYakGRPCAddr: `127.0.0.1:${params.port}`, caPem: '', password: params.password }
      const args = [
        'grpc',
        '--local-password',
        params.password,
        '--frontend',
        String(params.version || 'yakit'),
        '--port',
        String(params.port),
      ]
      if (params.isEnpriTraceAgent) args.push('--disable-output')
      let inFlight = false
      let clearRetry = () => {}
      const tryConnect = () => {
        if (!op.current() || inFlight || !isAlive(op.child)) return
        clearRetry()
        inFlight = true
        authenticatedProbe(op, connection, (error) => {
          inFlight = false
          if (!isAlive(op.child)) return
          if (error) {
            if (error.unsafeEndpoint) {
              return op.finish({
                ok: false,
                status: 'protocol_error',
                message: '本地端口上的服务未启用认证，请切换端口或重新检查引擎',
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
            (event?.type === 'ready' && (event.transport !== 'tcp' || event.address !== connection.defaultYakGRPCAddr))
          ) {
            return op.finish({
              ok: false,
              status: 'protocol_error',
              message: '引擎返回了不兼容的连接信息，请重新检查或更新引擎',
            })
          }
          if (event?.type === 'failed')
            return op.finish(redactEngineData(classifyEngineFailure(event, 'start'), [params.password]))
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
    })
  }

  function connect(connection, requireLocalAuth = false) {
    return operation('connect', (op) => {
      const connectProbe = requireLocalAuth ? authenticatedProbe : probe
      const deadlineAt = Date.now() + limits.connect
      connectProbe(
        op,
        connection,
        (error, data) => {
          if (error)
            return op.finish({ ok: false, status: 'dial_error', message: '引擎连接失败，请检查地址和认证信息' })
          try {
            commitConnection(connection)
            op.finish({ ok: true, status: 'success', data })
          } catch {
            op.finish({ ok: false, status: 'exception', message: '引擎连接失败，请重试' })
          }
        },
        deadlineAt,
      )
    })
  }

  function cleanupAll() {
    const operationId = ++generation
    if (cleanupPromise) return cleanupPromise
    const pending = active
    const pendingChild = pending?.child || null
    const cleanupStartedAt = Date.now()
    const task = (async () => {
      let canceled = 0
      let failed = false
      logCleanup('cleanup_start', {
        operationId,
        stage: 'dispose',
        child: null,
        confirmedExit: null,
      })

      if (pending) {
        const result = await pending.cancel()
        if (result.status === 'cancelled') canceled++
        if (pending.cleanupFailed || ownedChildAlive(pendingChild)) failed = true
      }

      const retained = [...children].filter((child) => child !== pendingChild && ownedChildAlive(child))
      const retainedResults = await Promise.all(retained.map((child) => stopOwnedChild(child, operationId, 'dispose')))
      for (const confirmedExit of retainedResults) {
        if (confirmedExit) canceled++
        else failed = true
      }

      if (failed) {
        cleanupFailure = {
          ok: false,
          status: 'process_error',
          message: '引擎进程尚未退出，请稍后重试或查看日志',
        }
        return { ...cleanupFailure, canceled }
      }
      cleanupFailure = null
      return { ok: true, canceled, status: 'cancelled' }
    })()
      .catch(() => {
        cleanupFailure = {
          ok: false,
          status: 'process_error',
          message: '引擎进程清理失败，请稍后重试或查看日志',
        }
        return { ...cleanupFailure, canceled: 0 }
      })
      .then((result) => {
        logCleanup('cleanup_result', {
          operationId,
          stage: 'dispose',
          child: null,
          confirmedExit: result.ok,
          elapsedMs: Date.now() - cleanupStartedAt,
        })
        return result
      })
    cleanupPromise = task
    task.finally(() => {
      if (cleanupPromise === task) cleanupPromise = null
    })
    return task
  }

  function killOnExit() {
    for (const child of children) {
      if (ownedChildAlive(child)) {
        try {
          if (platform === 'win32') {
            childProcess.execFileSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
              windowsHide: true,
              timeout: 3000,
              stdio: 'ignore',
            })
          } else if (child.ownedProcessGroup) {
            killProcess(-child.ownedProcessGroup, 'SIGKILL')
          }
        } catch {}
        if (platform === 'win32') {
          try {
            child.kill('SIGKILL')
          } catch {}
        }
      }
    }
  }

  return { check, start, connect, cancel: cleanupAll, dispose: cleanupAll, killOnExit }
}

module.exports = { createEngineStartup, stopEngineChild, validLocalPassword }
