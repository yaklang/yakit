const {app, ipcMain} = require("electron")
const FS = require("fs")
const path = require("path")
const {handleSaveFileSystem} = require("./fileSystemDialog")

module.exports = {
    register: (win, getClient) => {
        const asyncFetchFileInfoByPath = (path) => {
            return new Promise((resolve, reject) => {
                try {
                    const stats = FS.statSync(path)
                    resolve(stats)
                } catch (error) {
                    reject(error)
                }
            })
        }
        // 获取通过文件路径获取文件信息
        ipcMain.handle("fetch-file-info-by-path", async (e, path) => {
            return await asyncFetchFileInfoByPath(path)
        })

        const asyncExportRiskHtml = (params) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const {htmlContent, fileName, data} = params
                    const {filePath} = await handleSaveFileSystem({
                        title: fileName,
                        defaultPath: path.join(app.getPath("desktop"), fileName)
                    })

                    if (filePath) {
                        const folderPath = filePath

                        if (!FS.existsSync(folderPath)) {
                            FS.mkdirSync(folderPath)
                        }

                        const filePath1 = path.join(folderPath, `${fileName}.html`)
                        const filePath2 = path.join(folderPath, "data.js")
                        FS.writeFileSync(filePath1, htmlContent, "utf-8")
                        FS.writeFileSync(filePath2, `const initData = ${JSON.stringify(data)}`, "utf-8")
                        resolve(filePath)
                    } else {
                        resolve("")
                    }
                } catch (error) {
                    reject(error)
                }
            })
        }

        ipcMain.handle("export-risk-html", async (event, params) => {
            return await asyncExportRiskHtml(params)
        })

        // 获取通过文件路径获取文件名称/后缀
        ipcMain.handle("fetch-file-name-by-path", (e, data) => {
            const fileInfo = {
                name: "",
                suffix: ""
            }
            try {
                if (!data || typeof data !== "string") return fileInfo
                fileInfo.suffix = path.extname(data).toLowerCase()
                fileInfo.name = path.basename(data, fileInfo.suffix)
            } catch (error) {}
            return fileInfo
        })

        // 获取通过文件路径判断是否是文件夹
        ipcMain.handle("fetch-file-is-dir-by-path", (e, path) => {
            try {
                if (!path || typeof path !== "string") return false
                return FS.statSync(path).isDirectory()
            } catch (error) {
                return false
            }
        })

        /**
         * @name 判断路径A和路径B是否存在包含关系
         * @param {string} pathA 路径A
         * @param {string} pathB 路径B
         * @return {number} 0：相等；1：A包含B；2：B包含A；3：无包含关系；4：异常
         */
        ipcMain.handle("fetch-path-contains-relation", (e, params) => {
            try {
                const {pathA, pathB} = params

                const pa = path.resolve(pathA)
                const pb = path.resolve(pathB)

                if (pa === pb) return 0

                const relAtoB = path.relative(pa, pb)
                // A是否包含B
                if (relAtoB && !relAtoB.startsWith("..") && !path.isAbsolute(relAtoB)) {
                    return 1
                }

                const relBtoA = path.relative(pb, pa)
                // B是否包含A
                if (relBtoA && !relBtoA.startsWith("..") && !path.isAbsolute(relBtoA)) {
                    return 2
                }

                return 3
            } catch (error) {
                return 4
            }
        })
        /**
         * @name 获取目标路径中，基于基础路径的所有相关路径列表
         * @param {string} basePath 基础路径
         * @param {string[]} targetPath 目标路径列表
         * @return {string[]} 相关路径列表
         */
        ipcMain.handle("get-relevant-paths", (e, params) => {
            const {basePath, targetPath} = params
            if (!targetPath || targetPath.length === 0) {
                return []
            }
            const relevantPaths = []
            const normalizedBasePath = path.normalize(basePath)
            for (const fullPath of targetPath) {
                const normalizedFullPath = path.normalize(fullPath)
                if (!normalizedFullPath.startsWith(normalizedBasePath)) {
                    continue
                }
                const parts = normalizedFullPath.split(path.sep)
                let currentPath = parts[0]
                for (let i = 1; i < parts.length; i++) {
                    currentPath = path.join(currentPath, parts[i])
                    if (currentPath.startsWith(normalizedBasePath) && !relevantPaths.includes(currentPath)) {
                        relevantPaths.push(currentPath)
                    }
                }
            }
            return relevantPaths
        })
    },
    registerNewIPC: (win, getClient, ipcEventPre) => {}
}
