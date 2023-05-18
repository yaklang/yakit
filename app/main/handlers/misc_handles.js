const {ipcMain, dialog, app, clipboard} = require("electron")
const xlsx = require("node-xlsx");
const FS = require("fs");
const fs = require("fs");
const path = require("path");
const {htmlTemplateDir} = require("../filePath");
const compressing = require("compressing");

module.exports = (win) => {

    ipcMain.handle("openDialog", async (e, params) => {
        return await new Promise((resolve, reject) => {
            dialog.showOpenDialog({
                ...params
            }).then((res)=>{
                if(res){
                    let result = {...res}
                    resolve(result)
                }
                else{
                    reject("获取文件失败")
                }
            })
        })

    })

    // 提取数据发送表中展示
    ipcMain.handle("send-extracted-to-table", async (e, params) => {
        win.webContents.send("fetch-extracted-to-table", params)
    })


    // 端口导出成 excle
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


    // 获取URL的IP地址
    ipcMain.handle("fetch-file-content", async (e, params) => {
        return await asyncFetchFileContent(params)
    })

    // 参数携带
    ipcMain.on("yakit-store-params", (event, arg) => {
        win.webContents.send("get-yakit-store-params", arg)
    })

    // 前端实现的报告下载
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

    ipcMain.handle("yakit-version", ()=>{
        return app.getVersion()
    })

    ipcMain.handle("copy-clipboard", (e, text) => {
        clipboard.writeText(text);
    });
}