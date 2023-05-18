
const {ipcMain, dialog} = require("electron")
const FS = require("fs")
const PATH = require("path")


module.exports =(win) =>{
    // 弹出保存窗口
    const asyncSaveFileDialog = async (params) => {
        return new Promise((resolve, reject) => {
            dialog
                .showSaveDialog(win, {
                    title: "保存文件",
                    defaultPath: params
                })
                .then((res) => {
                    const params = res
                    params.name = PATH.basename(res.filePath)
                    resolve(params)
                })
        })
    }
    ipcMain.handle("show-save-dialog", async (e, params) => {
        return await asyncSaveFileDialog(params)
    })

    // 删除文件
    const asyncDeleteCodeFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.unlink(params, function (err) {
                if (err) reject(err)
                else resolve("success")
            })
        })
    }
    ipcMain.handle("delelte-code-file", async (e, params) => {
        return await asyncDeleteCodeFile(params)
    })

    //判断文件是否存在
    const asyncIsExistsFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.access(params, FS.constants.F_OK, function (err) {
                if (err) resolve(err)
                else reject("fail")
            })
        })
    }
    ipcMain.handle("is-exists-file", async (e, params) => {
        return await asyncIsExistsFile(params)
    })

    //文件重命名
    const asyncRenameFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.rename(params.old, params.new, function (err) {
                if (err) reject(err)
                else resolve("success")
            })
        })
    }
    ipcMain.handle("rename-file", async (e, params) => {
        if (!params.old || !params.new) return "fail"
        return await asyncRenameFile(params)
    })

    // 将内容写入文件,文件未存在则新建文件后再进行写入
    const asyncWriteFile = (params) => {
        return new Promise((resolve, reject) => {
            FS.writeFile(params.route, params.data, function (err) {
                if (err) reject(err)
                else resolve("success")
            })
        })
    }
    ipcMain.handle("write-file", async (e, params) => {
        if (!params.route || !params.data) return "fail"
        return await asyncWriteFile(params)
    })
}