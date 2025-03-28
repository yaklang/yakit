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
            HaveStream: !!stream,
            Host: currentHost,
            Port: currentPort,
            DownstreamProxy: currentDownstreamProxy
        }
    })

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitmV2-recover", (e) => {
        if (stream) {
            stream.write({
                RecoverManualHijack: true
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

    // 丢掉该消息
    ipcMain.handle("mitmV2-drop-request", (e, params) => {
        //TODO - 丢掉 新版传ManualHijackMessage
        if (stream) {
            // stream.write({
            //     id,
            //     drop: true
            // })
        }
    })

    // 丢掉该响应
    ipcMain.handle("mitmV2-drop-response", (e, id) => {
        if (stream) {
            //TODO - 丢掉 新版传ManualHijackMessage
            // stream.write({
            //     responseId: id,
            //     drop: true
            // })
        }
    })

    // 原封不动转发
    ipcMain.handle("mitmV2-forward-response", (e, id) => {
        if (stream) {
            //TODO - 转发
            // stream.write({
            //     responseId: id,
            //     forward: true
            // })
        }
    })

    // 原封不动转发请求
    ipcMain.handle("mitmV2-forward-request", (e, id) => {
        if (stream) {
            //TODO - 转发
            // stream.write({
            //     id: id,
            //     forward: true
            // })
        }
    })

    // 发送劫持请当前请求的消息，可以劫持当前响应的请求
    ipcMain.handle("mitmV2-hijacked-current-response", (e, id, should) => {
        //TODO - hijacked
        // if (stream) {
        //     if (should) {
        //         stream.write({
        //             id: id,
        //             hijackResponse: true
        //         })
        //     } else {
        //         stream.write({
        //             id: id,
        //             cancelhijackResponse: true
        //         })
        //     }
        // }
    })

    ipcMain.handle("mitmV2-enable-plugin-mode", (e, InitPluginNames) => {
        if (stream) {
            stream.write({
                SetPluginMode: true,
                InitPluginNames
            })
        }
    })

    // 用来关闭 MITM 劫持的信息流
    ipcMain.handle("mitmV2-close-stream", (e) => {
        if (stream) {
            stream.cancel()
            stream = null
        }
    })

    // MITM 转发
    ipcMain.handle("mitmV2-forward-modified-request", (e, params) => {
        //TODO -
        
    })
    // MITM 转发 - HTTP 响应
    ipcMain.handle("mitmV2-forward-modified-response", (e, response, id) => {
         //TODO -
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
    ipcMain.handle("mitmV2-exec-script-by-id", (e, id, params) => {
        if (stream) {
            stream.write({
                SetYakScript: true,
                YakScriptID: `${id}`,
                YakScriptParams: params
            })
        }
    })

    // MITM 获取当前已经启用的插件
    ipcMain.handle("mitmV2-get-current-hook", (e, id, params) => {
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
    ipcMain.handle("mitmV2-content-replacers", (e, filter) => {
        if (stream) {
            stream.write({...filter, SetContentReplacers: true})
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
                FilterWebsocket,
                UpdateFilterWebsocket: true
            })
        }
    })

    // 下游代理
    ipcMain.handle("mitmV2-set-downstream-proxy", (e, downstreamProxy) => {
        if (stream) {
            stream.write({
                SetDownstreamProxy: true,
                DownstreamProxy
            })
        }
    })

    // host port
    ipcMain.handle("mitmV2-host-port", (e, params) => {
        const {Host, Port} = params
        if (stream) {
            stream.write({
                Host,
                Port
            })
        }
    })

    // 开始调用 MITM，设置 stream
    let isFirstData = true
    ipcMain.handle("mitmV2-start-call", (e, params) => {
        const {Host, Port, DownstreamProxy} = params
        if (stream) {
            if (win) {
                win.webContents.send("client-mitmV2-start-success")
            }
            return
        }

        isFirstData = true
        stream = getClient().MITM()
        // 设置服务器发回的消息的回调函数
        stream.on("data", (data) => {
            // 处理第一个消息
            // 第一个消息应该更新状态，第一个消息应该是同步 Filter 的信息。。。
            if (win && isFirstData) {
                isFirstData = false
                win.webContents.send("client-mitmV2-start-success")
            }

            // mitm 服务端控制客户端加载状态
            if (win && data["haveLoadingSetter"]) {
                win.webContents.send("client-mitmV2-loading", !!data["LoadingFlag"])
            }

            // mitm 服务端给客户端发送提示信息
            if (win && data["haveNotification"]) {
                win.webContents.send("client-mitmV2-notification", data["NotificationContent"])
            }

            // 检查替代规则的问题，如果返回了有内容，说明没 BUG
            if (win && (data?.replacers || []).length > 0) {
                win.webContents.send("client-mitmV2-content-replacer-update", data)
            }

            // 如果是强制更新的话，一般通过这里触发
            if (win && data?.justContentReplacer) {
                win.webContents.send("client-mitmV2-content-replacer-update", data)
            }

            // 检查如果是 exec result 的话，对应字段应该是
            if (win && data["haveMessage"]) {
                win.webContents.send("client-mitmV2-message", data["message"])
                return
            }

            // 看看当前系统的 hooks 有哪些
            if (win && data["getCurrentHook"]) {
                win.webContents.send("client-mitmV2-hooks", data["Hooks"])
                return
            }

            // 自动更新 HTTP Flow 的表格
            if (win && data.refresh) {
                win.webContents.send("client-mitmV2-history-update", data)
                return
            }

            // 把劫持到的信息发送回前端
            if (win) {
                if (data.justFilter) {
                    win.webContents.send("client-mitmV2-filter", {...data})
                    return
                }
                if (data.id == "0" && data.responseId == "0") return
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
            stream.write({
                ...params
                // host,
                // port,
                // downstreamProxy,
                // enableHttp2,
                // ForceDisableKeepAlive,
                // certificates,
                // ...extra,
                // DisableCACertPage: extra.disableCACertPage,
                // DisableWebsocketCompression: !extra.DisableWebsocketCompression
            })
        }
    })
    ipcMain.handle("mitmV2-stop-call", () => {
        if (stream) {
            stream.cancel()
            stream = null
            mitmClient = null
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
