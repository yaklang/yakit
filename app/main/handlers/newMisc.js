const {ipcMain} = require("electron")
const {getLocalYaklangEngine, loadExtraFilePath, YakitProjectPath} = require("../filePath.js")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

module.exports = {
    registerNewIPC: (win, getClient, ipcEventPre) => {
        // asyncGetKey wrapper
        const asyncGetKey = (params) => {
            return new Promise((resolve, reject) => {
                getClient().GetKey(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data.Value)
                })
            })
        }
        ipcMain.handle(ipcEventPre + "GetKey", async (e, params) => {
            return await asyncGetKey(params)
        })

        // asyncSetKey wrapper
        const asyncSetKey = (params) => {
            return new Promise((resolve, reject) => {
                getClient().SetKey(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle(ipcEventPre + "SetKey", async (e, params) => {
            return await asyncSetKey(params)
        })

        ipcMain.handle(ipcEventPre + "CalcEngineSha265", async (e, params) => {
            const hashs = []

            if (process.platform === "darwin") {
                const yakKeyFile = path.join(YakitProjectPath, "engine-sha256.txt")
                if (fs.existsSync(yakKeyFile)) {
                    let hashData = fs.readFileSync(yakKeyFile).toString("utf8")
                    // 去除换行符
                    hashData = (hashData || "").replace(/\r?\n/g, "")
                    // 去除首尾空格
                    hashData = hashData.trim()
                    hashs.push(hashData)
                }
            }

            return new Promise((resolve, reject) => {
                let enginePath = getLocalYaklangEngine()
                if (enginePath == undefined) {
                    reject("get engine path failed")
                } else {
                    if (fs.existsSync(enginePath)) {
                        const sum = crypto.createHash("sha256")
                        sum.update(fs.readFileSync(enginePath))
                        let localHash = sum.digest("hex")
                        // 去除换行符
                        localHash = (localHash || "").replace(/\r?\n/g, "")
                        // 去除首尾空格
                        localHash = localHash.trim()
                        hashs.push(localHash)
                        resolve(hashs)
                    } else {
                        reject("get engine content failed")
                    }
                }
            })
        })
    }
}
