const { ipcMain } = require("electron");
const FS = require("fs")
const xlsx = require("node-xlsx")
const handlerHelper = require("./handleStreamWithContext");
module.exports = (win, getClient) => {
    const handlerHelper = require("./handleStreamWithContext");

    const streamPortScanMap = new Map();
    ipcMain.handle("cancel-PortScan", handlerHelper.cancelHandler(streamPortScanMap));
    ipcMain.handle("PortScan", (e, params, token) => {
        let stream = getClient().PortScan(params);
        handlerHelper.registerHandler(win, stream, streamPortScanMap, token)
    })

    const asyncFetchFileContent = (params) => {
        return new Promise((resolve, reject) => {
            const type = params.split(".").pop()
            const typeArr = ['csv', 'xls', 'xlsx']
            // 读取Excel
            if (typeArr.includes(type)) {
                // 读取xlsx
                try {
                    const obj = xlsx.parse(params)
                    resolve(obj)
                } catch (error) {
                    reject(err)
                }
            }
            // 读取txt
            else {
                FS.readFile(params, 'utf-8', function (err, data) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(data)
                    }
                });
            }

        })
    }

    // 获取证书(ps:asyncFetchFileContent此方法读取有误)
    const asyncFetchCertificate = (params) => {
        return new Promise((resolve, reject) => {
            // 读取 .pfx 文件
            FS.readFile(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data)
                }

                // 处理 .pfx 文件的内容，例如解析证书
                // 这里可能需要使用 `crypto` 模块进行进一步的处理
                // 例如：crypto.createCredentials
            });
        })
    }


    const streamSimpleDetectMap = new Map();

    ipcMain.handle("cancel-SimpleDetect", handlerHelper.cancelHandler(streamSimpleDetectMap));

    ipcMain.handle("SimpleDetect", (e, params, token) => {
        let stream = getClient().SimpleDetect(params);
        handlerHelper.registerHandler(win, stream, streamSimpleDetectMap, token)
    })

    const streamSimpleDetectCreatReportMap = new Map();

    ipcMain.handle("cancel-SimpleDetectCreatReport", handlerHelper.cancelHandler(streamSimpleDetectCreatReportMap));

    ipcMain.handle("SimpleDetectCreatReport", (e, params, token) => {
        let stream = getClient().SimpleDetectCreatReport(params);
        handlerHelper.registerHandler(win, stream, streamSimpleDetectCreatReportMap, token)
    })

    const asyncSaveCancelSimpleDetect = (params) => {
        return new Promise((resolve, reject) => {
            getClient().SaveCancelSimpleDetect(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("SaveCancelSimpleDetect", async (e, params) => {
        return await asyncSaveCancelSimpleDetect(params)
    })

    const asyncGetSimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncGetSimpleDetectUnfinishedTask(params)
    })

    const asyncGetSimpleDetectUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectUnfinishedTaskByUid", async (e, params) => {
        return await asyncGetSimpleDetectUnfinishedTaskByUid(params)
    })

    const asyncPopSimpleDetectUnfinishedTaskByUid = (params) => {
        return new Promise((resolve, reject) => {
            getClient().PopSimpleDetectUnfinishedTaskByUid(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("PopSimpleDetectUnfinishedTaskByUid", async (e, params) => {
        return await asyncPopSimpleDetectUnfinishedTaskByUid(params)
    })

    const streamRecoverSimpleDetectUnfinishedTaskMap = new Map()
    ipcMain.handle(
        "cancel-RecoverSimpleDetectUnfinishedTask",
        handlerHelper.cancelHandler(streamRecoverSimpleDetectUnfinishedTaskMap)
    )
    ipcMain.handle("RecoverSimpleDetectUnfinishedTask", (e, params, token) => {
        let stream = getClient().RecoverSimpleDetectUnfinishedTask(params)
        handlerHelper.registerHandler(win, stream, streamRecoverSimpleDetectUnfinishedTaskMap, token)
    })

    // 获取URL的IP地址
    ipcMain.handle("fetch-file-content", async (e, params) => {
        return await asyncFetchFileContent(params)
    })

    // 获取证书内容
    ipcMain.handle("fetch-certificate-content", async (e, params) => {
        return await asyncFetchCertificate(params)
    })

    const asyncQuerySimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QuerySimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QuerySimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncQuerySimpleDetectUnfinishedTask(params)
    })

    const asyncGetSimpleDetectRecordRequestById = (params) => {
        return new Promise((resolve, reject) => {
            getClient().GetSimpleDetectRecordRequestById(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("GetSimpleDetectRecordRequestById", async (e, params) => {
        return await asyncGetSimpleDetectRecordRequestById(params)
    })

    const asyncDeleteSimpleDetectUnfinishedTask = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteSimpleDetectUnfinishedTask(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteSimpleDetectUnfinishedTask", async (e, params) => {
        return await asyncDeleteSimpleDetectUnfinishedTask(params)
    })

    const streamRecoverSimpleDetectTaskMap = new Map()
    ipcMain.handle(
        "cancel-RecoverSimpleDetectTask",
        handlerHelper.cancelHandler(streamRecoverSimpleDetectTaskMap)
    )
    ipcMain.handle("RecoverSimpleDetectTask", (e, params, token) => {
        let stream = getClient().RecoverSimpleDetectTask(params)
        handlerHelper.registerHandler(win, stream, streamRecoverSimpleDetectTaskMap, token)
    })

}