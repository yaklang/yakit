/**
 * 该文件只存放公共工具方法,不存放通信接口等逻辑操作
 */

const fs = require("fs")
const crypto = require("crypto")

const Uint8ArrayToString = (fileData, encoding) => {
    try {
        return Buffer.from(fileData).toString(encoding ? encoding : "utf8")
    } catch (e) {
        return `${fileData}`
    }
}

const hashChunk = ({path, size, chunkSize, chunkIndex}) => {
    return new Promise((resolve, reject) => {
        let options = {}
        if (size && chunkSize && chunkIndex) {
            const start = chunkIndex * chunkSize
            const end = Math.min(start + chunkSize, size)
            options = {start, end}
        }
        // 创建当前分片的读取流
        const chunkStream = fs.createReadStream(path, options)
        // 计算Hash
        const hash = crypto.createHash("md5")
        chunkStream.on("data", (chunk) => {
            hash.update(chunk)
        })
        chunkStream.on("end", () => {
            // 单独一片的Hash
            const fileChunkHash = hash.digest("hex")
            resolve(fileChunkHash)
        })

        chunkStream.on("error", (err) => {
            reject(err)
        })
    })
}

module.exports = {Uint8ArrayToString, hashChunk}
