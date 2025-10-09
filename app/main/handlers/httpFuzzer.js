const { ipcMain } = require("electron");
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

    const asyncSaveFuzzerLabel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveFuzzerLabel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 保存到常用Fuzzer标签
    ipcMain.handle("SaveFuzzerLabel", async (e, params) => {
        return await asyncSaveFuzzerLabel(params)
    })

    const asyncQueryFuzzerLabel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryFuzzerLabel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 查询所有Fuzzer标签
    ipcMain.handle("QueryFuzzerLabel", async (e, params) => {
        return await asyncQueryFuzzerLabel(params)
    })

    const asyncDeleteFuzzerLabel = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteFuzzerLabel(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    // 删除Fuzzer标签
    ipcMain.handle("DeleteFuzzerLabel", async (e, params) => {
        return await asyncDeleteFuzzerLabel(params)
    })

    ipcMain.handle("string-fuzzer", (e, params) => {
        getClient().StringFuzzer({ Template: params.template }, (err, data) => {
            if (win) {
                win.webContents.send(params.token, {
                    error: err,
                    data: err ? undefined : {
                        Results: (data || { Results: [] }).Results.map(i => {
                            return i.toString()
                        })
                    },
                })
            }
        })
    })


    const asyncGetAllFuzztagInfo = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetAllFuzztagInfo(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetAllFuzztagInfo", async (e, params) => {
        return await asyncGetAllFuzztagInfo(params)
    })

    const asyncGenerateFuzztag = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GenerateFuzztag(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GenerateFuzztag", async (e, params) => {
        return await asyncGenerateFuzztag(params)
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

    const streamHTTPFuzzerSequenceMap = new Map();
    ipcMain.handle("cancel-HTTPFuzzerSequence", handlerHelper.cancelHandler(streamHTTPFuzzerSequenceMap));
    ipcMain.handle("HTTPFuzzerSequence", (e, params, token) => {
        let stream = getClient().HTTPFuzzerSequence(params);
        stream.on("data", data => {
            if (win && data) win.webContents.send(`fuzzer-sequence-data-${token}`, data)
        });
        stream.on("error", err => {
            if (win && err) win.webContents.send(`fuzzer-sequence-error-${token}`, err.details)
        })
        stream.on("end", data => {
            if (win && data) win.webContents.send(`fuzzer-sequence-end-${token}`)
        })
        handlerHelper.registerHandler(win, stream, streamHTTPFuzzerSequenceMap, token)
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

    const streamDebugPluginMap = new Map();
    ipcMain.handle("cancel-DebugPlugin", handlerHelper.cancelHandler(streamDebugPluginMap));
    ipcMain.handle("DebugPlugin", (e, params, token) => {
        let stream = getClient().DebugPlugin(params);
        handlerHelper.registerHandler(win, stream, streamDebugPluginMap, token)
    })

    // 导出
    const asyncExportHTTPFuzzerTaskToYaml = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ExportHTTPFuzzerTaskToYaml(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ExportHTTPFuzzerTaskToYaml", async (e, params) => {
        return await asyncExportHTTPFuzzerTaskToYaml(params)
    })

    // 导入
    const asyncImportHTTPFuzzerTaskFromYaml = (params) => {
        return new Promise((resolve, reject) => {
            getClient().ImportHTTPFuzzerTaskFromYaml(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("ImportHTTPFuzzerTaskFromYaml", async (e, params) => {
        return await asyncImportHTTPFuzzerTaskFromYaml(params)
    })

    /** 保存 webfuzzer 页面配置 */
    const asyncSaveFuzzerConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveFuzzerConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveFuzzerConfig", async (e, params) => {
        return await asyncSaveFuzzerConfig(params)
    })

    /**查询 webfuzzer 页面配置 */
    const asyncQueryFuzzerConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryFuzzerConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryFuzzerConfig", async (e, params) => {
        return await asyncQueryFuzzerConfig(params)
    })

    /**删除 webfuzzer 页面配置 */
    const asyncDeleteFuzzerConfig = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteFuzzerConfig(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteFuzzerConfig", async (e, params) => {
        return await asyncDeleteFuzzerConfig(params)
    })

    const asyncQueryHotPatchTemplateList = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHotPatchTemplateList(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHotPatchTemplateList", async (e, params) => {
        return await asyncQueryHotPatchTemplateList(params)
    })

    const asyncQueryHotPatchTemplate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryHotPatchTemplate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryHotPatchTemplate", async (e, params) => {
        return await asyncQueryHotPatchTemplate(params)
    })

    const asyncCreateHotPatchTemplate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().CreateHotPatchTemplate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("CreateHotPatchTemplate", async (e, params) => {
        return await asyncCreateHotPatchTemplate(params)
    })

    const asyncDeleteHotPatchTemplate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteHotPatchTemplate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteHotPatchTemplate", async (e, params) => {
        return await asyncDeleteHotPatchTemplate(params)
    })

    const asyncUpdateHotPatchTemplate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UpdateHotPatchTemplate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UpdateHotPatchTemplate", async (e, params) => {
        return await asyncUpdateHotPatchTemplate(params)
    })

    const asyncUploadHotPatchTemplateToOnline = (params) => {
        return new Promise((resolve, reject) => {
            getClient().UploadHotPatchTemplateToOnline(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("UploadHotPatchTemplateToOnline", async (e, params) => {
        return await asyncUploadHotPatchTemplateToOnline(params)
    })

    const asyncDownloadHotPatchTemplate = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DownloadHotPatchTemplate(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DownloadHotPatchTemplate", async (e, params) => {
        return await asyncDownloadHotPatchTemplate(params)
    })
}