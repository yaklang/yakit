const {ipcMain} = require("electron");
const DNS = require("dns");


// module.exports = (win, originGetClient) => {
module.exports = (win, getClient) => {
    // let mitmClient = undefined;
    // function getClient() {
    //     if (!mitmClient) {
    //         mitmClient = originGetClient(true)
    //         return mitmClient
    //     }
    //     return mitmClient
    // }

    let stream;
    let currentPort;
    let currentHost;
    let currentDownstreamProxy;
    // 用于恢复正在劫持的 MITM 状态
    ipcMain.handle("mitm-have-current-stream", e => {
        return {
            haveStream: !!stream,
            host: currentHost,
            port: currentPort,
            downstreamProxy: currentDownstreamProxy,
        };
    })

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitm-recover", e => {
        if (stream) {
            stream.write({
                recover: true,
            })
        }
    });

    // 发送恢复会话信息，让服务器把上下文发回来
    ipcMain.handle("mitm-reset-filter", e => {
        if (stream) {
            stream.write({
                setResetFilter: true,
            })
        }
    });

    //
    ipcMain.handle("mitm-auto-forward", (e, value) => {
        if (stream) {
            stream.write({setAutoForward: true, autoForwardValue: value})
        }
    })

    // 丢掉该消息
    ipcMain.handle("mitm-drop-request", (e, id) => {
        if (stream) {
            stream.write({
                id,
                drop: true,
            })
        }
    })

    // 丢掉该响应
    ipcMain.handle("mitm-drop-response", (e, id) => {
        if (stream) {
            stream.write({
                responseId: id,
                drop: true,
            })
        }
    })

    // 原封不动转发
    ipcMain.handle("mitm-forward-response", (e, id) => {
        if (stream) {
            stream.write({
                responseId: id,
                forward: true,
            })
        }
    })

    // 原封不动转发请求
    ipcMain.handle("mitm-forward-request", (e, id) => {
        if (stream) {
            stream.write({
                id: id,
                forward: true,
            })
        }
    })

    // 发送劫持请当前请求的消息，可以劫持当前响应的请求
    ipcMain.handle("mitm-hijacked-current-response", (e, id) => {
        if (stream) {
            stream.write({
                id: id,
                hijackResponse: true
            })
        }
    })

    ipcMain.handle("mitm-enable-plugin-mode", (e, initPluginNames) => {
        if (stream) {
            stream.write({
                setPluginMode: true,
                initPluginNames,
            })
        }
    })

    // 用来关闭 MITM 劫持的信息流
    ipcMain.handle("mitm-close-stream", e => {
        if (stream) {
            stream.cancel()
            stream = null;
        }
    })

    // MITM 转发
    ipcMain.handle("mitm-forward-modified-request", (e, request, id) => {
        if (stream) {
            stream.write({
                id,
                request: Buffer.from(request),
            })
        }
    })
    // MITM 转发 - HTTP 响应
    ipcMain.handle("mitm-forward-modified-response", (e, response, id) => {
        if (stream) {
            stream.write({
                responseId: id,
                response: response,
            })
        }
    })

    // MITM 启用插件
    ipcMain.handle("mitm-exec-script-content", (e, content) => {
        if (stream) {
            stream.write({
                setYakScript: true,
                yakScriptContent: content,
            })
        }
    })

    // MITM 启用插件，通过插件 ID
    ipcMain.handle("mitm-exec-script-by-id", (e, id, params) => {
        if (stream) {
            stream.write({
                setYakScript: true,
                yakScriptID: `${id}`,
                yakScriptParams: params,
            })
        }
    })

    // MITM 获取当前已经启用的插件
    ipcMain.handle("mitm-get-current-hook", (e, id, params) => {
        if (stream) {
            stream.write({
                getCurrentHook: true,
            })
        }
    })

    // MITM 移除插件
    ipcMain.handle("mitm-remove-hook", (e, params) => {
        if (stream) {
            stream.write({
                removeHook: true,
                removeHookParams: params,
            })
        }
    })

    // 设置过滤器
    ipcMain.handle("mitm-filter", (e, filter) => {
        if (stream) {
            stream.write(filter)
        }
    })

    // 设置正则替换
    ipcMain.handle("mitm-content-replacers", (e, filter) => {
        if (stream) {
            stream.write({...filter, setContentReplacers: true})
        }
    })

    // 清除 mitm 插件缓存
    ipcMain.handle("mitm-clear-plugin-cache", () => {
        if (stream) {
            stream.write({
                setClearMITMPluginContext: true,
            })
        }
    })

    // 开始调用 MITM，设置 stream
    let isFirstData = true
    ipcMain.handle("mitm-start-call", (e, host, port, downstreamProxy) => {
        if (stream) {
            if (win) {
                win.webContents.send("client-mitm-start-success")
            }
            return
        }

        isFirstData = true;
        stream = getClient().MITM();

        // 设置服务器发回的消息的回调函数
        stream.on("data", data => {
            console.info(data)
            // 处理第一个消息
            // 第一个消息应该更新状态，第一个消息应该是同步 Filter 的信息。。。
            if (win && isFirstData) {
                isFirstData = false;
                win.webContents.send("client-mitm-start-success")
            }

            // 检查替代规则的问题，如果返回了有内容，说明没 BUG
            if (win && (data?.replacers || []).length > 0) {
                win.webContents.send("client-mitm-content-replacer-update", data)
            }

            // 如果是强制更新的话，一般通过这里触发
            if (win && data?.justContentReplacer) {
                win.webContents.send("client-mitm-content-replacer-update", data)
            }

            // 检查如果是 exec result 的话，对应字段应该是
            if (win && data["haveMessage"]) {
                win.webContents.send("client-mitm-message", data["message"]);
                return
            }

            // 看看当前系统的 hooks 有哪些
            if (win && data["getCurrentHook"]) {
                win.webContents.send("client-mitm-hooks", data["hooks"])
                return
            }

            // 自动更新 HTTP Flow 的表格
            if (win && data.refresh) {
                win.webContents.send("client-mitm-history-update", data)
                return
            }

            // 把劫持到的信息发送回前端
            if (win) {
                if (data.justFilter) {
                    win.webContents.send("client-mitm-filter", {...data})
                    return
                }
                win.webContents.send("client-mitm-hijacked", {...data})
            }
        })
        stream.on("error", (err) => {
            stream = null
            if (err.code && win) {
                switch (err.code) {
                    case 1:
                        win.webContents.send("client-mitm-error", "")
                        return;
                    default:
                        win.webContents.send("client-mitm-error", err.details || `${err}`)
                        return;
                }
            }
        })
        currentHost = host
        currentPort = port
        currentDownstreamProxy = downstreamProxy
        if (stream) {
            stream.write({
                host, port, downstreamProxy,
            })
        }
    })
    ipcMain.handle("mitm-stop-call", () => {
        if (stream) {
            stream.cancel()
            stream = null;
            mitmClient = null;
        }
    })

    const asyncFetchHostIp = (params) => {
        return new Promise((resolve, reject) => {
            DNS.lookup(params, function (err, address) {
                if (err) {
                    reject(err)
                    return
                }
                resolve(address)
            });
        })
    }

    // 获取URL的IP地址
    ipcMain.handle("fetch-url-ip", async (e, params) => {
        return await asyncFetchHostIp(params)
    })

    // asyncDownloadMITMCert wrapper
    const asyncDownloadMITMCert = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadMITMCert(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DownloadMITMCert", async (e, params) => {
        return await asyncDownloadMITMCert(params)
    })

    // asyncExportMITMReplacerRules wrapper
    const asyncExportMITMReplacerRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportMITMReplacerRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportMITMReplacerRules", async (e, params) => {
        return await asyncExportMITMReplacerRules(params)
    })

    // asyncImportMITMReplacerRules wrapper
    const asyncImportMITMReplacerRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportMITMReplacerRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ImportMITMReplacerRules", async (e, params) => {
        return await asyncImportMITMReplacerRules(params)
    })

    // asyncGetCurrentRules wrapper
    const asyncGetCurrentRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetCurrentRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetCurrentRules", async (e, params) => {
        return await asyncGetCurrentRules(params)
    })

    // asyncSetCurrentRules wrapper
    const asyncSetCurrentRules = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SetCurrentRules(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SetCurrentRules", async (e, params) => {
        return await asyncSetCurrentRules(params)
    })
}