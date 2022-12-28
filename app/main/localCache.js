const {ipcMain} = require("electron")
const fs = require("fs")
const {localCachePath, extraLocalCachePath} = require("./filePath")

/** 缓存数据存放变量 */
const kvCache = new Map()
/** 写操作时的对比参照数据(决定是否进行写操作 ) */
let referKVCache = ""
/** 扩展缓存数据存放变量 */
const extraKVCache = new Map()
/** 写操作时的对比参照扩展数据(决定是否进行写操作 ) */
let referExtraKVCache = ""

/**
 * 将缓存数据写入本地文件系统内
 * @param {"cache"|"extraCache"} type 缓存数据类型
 * @param {string} value 缓存数据
 */
const setYakitCache = (type, value) => {
    const filePath = type === "cache" ? localCachePath : extraLocalCachePath

    try {
        fs.unlinkSync(filePath)
    } catch (e) {
        console.info(`unlinkSync${type === "extraCache" ? " extra" : ""} local cache failed: ${e}`, e)
    }

    if (type === "cache") referKVCache = value
    if (type === "extraCache") referExtraKVCache = value
    fs.writeFileSync(filePath, new Buffer(value, "utf8"))
}

/**
 * 写操作定时器
 * @param {"cache"|"extraCache"} type
 */
const writeTimer = (type) => {
    const cache = type === "cache" ? kvCache : extraKVCache
    const referCache = type === "cache" ? referKVCache : referExtraKVCache

    let value = []
    cache.forEach((v, k) => {
        value.push({key: k, value: v})
    })
    value = JSON.stringify(value)
    if (value !== referCache) setYakitCache(type, value)
}

/** 获取缓存数据 */
const getLocalCache = (callback) => {
    kvCache.clear()
    kvCache.set("*description*", "该文件内缓存数据如需手动修改，请在关闭 Yakit 之后进行操作")

    try {
        /** 处理文件不存在的情况 */
        if (fs.existsSync(localCachePath)) {
            const data = fs.readFileSync(localCachePath)

            /** 预防用户直接删除文件内的数据，从而导致的JSON处理异常 */
            const cache = data.toString() ? data.toString() : `[]`
            JSON.parse(cache).forEach((i) => {
                if (i["key"]) {
                    kvCache.set(i["key"], i["value"])
                }
            })
        }

        let pairs = []
        kvCache.forEach((v, k) => {
            pairs.push({key: k, value: v})
        })
        referKVCache = JSON.stringify(pairs)

        if (callback) callback()
    } catch (e) {
        console.info("读取本地缓存数据错误", e)
    } finally {
        setInterval(() => writeTimer("cache"), 5000)
    }
}
/** 获取扩展缓存数据 */
const getExtraLocalCache = (callback) => {
    extraKVCache.clear()
    kvCache.set("*description*", "该文件内缓存数据如需手动修改，请在关闭 Yakit 之后进行操作")

    try {
        if (fs.existsSync(extraLocalCachePath)) {
            const data = fs.readFileSync(extraLocalCachePath)

            /** 预防用户直接删除文件内的数据，从而导致的JSON处理异常 */
            const cache = data.toString() ? data.toString() : `[]`
            JSON.parse(cache).forEach((i) => {
                if (i["key"]) {
                    extraKVCache.set(i["key"], i["value"])
                }
            })
        }

        let pairs = []
        extraKVCache.forEach((v, k) => {
            pairs.push({key: k, value: v})
        })
        referExtraKVCache = JSON.stringify(pairs)

        if (callback) callback()
    } catch (e) {
        console.info("读取本地扩展缓存数据错误", e)
    } finally {
        setInterval(() => writeTimer("extraCache"), 5000)
    }
}

/**
 * 强制进行写操作
 * @param {"cache"|"extraCache"} type 缓存数据类型
 */
const manualWriteFile = (type) => {
    const cache = type === "cache" ? kvCache : extraKVCache

    let value = []
    cache.forEach((v, k) => {
        value.push({key: k, value: v})
    })
    value = JSON.stringify(value)

    setYakitCache(type, value)
}

module.exports = {
    kvCache,
    getLocalCache,
    extraKVCache,
    getExtraLocalCache,
    register: (win, getClient) => {
        /** 手动触发写操作 */
        ipcMain.handle("manual-write-file", async (e, type) => {
            manualWriteFile(type)
            return
        })
        /** 获取本地缓存数据 */
        ipcMain.handle("fetch-local-cache", async (e, key) => {
            return kvCache.get(key)
        })
        /** 设置本地缓存数据 */
        ipcMain.handle("set-local-cache", (e, key, value) => {
            kvCache.set(key, value)
            return
        })
        /** 获取本地拓展缓存数据 */
        ipcMain.handle("fetch-extra-cache", async (e, key) => {
            return extraKVCache.get(key)
        })
        /** 设置本地拓展缓存数据 */
        ipcMain.handle("set-extra-cache", (e, key, value) => {
            extraKVCache.set(key, value)
            return
        })
    }
}
