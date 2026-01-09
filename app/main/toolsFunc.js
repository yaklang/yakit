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

const pickAxiosErrorCore = (error) => {
    try {
        if (!error) return {}

        let config = error?.config || {}

        function safePick(obj, keys) {
            let ret = {}
            if (!obj) return ret
            keys.forEach(function (k) {
                if (obj[k] !== undefined) {
                    ret[k] = obj[k]
                }
            })
            return ret
        }

        return {
            error: safePick(error, ["name", "message", "code"]),
            request: {
                method: config.method,
                url: config.url,
                baseURL: config.baseURL,
                timeout: config.timeout,
                params: config.params,
            },
        }
    } catch (e) {
        return error?.config || e
    }
}


module.exports = {Uint8ArrayToString, hashChunk, pickAxiosErrorCore}
