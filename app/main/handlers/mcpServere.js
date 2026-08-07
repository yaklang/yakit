const { ipcMain } = require('electron')
const { assertTrustedAppSender } = require('../security')

module.exports = (win, getClient) => {
  // asyncAddMCPServer wrapper
  const asyncAddMCPServer = (params) => {
    return new Promise((resolve, reject) => {
      getClient().AddMCPServer(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('AddMCPServer', async (e, params) => {
    assertTrustedAppSender(e, 'AddMCPServer')
    return await asyncAddMCPServer(params)
  })

  // asyncDeleteMCPServer wrapper
  const asyncDeleteMCPServer = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteMCPServer(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteMCPServer', async (e, params) => {
    assertTrustedAppSender(e, 'DeleteMCPServer')
    return await asyncDeleteMCPServer(params)
  })

  // asyncUpdateMCPServer wrapper
  const asyncUpdateMCPServer = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateMCPServer(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('UpdateMCPServer', async (e, params) => {
    assertTrustedAppSender(e, 'UpdateMCPServer')
    return await asyncUpdateMCPServer(params)
  })

  // asyncGetAllMCPServers wrapper
  const asyncGetAllMCPServers = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetAllMCPServers(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GetAllMCPServers', async (e, params) => {
    assertTrustedAppSender(e, 'GetAllMCPServers')
    return await asyncGetAllMCPServers(params)
  })

  // asyncGetMCPToolList wrapper
  const asyncGetMCPToolList = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetMCPToolList(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GetMCPToolList', async (e, params) => {
    assertTrustedAppSender(e, 'GetMCPToolList')
    return await asyncGetMCPToolList(params)
  })

  // asyncSetMCPToolEnabled wrapper
  const asyncSetMCPToolEnabled = (params) => {
    return new Promise((resolve, reject) => {
      getClient().SetMCPToolEnabled(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('SetMCPToolEnabled', async (e, params) => {
    assertTrustedAppSender(e, 'SetMCPToolEnabled')
    return await asyncSetMCPToolEnabled(params)
  })

  const asyncQueryMCPToolCallHistory = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryMCPToolCallHistory(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('QueryMCPToolCallHistory', async (e, params) => {
    assertTrustedAppSender(e, 'QueryMCPToolCallHistory')
    return await asyncQueryMCPToolCallHistory(params)
  })

  const asyncGetMCPToolCallHistoryDetail = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetMCPToolCallHistoryDetail(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('GetMCPToolCallHistoryDetail', async (e, params) => {
    assertTrustedAppSender(e, 'GetMCPToolCallHistoryDetail')
    return await asyncGetMCPToolCallHistoryDetail(params)
  })

  const asyncDeleteMCPToolCallHistory = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteMCPToolCallHistory(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('DeleteMCPToolCallHistory', async (e, params) => {
    assertTrustedAppSender(e, 'DeleteMCPToolCallHistory')
    return await asyncDeleteMCPToolCallHistory(params)
  })
}
