const { app, ipcMain } = require('electron')
const { createEngineSession } = require('./engineSession')
const { validPort } = require('./engineEndpoint')
const { assertTrustedAppSender } = require('../../security')
const { getLocalYaklangEngine, getYakitHome } = require('../../filePath')
const { GLOBAL_YAK_SETTING } = require('../../state')
const { engineLogOutputFileAndUI } = require('../../logFile')

const windows = new Set()
let session
function getEngineSession(win, callback, newClient) {
  if (win) {
    windows.add(win)
    win.once('closed', () => windows.delete(win))
  }
  if (session) return session
  if (!callback || !newClient) throw new Error('Engine session has not been initialized')
  const databaseEnv = {
    irify: {
      YAK_DEFAULT_PROFILE_DATABASE_NAME: 'irify-profile-rule.db',
      YAK_DEFAULT_PROJECT_DATABASE_NAME: 'default-irify.db',
      SSA_DATABASE_RAW: 'default-yakssa.db',
    },
    memfit: { YAK_DEFAULT_PROJECT_DATABASE_NAME: 'default-memfit.db' },
  }
  session = createEngineSession({
    getCommand: getLocalYaklangEngine,
    getEnv: (edition) => ({ ...process.env, YAKIT_HOME: getYakitHome(), ...(databaseEnv[edition] || {}) }),
    createClient: newClient,
    commitConnection: ({ defaultYakGRPCAddr, caPem, password }) => {
      callback(defaultYakGRPCAddr, caPem, password)
      GLOBAL_YAK_SETTING.defaultYakGRPCAddr = defaultYakGRPCAddr
    },
    disconnectConnection: () => {
      callback('', '', '')
      GLOBAL_YAK_SETTING.defaultYakGRPCAddr = ''
    },
    log: (line) => {
      const target = [...windows].find((item) => !item.isDestroyed())
      if (target) engineLogOutputFileAndUI(target, line)
    },
    notify: (key) => {
      for (const target of windows) {
        try {
          if (!target.isDestroyed() && !target.webContents.isDestroyed())
            target.webContents.send('startUp-engine-msg', key)
        } catch {}
      }
    },
  })
  // The logical Yakit session survives the Link -> main window handoff.
  // No BrowserWindow close handler owns or disposes these processes.
  process.once('exit', session.killOnExit)
  app.once('before-quit', () => {
    void session.stopAll()
  })
  return session
}

async function connectEngine(params = {}) {
  const manager = getEngineSession()
  let result
  if (params.Mode === 'local' || params.InstanceId || params.LaunchId || params.Endpoint) {
    result = await manager.connect(params)
  } else {
    const raw = String(params.Host || '127.0.0.1')
    let host = raw
    let port = params.Port
    const combined = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(raw)
    if (combined) [, host, port] = combined
    if (!validPort(port) || /[\s/\\]/.test(host)) throw new Error('引擎连接地址无效')
    const address = `${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${port}`
    result = await manager.connectRemote({
      defaultYakGRPCAddr: address,
      caPem: Buffer.from(params.PemBytes || '').toString('utf8'),
      password: params.Password || '',
    })
  }
  if (!result.ok) throw new Error(result.message)
  return result.data
}

function registerSessionIPC(prefix = '') {
  const handle = (name, work) =>
    ipcMain.handle(prefix + name, (event, ...args) => {
      assertTrustedAppSender(event, prefix + name)
      return work(getEngineSession(), ...args)
    })
  handle('local-engine-list', (manager) => manager.list())
  handle('local-engine-current', (manager) => manager.current())
  handle('local-engine-stop', (manager, instanceId) => manager.stop(instanceId))
  handle('local-engine-stop-all', (manager) => manager.stopAll())
  handle('local-engine-disconnect', (manager) => manager.disconnect())
  handle('local-engine-launch', (manager, params) => manager.launch(params))
}

module.exports = { getEngineSession, connectEngine, registerSessionIPC }
