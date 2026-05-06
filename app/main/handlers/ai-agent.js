const { ipcMain, shell } = require('electron')
const handlerHelper = require('./handleStreamWithContext')
const { yakProjects, yakTemp, aiImageTemp } = require('../filePath')
const fs = require('fs')
const path = require('path')

module.exports = (win, getClient) => {
  // #region AI-Task
  let aiChatTaskPool = new Map()
  // 开始执行 AI Task
  ipcMain.handle('start-ai-task', async (e, token, params) => {
    let stream = getClient().StartAITask()
    handlerHelper.registerHandler(win, stream, aiChatTaskPool, token)
    try {
      stream.write({ ...params })
    } catch (error) {
      throw new Error(error)
    }
  })
  // 发送信息给 AI Task
  ipcMain.handle('send-ai-task', async (e, token, params) => {
    const currentStream = aiChatTaskPool.get(token)
    if (!currentStream) {
      return Promise.reject('stream no exist')
    }
    try {
      currentStream.write({ ...params })
    } catch (error) {
      throw new Error(error)
    }
  })
  // 取消 AI Agent 聊天
  ipcMain.handle('cancel-ai-task', handlerHelper.cancelHandler(aiChatTaskPool))
  // #endregion

  // #region AI-ReAct
  let aiReActTaskPool = new Map()

  // aiWriteChainMap 用于让write操作是一个顺序队列执行
  let aiWriteChainMap = new Map()
  // 写操作的错误处理方法，保证写操作失败不会中断后续操作
  const safeWrite = async (stream, params, token) => {
    try {
      await stream.write({ ...params })
      return { success: true, token, params }
    } catch (error) {
      // console.log("write error: ", error)
      return { success: false, error, token, params }
    }
  }

  // 开始执行 AI ReAct
  ipcMain.handle('start-ai-re-act', async (e, token, params) => {
    if (aiReActTaskPool.has(token)) {
      return
    }
    let stream = getClient().StartAIReAct()
    aiWriteChainMap.set(token, Promise.resolve())
    let writeChain = aiWriteChainMap.get(token)
    handlerHelper.registerHandler(win, stream, aiReActTaskPool, token)
    try {
      writeChain = writeChain.then(() => safeWrite(stream, params, token))
      const qs = params?.Params?.UserQuery
      if (!!qs) {
        writeChain = writeChain.then(() =>
          safeWrite(
            stream,
            {
              IsFreeInput: true,
              FreeInput: qs,
              AttachedResourceInfo: params?.AttachedResourceInfo,
              FocusModeLoop: params?.FocusModeLoop,
            },
            token,
          ),
        )
      }
      aiWriteChainMap.set(token, writeChain)
    } catch (error) {
      throw new Error(error)
    }
  })
  // 发送信息给 AI ReAct
  ipcMain.handle('send-ai-re-act', async (e, token, params) => {
    const currentStream = aiReActTaskPool.get(token)
    if (!currentStream) {
      return Promise.reject('stream no exist')
    }
    if (!aiWriteChainMap.has(token)) {
      aiWriteChainMap.set(token, Promise.resolve())
    }
    try {
      let writeChain = aiWriteChainMap.get(token)
      writeChain = writeChain.then(() => safeWrite(currentStream, { ...params }, token))
      aiWriteChainMap.set(token, writeChain)
    } catch (error) {
      throw new Error(error)
    }
  })
  // 取消 AI ReAct
  ipcMain.handle(
    'cancel-ai-re-act',
    handlerHelper.cancelHandler(aiReActTaskPool, (token) => {
      aiWriteChainMap.delete(token)
    }),
  )
  // #endregion

  // #region AI-Forge
  const asyncCreateAIForge = (params) => {
    return new Promise((resolve, reject) => {
      getClient().CreateAIForge(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 创建 AI-Forge
  ipcMain.handle('CreateAIForge', async (e, params) => {
    return await asyncCreateAIForge(params)
  })

  const asyncUpdateAIForge = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateAIForge(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 编辑 AI-Forge
  ipcMain.handle('UpdateAIForge', async (e, params) => {
    return await asyncUpdateAIForge(params)
  })

  const asyncDeleteAIForge = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteAIForge(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 删除 AI-Forge
  ipcMain.handle('DeleteAIForge', async (e, params) => {
    return await asyncDeleteAIForge(params)
  })

  const asyncQueryAIEvent = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAIEvent(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 查询QueryAIEvent
  ipcMain.handle('QueryAIEvent', async (e, params) => {
    return await asyncQueryAIEvent(params)
  })

  const asyncDeleteAIEvent = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteAIEvent(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 删除 AI 事件
  ipcMain.handle('DeleteAIEvent', async (e, params) => {
    return await asyncDeleteAIEvent(params)
  })

  const asyncQueryAIForge = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAIForge(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  const asyncDeleteAITask = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteAITask(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 删除 AI Task
  ipcMain.handle('DeleteAITask', async (e, params) => {
    return await asyncDeleteAITask(params)
  })
  // 查询 AI-Forge 列表
  ipcMain.handle('QueryAIForge', async (e, params) => {
    return await asyncQueryAIForge(params)
  })

  const asyncGetAIForge = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetAIForge(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 查询 AI-Forge 单个详情
  ipcMain.handle('GetAIForge', async (e, params) => {
    return await asyncGetAIForge(params)
  })

  // 单个导入AIForge
  const importImportAIForgeMap = new Map()
  ipcMain.handle('cancel-ImportAIForge', handlerHelper.cancelHandler(importImportAIForgeMap))
  ipcMain.handle('ImportAIForge', (_, params, token) => {
    let stream = getClient().ImportAIForge(params)
    handlerHelper.registerHandler(win, stream, importImportAIForgeMap, token)
  })

  // 单个导出AIForge
  const exportAIForgeMap = new Map()
  ipcMain.handle('cancel-ExportAIForge', handlerHelper.cancelHandler(exportAIForgeMap))
  ipcMain.handle('ExportAIForge', (_, params, token) => {
    if (!fs.existsSync(yakProjects)) {
      try {
        fs.mkdirSync(yakProjects, { recursive: true })
      } catch (error) {}
    }
    let stream = getClient().ExportAIForge(params)
    handlerHelper.registerHandler(win, stream, exportAIForgeMap, token)
  })

  // 生成 yakit-projects 文件夹下 temp 里面的文件路径
  ipcMain.handle('GenerateTempFilePath', async (e, fileName) => {
    return path.join(yakTemp, fileName)
  })
  // #endregion

  // #region AI-Triage
  let aiChatTriagePool = new Map()
  // 开始执行 AI Triage
  ipcMain.handle('start-ai-triage', async (e, token, params) => {
    let stream = getClient().StartAITriage()
    handlerHelper.registerHandler(win, stream, aiChatTriagePool, token)
    try {
      stream.write({ ...params })
      const qs = params?.Params?.UserQuery
      if (!!qs) stream.write({ IsFreeInput: true, FreeInput: qs })
    } catch (error) {
      throw new Error(error)
    }
  })
  // 发送信息给 AI Triage
  ipcMain.handle('send-ai-triage', async (e, token, params) => {
    const currentStream = aiChatTriagePool.get(token)
    if (!currentStream) {
      return Promise.reject('stream no exist')
    }
    try {
      currentStream.write({ ...params })
    } catch (error) {
      throw new Error(error)
    }
  })
  // 取消 AI Triage
  ipcMain.handle('cancel-ai-triage', handlerHelper.cancelHandler(aiChatTriagePool))
  // #endregion

  //#region ai tool
  const asyncGetAIToolList = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetAIToolList(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  /**获取工具列表 */
  ipcMain.handle('GetAIToolList', async (e, param) => {
    return await asyncGetAIToolList(param)
  })

  const asyncDeleteAITool = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteAITool(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  /**获取工具列表 */
  ipcMain.handle('DeleteAITool', async (e, param) => {
    return await asyncDeleteAITool(param)
  })

  const asyncSaveAIToolV2 = (params) => {
    return new Promise((resolve, reject) => {
      getClient().SaveAIToolV2(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  /**新增工具 */
  ipcMain.handle('SaveAIToolV2', async (e, param) => {
    return await asyncSaveAIToolV2(param)
  })

  const asyncUpdateAITool = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateAITool(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  /**新增工具 */
  ipcMain.handle('UpdateAITool', async (e, param) => {
    return await asyncUpdateAITool(param)
  })

  const asyncToggleAIToolFavorite = (params) => {
    return new Promise((resolve, reject) => {
      getClient().ToggleAIToolFavorite(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }

  /**收藏 */
  ipcMain.handle('ToggleAIToolFavorite', async (e, param) => {
    return await asyncToggleAIToolFavorite(param)
  })

  const asyncAIToolGenerateMetadata = (params) => {
    return new Promise((resolve, reject) => {
      getClient().AIToolGenerateMetadata(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('AIToolGenerateMetadata', async (e, param) => {
    return await asyncAIToolGenerateMetadata(param)
  })
  //#endregion

  //#region ai 首页
  const asyncGetRandomAIMaterials = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetRandomAIMaterials(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 获取首页随机列表数据
  ipcMain.handle('GetRandomAIMaterials', async (e, params) => {
    return await asyncGetRandomAIMaterials(params)
  })

  const asyncQueryAISession = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAISession(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 查询 AI 会话列表
  ipcMain.handle('QueryAISession', async (e, params) => {
    return await asyncQueryAISession(params)
  })

  const asyncDeleteAISession = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteAISession(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }

  // 删除 AI 会话
  ipcMain.handle('DeleteAISession', async (e, params) => {
    return await asyncDeleteAISession(params)
  })

  const asyncUpdateAISessionTitle = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateAISessionTitle(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 修改 AI 会话标题
  ipcMain.handle('UpdateAISessionTitle', async (e, params) => {
    return await asyncUpdateAISessionTitle(params)
  })

  // #endregion

  // #region AI-Log-Export
  const asyncExportAILogs = (params) => {
    return new Promise((resolve, reject) => {
      getClient().ExportAILogs(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  ipcMain.handle('ExportAILogs', async (e, params) => {
    const res = await asyncExportAILogs(params)
    if (res && res.FilePath) {
      shell.showItemInFolder(res.FilePath)
    }
    return res
  })
  // #endregion

  // #region AI-Focus 专注模式
  const asyncQueryAIFocus = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAIFocus(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 查询 AI-Focus 专注模式
  ipcMain.handle('QueryAIFocus', async (e, params) => {
    return await asyncQueryAIFocus(params)
  })
  // #endregion
  // #region AI-Memory AI记忆库
  const asyncCreateAIMemoryEntity = (params) => {
    return new Promise((resolve, reject) => {
      getClient().CreateAIMemoryEntity(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 创建 AI-Memory AI记忆
  ipcMain.handle('CreateAIMemoryEntity', async (e, params) => {
    return await asyncCreateAIMemoryEntity(params)
  })

  const asyncUpdateAIMemoryEntity = (params) => {
    return new Promise((resolve, reject) => {
      getClient().UpdateAIMemoryEntity(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 更新 AI-Memory AI记忆
  ipcMain.handle('UpdateAIMemoryEntity', async (e, params) => {
    return await asyncUpdateAIMemoryEntity(params)
  })

  const asyncDeleteAIMemoryEntity = (params) => {
    return new Promise((resolve, reject) => {
      getClient().DeleteAIMemoryEntity(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 删除 AI-Memory AI记忆
  ipcMain.handle('DeleteAIMemoryEntity', async (e, params) => {
    return await asyncDeleteAIMemoryEntity(params)
  })

  const asyncQueryAIMemoryEntity = (params) => {
    return new Promise((resolve, reject) => {
      getClient().QueryAIMemoryEntity(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 查询 AI-Memory AI记忆
  ipcMain.handle('QueryAIMemoryEntity', async (e, params) => {
    return await asyncQueryAIMemoryEntity(params)
  })

  const asyncGetAIMemoryEntity = (params) => {
    return new Promise((resolve, reject) => {
      getClient().GetAIMemoryEntity(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 获取 AI-Memory AI记忆详情
  ipcMain.handle('GetAIMemoryEntity', async (e, params) => {
    return await asyncGetAIMemoryEntity(params)
  })

  const asyncCountAIMemoryEntityTags = (params) => {
    return new Promise((resolve, reject) => {
      getClient().CountAIMemoryEntityTags(params, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(data)
      })
    })
  }
  // 获取 AI-Memory tag统计
  ipcMain.handle('CountAIMemoryEntityTags', async (e, params) => {
    return await asyncCountAIMemoryEntityTags(params)
  })
  // #endregion

  // region AI-Image
  ipcMain.handle('save-ai-image', (event, params, token) => {
    return new Promise((resolve, reject) => {
      const { buffer, filename, sessionID = '', chatDataStoreKey = '' } = params
      const url = path.join(aiImageTemp, chatDataStoreKey, sessionID)
      // 确保目录存在
      if (!fs.existsSync(url)) {
        fs.mkdirSync(url, { recursive: true })
      }
      const savePath = path.join(url, filename)
      const data = Buffer.from(buffer)

      const totalSize = data.length
      // 设置分块写入大小为 256KB，图片较小时也能触发多次进度
      const chunkSize = 50 * 1024
      const writeStream = fs.createWriteStream(savePath)
      let offset = 0

      const writeNextChunk = () => {
        if (offset >= totalSize) {
          writeStream.end()
          return
        }

        const end = Math.min(offset + chunkSize, totalSize)
        const chunk = data.slice(offset, end)
        const canContinue = writeStream.write(chunk)

        offset = end

        // 计算并向前端发送当前文件的写入进度事件
        const progress = Math.round((offset / totalSize) * 100)
        // 通过唯一标识区分并发送进度事件，确保前端能正确关联到对应的文件写入操作
        event.sender.send(`save-ai-image-progress-${token}`, progress)

        if (canContinue) {
          // 利用 setImmediate 避免阻塞主线程事件循环，让进度消息能顺畅返回前端
          setImmediate(writeNextChunk)
        } else {
          writeStream.once('drain', writeNextChunk)
        }
      }

      writeStream.on('finish', () => {
        resolve(savePath)
        event.sender.send(`save-ai-image-finish-${token}`, savePath)
      })

      writeStream.on('error', (err) => {
        event.sender.send(`save-ai-image-err-${token}`, err)
        reject(err)
      })

      writeNextChunk()
    })
  })

  ipcMain.handle('delete-ai-image', async (event, params, token) => {
    try {
      const { sessionID = [], chatDataStoreKey = '' } = params
      let errorMsg = ''
      // 参数校验
      if (!token || typeof token !== 'string') {
        errorMsg = 'token 必须是一个字符串'
      }
      if (!chatDataStoreKey || typeof chatDataStoreKey !== 'string') {
        errorMsg = 'chatDataStoreKey 必须是一个字符串'
      }
      if (!Array.isArray(sessionID) || sessionID.some((item) => typeof item !== 'string')) {
        errorMsg = 'sessionID 必须要是一个string类型的数组'
      }
      if (!!errorMsg) {
        event.sender.send(`delete-ai-image-err-${token}`, { targetPath: '', error: errorMsg })
        event.sender.send(`delete-ai-image-finish-${token}`)
        throw new Error(errorMsg)
      }
      const sessionIDs = sessionID.filter(Boolean)
      const totalSize = sessionIDs.length

      if (totalSize === 0) {
        if (chatDataStoreKey) {
          const targetPath = path.join(aiImageTemp, chatDataStoreKey)
          if (fs.existsSync(targetPath)) {
            // 先读取目录下的内容，以此计算进度
            const files = await fs.promises.readdir(targetPath)
            const filesLen = files.length

            if (filesLen > 0) {
              let delCount = 0
              for (let i = 0; i < filesLen; i++) {
                const subPath = path.join(targetPath, files[i])
                try {
                  await fs.promises.rm(subPath, { recursive: true, force: true })
                } catch (error) {
                  event.sender.send(`delete-ai-image-err-${token}`, { targetPath, error: error.message })
                }

                delCount++

                const progress = Math.round((delCount / filesLen) * 100)
                event.sender.send(`delete-ai-image-progress-${token}`, progress)
              }
            }
            try {
              // 子文件清理完后，删除自身这个已清空的父文件夹
              await fs.promises.rm(targetPath, { recursive: true, force: true })
            } catch (error) {
              event.sender.send(`delete-ai-image-err-${token}`, { targetPath, error: error.message })
            }
          }
        } else {
          event.sender.send(`delete-ai-image-progress-${token}`, 100)
        }
        event.sender.send(`delete-ai-image-finish-${token}`)
        return true
      }

      let deletedCount = 0

      for (let i = 0; i < totalSize; i++) {
        const id = sessionIDs[i]
        if (id) {
          // 强制转为 String 防止外部意外传入数字导致 path.join 崩溃
          const targetPath = path.join(aiImageTemp, chatDataStoreKey, String(id))

          if (fs.existsSync(targetPath)) {
            try {
              // 使用异步的 rm 替代 unlink，支持删除整个文件夹，且确保顺序执行以计算进度
              await fs.promises.rm(targetPath, { recursive: true, force: true })
            } catch (error) {
              event.sender.send(`delete-ai-image-err-${token}`, { targetPath, error: error.message })
            }
          }
        }

        deletedCount++
        const progress = Math.round((deletedCount / totalSize) * 100)
        event.sender.send(`delete-ai-image-progress-${token}`, progress)
      }

      event.sender.send(`delete-ai-image-finish-${token}`)

      return true
    } catch (error) {
      if (token) {
        event.sender.send(`delete-ai-image-err-${token}`, { targetPath: '', error: error.message })
        event.sender.send(`delete-ai-image-finish-${token}`)
      }
      throw error
    }
  })
  // #endregion
}
