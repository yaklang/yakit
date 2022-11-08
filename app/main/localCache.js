const fs = require("fs")
const {localCachePath, extraLocalCachePath} = require("./filePath")

/** 缓存数据存放变量 */
const kvCache = new Map()
/** 扩展缓存数据存放变量 */
const extraKVCache = new Map()
/** 通过KEY值获取缓存数据 */
const getLocalCache = (callback) => {
    kvCache.clear()

    try {
        fs.readFile(localCachePath, (err, data) => {
            if (!!err) {
                callback(err)
                return
            }

            JSON.parse(data.toString()).forEach((i) => {
                if (i["key"]) {
                    kvCache.set(i["key"], i["value"])
                }
            })
            console.log("getcache", kvCache)

            if (callback) callback(null)
        })
    } catch (e) {
        console.info("读取本地缓存数据错误", e)
    }
}
/** 通过KEY值获取扩展缓存数据 */
const getExtraLocalCache = (callback) => {
    extraKVCache.clear()

    try {
        fs.readFile(extraLocalCachePath, (err, data) => {
            if (!!err) {
                callback(err)
                return
            }

            JSON.parse(data.toString()).forEach((i) => {
                if (i["key"]) {
                    extraKVCache.set(i["key"], i["value"])
                }
            })

            if (callback) callback(null)
        })
    } catch (e) {
        console.info("读取本地扩展缓存数据错误", e)
    }
}
/** 通过KEY值设置缓存数据 */
const setLocalCache = (k, v) => {
    kvCache.set(`${k}`, v)

    try {
        fs.unlinkSync(localCachePath)
    } catch (e) {}

    const pairs = []
    kvCache.forEach((v, k) => {
        pairs.push({key: k, value: v})
    })
    pairs.sort((a, b) => a.key.localeCompare(b.key))
    console.log("setcache", kvCache)
    fs.writeFileSync(localCachePath, new Buffer(JSON.stringify(pairs), "utf8"))
}
/** 通过KEY值设置扩展缓存数据 */
const setExtraLocalCache = (k, v) => {
    extraKVCache.set(`${k}`, v)

    try {
        fs.unlinkSync(extraLocalCachePath)
    } catch (e) {}

    const pairs = []
    extraKVCache.forEach((v, k) => {
        pairs.push({key: k, value: v})
    })
    pairs.sort((a, b) => a.key.localeCompare(b.key))
    fs.writeFileSync(extraLocalCachePath, new Buffer(JSON.stringify(pairs), "utf8"))
}

module.exports = {
    kvCache,
    getLocalCache,
    setLocalCache,
    extraKVCache,
    getExtraLocalCache,
    setExtraLocalCache
}
