const {ipcMain} = require("electron")
const DNS = require("dns")

// module.exports = (win, originGetClient) => {
module.exports = (win, getClient) => {
    let stream
    let currentPort
    let currentHost
    let currentDownstreamProxy
    // 用于恢复正在劫持的 MITM 状态
    ipcMain.handle("mitmV2-have-current-stream", (e) => {
        return {
            haveStream: !!stream,
            host: currentHost,
            port: currentPort,
            downstreamProxy: currentDownstreamProxy
        }
    })

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitmV2-recover", (e) => {
        if (stream) {
            stream.write({
                RecoverContext: true
            })
        }
    })

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitmV2-reset-filter", (e) => {
        if (stream) {
            stream.write({
                ResetFilter: true
            })
        }
    })

    //
    ipcMain.handle("mitmV2-auto-forward", (e, value) => {
        if (stream) {
            stream.write({SetAutoForward: true, AutoForwardValue: value})
        }
    })

    ipcMain.handle("mitmV2-enable-plugin-mode", (e, InitPluginNames) => {
        if (stream) {
            stream.write({
                SetPluginMode: true,
                InitPluginNames
            })
        }
    })

    // MITM 启用插件
    ipcMain.handle("mitmV2-exec-script-content", (e, content) => {
        if (stream) {
            stream.write({
                SetYakScript: true,
                YakScriptContent: content
            })
        }
    })

    // MITM 启用插件，通过插件 ID
    ipcMain.handle("mitmV2-exec-script-by-id", (e, data) => {
        if (stream) {
            const {id, params} = data
            stream.write({
                SetYakScript: true,
                YakScriptID: `${id}`,
                YakScriptParams: params
            })
        }
    })

    // MITM 获取当前已经启用的插件
    ipcMain.handle("mitmV2-get-current-hook", (e, data) => {
        if (stream) {
            stream.write({
                GetCurrentHook: true
            })
        }
    })

    // MITM 移除插件
    ipcMain.handle("mitmV2-remove-hook", (e, params) => {
        if (stream) {
            stream.write({
                RemoveHook: true,
                RemoveHookParams: params
            })
        }
    })

    // 设置过滤器
    ipcMain.handle("mitmV2-filter", (e, filter) => {
        if (stream) {
            stream.write(filter)
        }
    })

    // 设置正则替换
    ipcMain.handle("mitmV2-content-replacers", (e, Replacers) => {
        if (stream) {
            stream.write({Replacers, SetContentReplacers: true})
        }
    })

    // 清除 mitm 插件缓存
    ipcMain.handle("mitmV2-clear-plugin-cache", () => {
        if (stream) {
            stream.write({
                SetClearMITMPluginContext: true
            })
        }
    })

    // 过滤 ws
    ipcMain.handle("mitmV2-filter-websocket", (e, filterWebsocket) => {
        if (stream) {
            stream.write({
                FilterWebsocket: filterWebsocket,
                UpdateFilterWebsocket: true
            })
        }
    })

    // 下游代理
    ipcMain.handle("mitmV2-set-downstream-proxy", (e, downstreamProxy) => {
        if (stream) {
            stream.write({
                SetDownstreamProxy: true,
                DownstreamProxy: downstreamProxy
            })
        }
    })

    // host port
    ipcMain.handle("mitmV2-host-port", (e, params) => {
        if (stream) {
            const {host, port} = params
            stream.write({
                Host: host,
                Port: port
            })
        }
    })

    /** 刷新重置手动劫持列表 */
    ipcMain.handle("mitmV2-recover-manual-hijack", (e, params) => {
        if (stream) {
            stream.write({
                RecoverManualHijack: true
            })
        }
    })

    // 开始调用 MITM，设置 stream
    let isFirstData = true
    ipcMain.handle("mitmV2-start-call", (e, params) => {
        const {Host, Port, DownstreamProxy, extra} = params
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
            stream = undefined
        })
        currentHost = Host
        currentPort = Port
        currentDownstreamProxy = DownstreamProxy
        if (stream) {
            if (params.hasOwnProperty("extra")) {
                delete params.extra
            }
            const value = {
                ...params,
                ...extra,
                DisableWebsocketCompression: !extra.DisableWebsocketCompression
            }
            stream.write(value)
        }
    })
    ipcMain.handle("mitmV2-stop-call", () => {
        if (stream) {
            stream.cancel()
            stream = null
            mitmClient = null
        }
    })

    /**手动劫持 相关操作 */
    ipcMain.handle("mitmV2-manual-hijack-message", (e, params) => {
        if (stream) {
            const value = {
                ManualHijackControl: true,
                ManualHijackMessage: params
            }
            stream.write(value)
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
            stream.write({...params, UpdateFilter: true})
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
            stream.write({HijackFilterData: params.FilterData, UpdateHijackFilter: true})
        }
        return await asyncSetMITMHijackFilter(params)
    })
}
