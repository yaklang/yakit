const { ipcMain } = require('electron')
const handlerHelper = require('./handleStreamWithContext')

module.exports = (win, getClient) => {
  for (const method of ['QueryPCAPDatabase', 'ExportPCAPData', 'DeletePCAPDatabase']) {
    ipcMain.handle(method, async (_event, params) => {
      return await new Promise((resolve, reject) => {
        const client = getClient()
        if (typeof client[method] !== 'function') {
          reject(new Error('当前引擎不支持 PCAP 数据库，请更新引擎'))
          return
        }
        client[method](params, (err, data) => (err ? reject(err) : resolve(data)))
      })
    })
  }

  const imports = new Map()
  handlerHelper.bindWindowLifecycle(win, imports)
  ipcMain.handle('ImportPCAPFile', (event, params, token) => {
    const { mapToken, eventToken } = handlerHelper.resolveRendererStreamToken(event, win, token)
    if (imports.has(mapToken)) return
    const stream = getClient().ImportPCAPFile(params)
    handlerHelper.registerHandler(win, stream, imports, mapToken, eventToken)
  })
  ipcMain.handle('cancel-ImportPCAPFile', (event, token) => {
    const { mapToken } = handlerHelper.resolveRendererStreamToken(event, win, token)
    return handlerHelper.cancelHandler(imports)(event, mapToken)
  })

  // asyncQueryTrafficSession wrapper
  const asyncQueryTrafficSession = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryTrafficSession(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryTrafficSession', async (e, params) => {
    return await asyncQueryTrafficSession(params)
  })

  // asyncQueryTrafficPacket wrapper
  const asyncQueryTrafficPacket = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryTrafficPacket(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryTrafficPacket', async (e, params) => {
    return await asyncQueryTrafficPacket(params)
  })

  // asyncGetPcapMetadata wrapper
  const asyncGetPcapMetadata = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetPcapMetadata(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GetPcapMetadata', async (e, params) => {
    return await asyncGetPcapMetadata(params)
  })

  const streamPcapXMap = new Map()
  ipcMain.handle('cancel-PcapX', handlerHelper.cancelHandler(streamPcapXMap))
  ipcMain.handle('PcapX', (e, params, token) => {
    if (streamPcapXMap.has(token)) {
      const stream = streamPcapXMap.get(token)
      stream.write(params)
      return
    }
    const stream = getClient().PcapX()
    stream.write(params)
    handlerHelper.registerHandler(win, stream, streamPcapXMap, token)
  })

  // asyncQueryTrafficTCPReassembled wrapper
  const asyncQueryTrafficTCPReassembled = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryTrafficTCPReassembled(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryTrafficTCPReassembled', async (e, params) => {
    return await asyncQueryTrafficTCPReassembled(params)
  })

  // asyncParseTraffic wrapper
  const asyncParseTraffic = (params) => {
    return new Promise((resolve, reject) => {
      getClient().ParseTraffic(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('ParseTraffic', async (e, params) => {
    return await asyncParseTraffic(params)
  })
}
