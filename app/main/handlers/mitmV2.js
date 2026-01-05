const {ipcMain} = require("electron")
const DNS = require("dns")
const {engineLogOutputFile, getFormattedDateTime} = require("../logFile")

// 创建消息发送器的工厂函数
const createMessageSender = (stream, options) => {
    const {maxRetries = 3} = options || {}
    // 内部变量
    let count = 0
    let isProcessing = false
    let messageStreamRequest = [] // 消息数据
    // 添加重试计数器
    let retryMap = new Map()
    // 失败重试
    const onErrorRetry = ({id, message, error}) => {
        const retries = retryMap.get(id) || 0
        if (retries < maxRetries) {
            retryMap.set(id, retries + 1)
            messageStreamRequest.unshift(message)
        } else {
            engineLogOutputFile(
                JSON.stringify({
                    grpcIInterface: "MITMV2",
                    time: getFormattedDateTime(),
                    message,
                    error
                })
            )
        }
    }
    // 处理请求发送
    const processQueue = async () => {
        if (isProcessing || !stream || !messageStreamRequest.length) return

        isProcessing = true
        const {id, message} = messageStreamRequest.shift()
        try {
            // 尝试写入流
            const canWrite = stream.write(
                message, // 消息序列化方法
                (error) => {
                    if (error) {
                        onErrorRetry({id, message, error})
                    }
                }
            )
            // 处理背压
            if (!canWrite) {
                await new Promise((resolve) => stream.once("drain", resolve))
            }
        } catch (err) {
            onErrorRetry({id, message, error})
        } finally {
            await new Promise((resolve) => setTimeout(resolve, 20)) // 必须加上，不然后端接口会卡死
            isProcessing = false
            processQueue() // 继续处理下一条
        }
    }
    // 对外暴露的接口
    return {
        send: (data) => {
            count += 1
            messageStreamRequest.push({
                id: count,
                message: data
            })
            processQueue() // 触发处理
        },
        destroy: () => {
            count = null
            isProcessing = null
            messageStreamRequest = null
            retryMap.clear()
            stream.cancel()
            retryMap = null
            stream = null
        }
    }
}

// module.exports = (win, originGetClient) => {
module.exports = (win, getClient) => {
    let stream
    let currentPort
    let currentHost
    let currentDownstreamProxy
    let currentDownstreamProxyRuleId
    let sendMessage
    let destroyMessage

    // 用于恢复正在劫持的 MITM 状态
    ipcMain.handle("mitmV2-have-current-stream", (e) => {
        return {
            haveStream: !!stream,
            host: currentHost,
            port: currentPort,
            downstreamProxy: currentDownstreamProxy,
            downstreamProxyRuleId: currentDownstreamProxyRuleId
        }
    })

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitmV2-recover", (e) => {
        if (stream) {
            sendMessage({RecoverContext: true})
        }
    })

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitmV2-reset-filter", (e) => {
        if (stream) {
            sendMessage({ResetFilter: true})
        }
    })

    //
    ipcMain.handle("mitmV2-auto-forward", (e, value) => {
        if (stream) {
            sendMessage({SetAutoForward: true, AutoForwardValue: value})
        }
    })

    ipcMain.handle("mitmV2-enable-plugin-mode", (e, InitPluginNames) => {
        if (stream) {
            sendMessage({SetPluginMode: true, InitPluginNames})
        }
    })

    // MITM 启用插件
    ipcMain.handle("mitmV2-exec-script-content", (e, content) => {
        if (stream) {
            sendMessage({SetYakScript: true, YakScriptContent: content})
        }
    })

    // MITM 启用插件，通过插件 ID
    ipcMain.handle("mitmV2-exec-script-by-id", (e, data) => {
        if (stream) {
            const {id, params} = data
            sendMessage({SetYakScript: true, YakScriptID: `${id}`, YakScriptParams: params})
        }
    })

    // MITM 获取当前已经启用的插件
    ipcMain.handle("mitmV2-get-current-hook", (e, data) => {
        if (stream) {
            sendMessage({GetCurrentHook: true})
        }
    })

    // MITM 移除插件
    ipcMain.handle("mitmV2-remove-hook", (e, params) => {
        if (stream) {
            sendMessage({
                RemoveHook: true,
                RemoveHookParams: params
            })
        }
    })

    // 设置过滤器
    ipcMain.handle("mitmV2-filter", (e, filter) => {
        if (stream) {
            sendMessage(filter)
        }
    })

    // 设置正则替换
    ipcMain.handle("mitmV2-content-replacers", (e, Replacers) => {
        if (stream) {
            sendMessage({Replacers, SetContentReplacers: true})
        }
    })

    // 清除 mitm 插件缓存
    ipcMain.handle("mitmV2-clear-plugin-cache", () => {
        if (stream) {
            sendMessage({SetClearMITMPluginContext: true})
        }
    })

    // 过滤 ws
    ipcMain.handle("mitmV2-filter-websocket", (e, filterWebsocket) => {
        if (stream) {
            sendMessage({FilterWebsocket: filterWebsocket, UpdateFilterWebsocket: true})
        }
    })

    // 下游代理
    ipcMain.handle("mitmV2-set-downstream-proxy", (e, {downstreamProxy, downstreamProxyRuleId }) => {
        if (stream) {
            sendMessage({SetDownstreamProxy: true, DownstreamProxy: downstreamProxy, DownstreamProxyRuleId: downstreamProxyRuleId})
        }
    })

    // 设置禁用系统代理
    ipcMain.handle("mitmV2-set-disable-system-proxy", (e, SetDisableSystemProxy) => {
        if (stream) {
            sendMessage({SetDisableSystemProxy})
        }
    })

    // host port
    ipcMain.handle("mitmV2-host-port", (e, params) => {
        if (stream) {
            const {host, port} = params
            sendMessage({
                Host: host,
                Port: port
            })
        }
    })

    /** 刷新重置手动劫持列表 */
    ipcMain.handle("mitmV2-recover-manual-hijack", (e, params) => {
        if (stream) {
            sendMessage({RecoverManualHijack: true})
        }
    })

    // 开始调用 MITM，设置 stream
    let isFirstData = true
    ipcMain.handle("mitmV2-start-call", (e, params) => {
        const {Host, Port, DownstreamProxy, DownstreamProxyRuleId, extra} = params
        if (stream) {
            if (win) {
                win.webContents.send("client-mitmV2-start-success")
            }
            return
        }

        isFirstData = true
        stream = getClient().MITMV2()
        // 设置服务器发回的消息的回调函数
        stream.on("data", (data) => {
            // 处理第一个消息
            // 第一个消息应该更新状态，第一个消息应该是同步 Filter 的信息。。。
            if (win && isFirstData) {
                isFirstData = false
                win.webContents.send("client-mitmV2-start-success")
            }

            // mitm 服务端控制客户端加载状态
            if (win && data["HaveLoadingSetter"]) {
                win.webContents.send("client-mitmV2-loading", !!data["LoadingFlag"])
            }

            // mitm 服务端给客户端发送提示信息
            if (win && data["HaveNotification"]) {
                win.webContents.send("client-mitmV2-notification", data["NotificationContent"])
            }

            // 检查替代规则的问题，如果返回了有内容，说明没 BUG
            if (win && (data?.Replacers || []).length > 0) {
                win.webContents.send("client-mitmV2-content-replacer-update", data.Replacers)
            }

            // 如果是强制更新的话，一般通过这里触发
            if (win && data?.JustContentReplacer) {
                win.webContents.send("client-mitmV2-content-replacer-update", data.Replacers)
            }

            // 检查如果是 exec result 的话，对应字段应该是
            if (win && data["HaveMessage"]) {
                win.webContents.send("client-mitmV2-message", data["Message"])
                return
            }

            // 看看当前系统的 hooks 有哪些
            if (win && data["GetCurrentHook"]) {
                win.webContents.send("client-mitmV2-hooks", data["Hooks"])
                return
            }

            // 把劫持到的信息发送回前端
            if (win) {
                if (data.JustFilter) {
                    win.webContents.send("client-mitmV2-filter", data.FilterData)
                    return
                }
                if (!data.ManualHijackListAction) return
                win.webContents.send("client-mitmV2-hijacked", {...data})
            }
        })
        stream.on("error", (err) => {
            stream = null
            destroyMessage()
            currentDownstreamProxyRuleId = ""
            currentDownstreamProxy = ""
            if (err.code && win) {
                switch (err.code) {
                    case 1:
                        win.webContents.send("client-mitmV2-error", "")
                        return
                    default:
                        win.webContents.send("client-mitmV2-error", err.details || `${err}`)
                        return
                }
            }
        })
        stream.on("end", () => {
            if (stream) {
                stream.cancel()
            }
            stream = null
            destroyMessage()
            currentDownstreamProxyRuleId = ""
            currentDownstreamProxy = ""
        })
        currentHost = Host
        currentPort = Port
        currentDownstreamProxy = DownstreamProxy
        currentDownstreamProxyRuleId = DownstreamProxyRuleId || ""
        if (stream) {
            const {send, destroy} = createMessageSender(stream)
            sendMessage = send
            destroyMessage = destroy
            if (params.hasOwnProperty("extra")) {
                delete params.extra
            }
            const value = {
                ...params,
                ...extra,
                DisableWebsocketCompression: !extra.DisableWebsocketCompression
            }
            sendMessage(value)
        }
    })
    ipcMain.handle("mitmV2-stop-call", () => {
        if (stream) {
            stream.cancel()
            stream = null
            mitmClient = null
        }
        currentDownstreamProxyRuleId = ""
        currentDownstreamProxy = ""
    })

    /**手动劫持 相关操作 */
    ipcMain.handle("mitmV2-manual-hijack-message", (e, params) => {
        if (stream) {
            const value = {
                ManualHijackControl: true,
                ManualHijackMessage: params
            }
            sendMessage(value)
        }
    })

    // 设置mitm filter
    const asyncSetMITMFilter = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetMITMFilter(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve(data)
            })
        })
    }

    ipcMain.handle("mitmV2-set-filter", async (e, params) => {
        if (stream) {
            sendMessage({...params, UpdateFilter: true})
        }
        return await asyncSetMITMFilter(params)
    })

    // 设置mitm Hijack filter
    const asyncSetMITMHijackFilter = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetMITMHijackFilter(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }

                resolve(data)
            })
        })
    }
    ipcMain.handle("mitmV2-hijack-set-filter", async (e, params) => {
        if (stream) {
            sendMessage({HijackFilterData: params.FilterData, UpdateHijackFilter: true})
        }
        return await asyncSetMITMHijackFilter(params)
    })

    // 开始追踪
    let traceStream
    let isFirstTraceData = true
    ipcMain.handle("start-mitm-plugin-trace", async (e, params) => {
        if (!win) return

        if (!stream) {
            win.webContents.send("start-mitm-plugin-trace-error", "MITM 劫持未启动")
            return
        }

        if (traceStream) {
            win.webContents.send("mitm-plugin-trace-start-success")
            return
        }

        traceStream = getClient().PluginTrace()
        if (traceStream) {
            traceStream.write(params)
        }

        isFirstTraceData = true
        traceStream.on("data", (data) => {
            if (data["ResponseType"] === "control_result") {
                if (data["Success"]) {
                    if (isFirstTraceData) {
                        isFirstTraceData = false
                        win.webContents.send("mitm-plugin-trace-start-success")
                    }
                } else if (data.Message) {
                    win.webContents.send("start-mitm-plugin-trace-error", data.Message)
                }
            } else if (data["ResponseType"] === "stats_update") {
                win.webContents.send("mitm-plugin-stats-update", data)
            } else if (data["ResponseType"] === "trace_update") {
                win.webContents.send("mitm-plugin-trace-update", data)
            }
        })
        traceStream.on("error", (err) => {
            traceStream = null
            win.webContents.send("start-mitm-plugin-trace-error", `${err}`)
        })
        traceStream.on("end", () => {
            if (traceStream) {
                traceStream.cancel()
            }
            traceStream = null
            win.webContents.send("mitm-plugin-trace-end")
        })
    })

    // 取消特定Trace
    ipcMain.handle("mitm-plugin-traceID-cancel", (e, traceID) => {
        if (!traceStream) return
        traceStream.write({
            ControlMode: "cancel_trace",
            TraceID: traceID
        })
    })

    // 停止追踪
    ipcMain.handle("mitm-plugin-trace-stop", () => {
        if (!traceStream) return
        traceStream.cancel()
        traceStream = null
    })

    // 进程监听
    const handlerHelper = require("./handleStreamWithContext")
    const streamWatchProcessConnectionMap = new Map();
    ipcMain.handle("cancel-WatchProcessConnection", handlerHelper.cancelHandler(streamWatchProcessConnectionMap));
    ipcMain.handle("WatchProcessConnectionWrite", (e, params, token) => {
        let stream = streamWatchProcessConnectionMap.get(token)
        if (!!stream) {
            stream.write(params)
        }
    })
    ipcMain.handle("WatchProcessConnection", (e, params, token) => {
        let stream = streamWatchProcessConnectionMap.get(token)
        if (stream) {
            stream.write(params)
            return
        }
        stream = getClient().WatchProcessConnection(params)
        handlerHelper.registerHandler(win, stream, streamWatchProcessConnectionMap, token)
    })
}
