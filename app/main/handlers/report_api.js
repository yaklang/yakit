const {ipcMain} = require("electron")
const {htmlTemplateDir} = require("../filePath")
const compressing = require("compressing")
const fs = require("fs")
const path = require("path")

module.exports = (win, getClient) => {
    // asyncQueryReports wrapper
    const asyncQueryReports = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReports(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReports", async (e, params) => {
        return await asyncQueryReports(params)
    })

    // asyncQueryReport wrapper
    const asyncQueryReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryReport", async (e, params) => {
        return await asyncQueryReport(params)
    })

    // asyncDeleteReport wrapper
    const asyncDeleteReport = (params) => {
        return new Promise((resolve, reject) => {
            getClient().DeleteReport(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("DeleteReport", async (e, params) => {
        return await asyncDeleteReport(params)
    })

    // asyncQueryAvailableReportFrom wrapper
    const asyncQueryAvailableReportFrom = (params) => {
        return new Promise((resolve, reject) => {
            getClient().QueryAvailableReportFrom(params, (err, data) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        })
    }
    ipcMain.handle("QueryAvailableReportFrom", async (e, params) => {
        return await asyncQueryAvailableReportFrom(params)
    })




    const asyncDownloadHtmlReport = (params) => {
        // 文件复制
        const copyFileByDir = (src1, src2) => {
            return new Promise((resolve, reject) => {
                fs.readFile(src1, (err, data) => {
                    if (err) return reject(err)
                    fs.writeFile(src2, data, (err) => {
                        if (err) return reject(err)
                        resolve('复制文件成功')
                    })
                })
            })
        }

        // 删除文件夹下所有文件
        const delDir = (path) => {
            let files = []
            if (fs.existsSync(path)) {
                files = fs.readdirSync(path)
                files.forEach((file, index) => {
                    let curPath = path + "/" + file
                    if (fs.statSync(curPath).isDirectory()) {
                        delDir(curPath) //递归删除文件夹
                    } else {
                        fs.unlinkSync(curPath) //删除文件
                    }
                })
                fs.rmdirSync(path)
            }
        }
        return new Promise(async (resolve, reject) => {
            const {outputDir, JsonRaw, reportName} = params
            const inputFile = path.join(htmlTemplateDir, "template.zip")
            const outputFile = path.join(outputDir, "template.zip")
            const reportNameFile = reportName.replaceAll(/\\|\/|\:|\*|\?|\"|\<|\>|\|/g, "") || "html报告"
            // 判断报告名是否存在
            const ReportItemName = path.join(outputDir, reportNameFile)
            const judgeReportName = fs.existsSync(ReportItemName)
            let isCreatDir = false
            try {
                // 复制模板到生成文件地址
                await copyFileByDir(inputFile, outputFile)
                // 文件夹已存在 则先清空之前内容
                if (judgeReportName) delDir(ReportItemName)
                if (!judgeReportName) {
                    fs.mkdirSync(ReportItemName)
                    isCreatDir = true
                }
                // 解压模板
                await compressing.zip.uncompress(outputFile, ReportItemName)
                // 删除zip
                fs.unlinkSync(outputFile)
                // 修改模板入口文件
                const initDir = path.join(ReportItemName, "js", "init.js")
                // 模板源注入
                fs.writeFileSync(initDir, `let initData = ${JSON.stringify(JsonRaw)}`)
                resolve({
                    ok: true,
                    outputDir: ReportItemName
                })
            } catch (error) {
                // 如若错误 删除已创建文件夹
                if (isCreatDir) delDir(ReportItemName)
                reject(error)
            }
        })
    }
    ipcMain.handle("download-html-report", async (e, params) => {
        return await asyncDownloadHtmlReport(params)
    })

}