const {ipcMain} = require("electron");
const handlerHelper = require("./handleStreamWithContext");


module.exports = (win, getClient) => {
    // asyncStringFuzzer wrapper
    const asyncStringFuzzer = (params) => {
        return new Promise((resolve, reject) => {
            getClient().StringFuzzer(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("StringFuzzer", async (e, params) => {
        return await asyncStringFuzzer(params)
    })

    ipcMain.handle("string-fuzzer", (e, params) => {
        getClient().StringFuzzer({Template: params.template}, (err, data) => {
            if (win) {
                win.webContents.send(params.token, {
                    error: err,
                    data: err ? undefined : {
                        Results: (data || {Results: []}).Results.map(i => {
                            return i.toString()
                        })
                    },
                })
            }
        })
    })

    const handlerHelper = require("./handleStreamWithContext");
    const streamHTTPFuzzerMap = new Map();
    ipcMain.handle("cancel-HTTPFuzzer", handlerHelper.cancelHandler(streamHTTPFuzzerMap));
    ipcMain.handle("HTTPFuzzer", (e, params, token) => {
        let stream = getClient().HTTPFuzzer(params);
        stream.on("data", data => {
            if (win && data) win.webContents.send(`fuzzer-data-${token}`, data)
        });
        stream.on("error", err => {
            if (win && err) win.webContents.send(`fuzzer-error-${token}`, err.details)
        })
        stream.on("end", data => {
            if (win && data) win.webContents.send(`fuzzer-end-${token}`)
        })
        handlerHelper.registerHandler(win, stream, streamHTTPFuzzerMap, token)
    })

    // asyncExtractUrl wrapper
    const asyncExtractUrl = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExtractUrl(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExtractUrl", async (e, params) => {
        return await asyncExtractUrl(params)
    })


    // asyncConvertFuzzerResponseToHTTPFlow wrapper
    const asyncConvertFuzzerResponseToHTTPFlow = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ConvertFuzzerResponseToHTTPFlow(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ConvertFuzzerResponseToHTTPFlow", async (e, params) => {
        return await asyncConvertFuzzerResponseToHTTPFlow(params)
    })
    // ipcMain.handle("analyze-fuzzer-response", (e, rsp, flag) => {
    //     getClient().ConvertFuzzerResponseToHTTPFlow(rsp, (err, req) => {
    //         if (err && win) {
    //             win.webContents.send(`ERROR:${flag}`, err?.details || "unknown")
    //         }
    //
    //         if (req && win) {
    //             win.webContents.send(flag, req)
    //         }
    //     })
    // })

    // asyncHTTPRequestMutate wrapper
    const asyncHTTPRequestMutate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPRequestMutate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPRequestMutate", async (e, params) => {
        return await asyncHTTPRequestMutate(params)
    })

    // asyncRedirectRequest wrapper
    const asyncRedirectRequest = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RedirectRequest(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RedirectRequest", async (e, params) => {
        return await asyncRedirectRequest(params)
    })

    // asyncQueryHistoryHTTPFuzzerTask wrapper
    const asyncQueryHistoryHTTPFuzzerTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHistoryHTTPFuzzerTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHistoryHTTPFuzzerTask", async (e, params) => {
        return await asyncQueryHistoryHTTPFuzzerTask(params)
    })

    // asyncQueryHistoryHTTPFuzzerTaskEx wrapper
    const asyncQueryHistoryHTTPFuzzerTaskEx = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHistoryHTTPFuzzerTaskEx(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHistoryHTTPFuzzerTaskEx", async (e, params) => {
        return await asyncQueryHistoryHTTPFuzzerTaskEx(params)
    })

    // asyncGetHistoryHTTPFuzzerTask wrapper
    const asyncGetHistoryHTTPFuzzerTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetHistoryHTTPFuzzerTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetHistoryHTTPFuzzerTask", async (e, params) => {
        return await asyncGetHistoryHTTPFuzzerTask(params)
    })

    // asyncGenerateYakCodeByPacket wrapper
    const asyncGenerateYakCodeByPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateYakCodeByPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateYakCodeByPacket", async (e, params) => {
        return await asyncGenerateYakCodeByPacket(params)
    })

    // asyncGenerateCSRFPocByPacket wrapper
    const asyncGenerateCSRFPocByPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateCSRFPocByPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateCSRFPocByPacket", async (e, params) => {
        return await asyncGenerateCSRFPocByPacket(params)
    })

    // asyncFixUploadPacket wrapper
    const asyncFixUploadPacket = (params) => {
        return new Promise((resolve, reject) => {
            getClient().FixUploadPacket(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("FixUploadPacket", async (e, params) => {
        return await asyncFixUploadPacket(params)
    })

    // asyncIsMultipartFormDataRequest wrapper
    const asyncIsMultipartFormDataRequest = (params) => {
        return new Promise((resolve, reject) => {
            getClient().IsMultipartFormDataRequest(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("IsMultipartFormDataRequest", async (e, params) => {
        return await asyncIsMultipartFormDataRequest(params)
    })

    /*
    * WebsocketFuzzer 套件
    * */
    const streamCreateWebsocketFuzzerMap = new Map();
    ipcMain.handle("cancel-CreateWebsocketFuzzer", handlerHelper.cancelHandler(streamCreateWebsocketFuzzerMap));
    ipcMain.handle("CreateWebsocketFuzzer", async (e, params, token) => {
        if (!token) {
            throw Error(`no token set`)
        }

        let exitedStream = streamCreateWebsocketFuzzerMap.get(token)
        if (!exitedStream) {
            let stream = getClient().CreateWebsocketFuzzer();
            stream.write(params)
            handlerHelper.registerHandler(win, stream, streamCreateWebsocketFuzzerMap, token)
        } else {
            exitedStream.write(params)
        }
    })

    // asyncQueryWebsocketFlowByHTTPFlowWebsocketHash wrapper
    const asyncQueryWebsocketFlowByHTTPFlowWebsocketHash = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryWebsocketFlowByHTTPFlowWebsocketHash(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryWebsocketFlowByHTTPFlowWebsocketHash", async (e, params) => {
        return await asyncQueryWebsocketFlowByHTTPFlowWebsocketHash(params)
    })

    // asyncDeleteWebsocketFlowByHTTPFlowWebsocketHash wrapper
    const asyncDeleteWebsocketFlowByHTTPFlowWebsocketHash = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteWebsocketFlowByHTTPFlowWebsocketHash(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteWebsocketFlowByHTTPFlowWebsocketHash", async (e, params) => {
        return await asyncDeleteWebsocketFlowByHTTPFlowWebsocketHash(params)
    })

    // asyncDeleteWebsocketFlowAll wrapper
    const asyncDeleteWebsocketFlowAll = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteWebsocketFlowAll(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteWebsocketFlowAll", async (e, params) => {
        return await asyncDeleteWebsocketFlowAll(params)
    })

    // asyncGenerateExtractRule wrapper
    const asyncGenerateExtractRule = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateExtractRule(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateExtractRule", async (e, params) => {
        return await asyncGenerateExtractRule(params)
    })

    const streamExtractDataMap = new Map();
    ipcMain.handle("cancel-ExtractData", handlerHelper.cancelHandler(streamExtractDataMap));
    ipcMain.handle("ExtractData", (e, params, token) => {
        let existedStream = streamExtractDataMap.get(token)
        if (existedStream) {
            existedStream.write(params)
            return
        }
        let stream = getClient().ExtractData();
        handlerHelper.registerHandler(win, stream, streamExtractDataMap, token)
        stream.write(params)
    })

    // 提取数据发送表中展示
    ipcMain.handle("send-extracted-to-table", async (e, params) => {
        win.webContents.send("fetch-extracted-to-table", params)
    })

    // asyncMatchHTTPResponse wrapper
    const asyncMatchHTTPResponse = (params) => {
        return new Promise((resolve, reject) => {
            getClient().MatchHTTPResponse(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("MatchHTTPResponse", async (e, params) => {
        return await asyncMatchHTTPResponse(params)
    })

    // asyncExtractHTTPResponse wrapper
    const asyncExtractHTTPResponse = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExtractHTTPResponse(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExtractHTTPResponse", async (e, params) => {
        return await asyncExtractHTTPResponse(params)
    })

    // asyncRenderVariables wrapper
    const asyncRenderVariables = (params) => {
        return new Promise((resolve, reject) => {
            getClient().RenderVariables(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("RenderVariables", async (e, params) => {
        return await asyncRenderVariables(params)
    })

    // asyncHTTPRequestBuilder wrapper
    const asyncHTTPRequestBuilder = (params) => {
        return new Promise((resolve, reject) => {
            getClient().HTTPRequestBuilder(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("HTTPRequestBuilder", async (e, params) => {
        return await asyncHTTPRequestBuilder(params)
    })
}