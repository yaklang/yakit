const { ipcMain } = require("electron")
const fs = require("fs")
const path = require("path")
const https = require("https")
const { yakProjects } = require("../filePath")

module.exports = (win, getClient) => {
  const asyncGetAllFingerprintGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetAllFingerprintGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 获取本地指纹组列表数据
  ipcMain.handle("GetAllFingerprintGroup", async (e, params) => {
    return await asyncGetAllFingerprintGroup(params)
  })

  const asyncCreateFingerprintGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().CreateFingerprintGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 创建本地指纹组
  ipcMain.handle("CreateFingerprintGroup", async (e, params) => {
    return await asyncCreateFingerprintGroup(params)
  })

  const asyncRenameFingerprintGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().RenameFingerprintGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 更新本地指纹组
  ipcMain.handle("RenameFingerprintGroup", async (e, params) => {
    return await asyncRenameFingerprintGroup(params)
  })

  const asyncDeleteFingerprintGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteFingerprintGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 删除本地指纹组
  ipcMain.handle("DeleteFingerprintGroup", async (e, params) => {
    return await asyncDeleteFingerprintGroup(params)
  })

  const asyncQueryFingerprint = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryFingerprint(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 获取本地指纹列表数据
  ipcMain.handle("QueryFingerprint", async (e, params) => {
    return await asyncQueryFingerprint(params)
  })

  const asyncDeleteFingerprint = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteFingerprint(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 删除本地指纹列表数据
  ipcMain.handle("DeleteFingerprint", async (e, params) => {
    return await asyncDeleteFingerprint(params)
  })

  const asyncUpdateFingerprint = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateFingerprint(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 更新本地指纹
  ipcMain.handle("UpdateFingerprint", async (e, params) => {
    return await asyncUpdateFingerprint(params)
  })

  const asyncCreateFingerprint = (params) => {
    return new Promise((resolve, reject) => {
      getClient().CreateFingerprint(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 创建本地指纹
  ipcMain.handle("CreateFingerprint", async (e, params) => {
    return await asyncCreateFingerprint(params)
  })

  // 导出指纹
  const handlerHelper = require("./handleStreamWithContext")
  const exportFingerprintMap = new Map()
  ipcMain.handle("cancel-ExportFingerprint", handlerHelper.cancelHandler(exportFingerprintMap))
  ipcMain.handle("ExportFingerprint", (_, params, token) => {
    const { TargetPath } = params
    if (!fs.existsSync(yakProjects)) {
      try {
        fs.mkdirSync(yakProjects, { recursive: true })
      } catch (error) { }
    }
    params.TargetPath = path.join(yakProjects, TargetPath)
    let stream = getClient().ExportFingerprint(params)
    handlerHelper.registerHandler(win, stream, exportFingerprintMap, token)
  })

  // 导入指纹
  const importFingerprintMap = new Map()
  ipcMain.handle("cancel-ImportFingerprint", handlerHelper.cancelHandler(importFingerprintMap))
  ipcMain.handle("ImportFingerprint", (_, params, token) => {
    let stream = getClient().ImportFingerprint(params)
    handlerHelper.registerHandler(win, stream, importFingerprintMap, token)
  })

  const asyncGetFingerprintGroupSetByFilter = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetFingerprintGroupSetByFilter(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 查询指纹集合的所属组交集
  ipcMain.handle("GetFingerprintGroupSetByFilter", async (e, params) => {
    return await asyncGetFingerprintGroupSetByFilter(params)
  })

  const asyncBatchUpdateFingerprintToGroup = (params) => {
    return new Promise((resolve, reject) => {
      getClient().BatchUpdateFingerprintToGroup(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 更新指纹里的本地组
  ipcMain.handle("BatchUpdateFingerprintToGroup", async (e, params) => {
    return await asyncBatchUpdateFingerprintToGroup(params)
  })

  const asyncDownloadFingerprint = (savePath) => {
    return new Promise((resolve, reject) => {
      // 判断是否有写入权限
      const dir = path.dirname(savePath)
      try {
        fs.accessSync(dir, fs.constants.W_OK)
      } catch (err) {
        return reject(err)
      }

      let file
      try {
        file = fs.createWriteStream(savePath)
      } catch (err) {
        return reject(err)
      }

      // 关闭文件句柄
      function safeUnlink(file, savePath, cb) {
        if (file) {
          try {
            file.close(() => fs.unlink(savePath, cb))
          } catch (e) {
            fs.unlink(savePath, cb)
          }
        } else {
          fs.unlink(savePath, cb)
        }
      }

      const request = https.get("https://yaklang.oss-cn-beijing.aliyuncs.com/fingerprints.zip", (res) => {
        if (res.statusCode !== 200) {
          safeUnlink(file, savePath, () => { })
          return reject(new Error(`Download failed with status ${res.statusCode}`))
        }

        res.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve(savePath)
        })

        // 文件写入失败
        file.on('error', (err) => {
          safeUnlink(file, savePath, () => { })
          reject(err)
        })

        // 下载流错误
        res.on('error', (err) => {
          safeUnlink(file, savePath, () => { })
          reject(err)
        })
      })

      // 请求错误
      request.on('error', (err) => {
        safeUnlink(file, savePath, () => { })
        reject(err)
      })
    })
  }
  // 下载默认指纹到指定路径
  ipcMain.handle("DownloadFingerprint", async (e, savePath) => {
    return await asyncDownloadFingerprint(savePath)
  })
}