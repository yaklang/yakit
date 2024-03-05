/**
 * 该文件只存放公共工具方法,不存放通信接口等逻辑操作
 */

const path = require("path")
const fs = require("fs")

/**
 * @name 判断文件夹里的文件数量，并只保留时间最近的 ${length} 个文件
 * @description 注意，该方法只适合文件夹里全是文件的环境，存在子文件夹则不适用
 * @param {string} folderPath 目标文件夹
 * @param {number} length 保留文件数量
 */
const clearFolder = (folderPath, length) => {
    try {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.error(`readdir-${folderPath}-error`, err)
                return
            }

            // 获取文件夹中所有文件的详细信息
            const fileStats = files.map((file) => {
                const filePath = path.join(folderPath, file)
                return {
                    name: file,
                    path: filePath,
                    stats: fs.statSync(filePath)
                }
            })

            // 按最后修改时间进行排序
            const sortedFiles = fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())

            // 保留最近的十个文件，删除其他文件
            const filesToDelete = sortedFiles.slice(length)
            filesToDelete.forEach((file) => {
                fs.unlink(file.path, (err) => {
                    if (err) {
                        console.error("Error deleting file:", err)
                    }
                })
            })
        })
    } catch (error) {
        console.log("checkFolderAndDel-error", error)
    }
}

/** 生成 年-月-日-时-分-秒 */
const getNowTime = () => {
    let now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() + 1
    let today = now.getDate()
    let hour = now.getHours()
    let minute = now.getMinutes()
    let second = now.getSeconds()

    return `${year}-${month}-${today}-${hour}-${minute}-${second}`
}

module.exports = {clearFolder, getNowTime}
