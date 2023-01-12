const {ipcMain} = require("electron")
const fs = require("fs")
const {localCachePath, extraLocalCachePath} = require("./filePath")

/** 缓存数据存放变量 */
const kvCache = new Map()
/** 扩展缓存数据存放变量 */
const extraKVCache = new Map()

/**
 * 将缓存数据写入本地文件系统内
 * @param {"cache"|"extraCache"} type 缓存数据类型
 * @param {string} value 缓存数据
 */
const syncLocalCacheFile = (type, value) => {
    const filePath = type === "cache" ? localCachePath : extraLocalCachePath

    try {
        fs.unlinkSync(filePath)
    } catch (e) {
        console.info(`unlinkSync${type === "extraCache" ? " extra" : ""} local cache failed: ${e}`, e)
    }
    fs.writeFileSync(filePath, new Buffer(value, "utf8"))
}

const localCacheState = {
    cacheChanged: false,
    extraCacheChanged: false,
    cacheInitialized: false,
    extraCacheInitialized: false,
    writingFile: false
}
function getLocalCacheValue(key) {
    return kvCache.get(key)
}
function getExtraLocalCacheValue(key) {
    return extraKVCache.get(key)
}
function setLocalCache(key, value) {
    if (value === kvCache.get(key)) {
        return
    }
    kvCache.set(key, value)
    localCacheState.cacheChanged = true
}
function setExtraLocalCache(key, value) {
    if (value === extraKVCache.get(key)) {
        return
    }
    extraKVCache.set(key, value)
    localCacheState.extraCacheChanged = true
}
/**
 * 写操作定时器
 * @param {"cache"|"extraCache"} type
 */
const writeTimer = (type) => {
    if (type === "cache") {
        if (!localCacheState.cacheChanged) {
            return
        } else {
            localCacheState.cacheChanged = false
        }
    } else if (type === "extraCache") {
        if (!localCacheState.extraCacheChanged) {
            return
        } else {
            localCacheState.extraCacheChanged = false
        }
    }
    syncCacheToFile(type)
}

/** 获取缓存数据 */
const initLocalCache = (callback) => {
    if (localCacheState.cacheInitialized) {
        return
    }
    localCacheState.cacheInitialized = true

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
        if (callback) callback()
    } catch (e) {
        console.info("读取本地缓存数据错误", e)
    } finally {
        setInterval(() => writeTimer("cache"), 3000)
    }
}
/** 获取扩展缓存数据 */
const initExtraLocalCache = (callback) => {
    if (localCacheState.extraCacheInitialized) {
        return
    }
    localCacheState.extraCacheInitialized = true

    extraKVCache.clear()
    kvCache.set("*description*", "该文件内缓存数据如需手动修改，请在关闭 Yakit 之后进行操作")

    try {
        if (fs.existsSync(extraLocalCachePath)) {
            const data = fs.readFileSync(extraLocalCachePath)
            if (!data) {
                console.info("Extra Local Cache Empty!")
            }

            /** 预防用户直接删除文件内的数据，从而导致的JSON处理异常 */
            const cache = data.toString() ? data.toString() : `[]`
            JSON.parse(cache).forEach((i) => {
                if (i["key"]) {
                    extraKVCache.set(i["key"], i["value"])
                }
            })
        }
        if (callback) callback()
    } catch (e) {
        console.info("读取本地扩展缓存数据错误", e)
    } finally {
        setInterval(() => writeTimer("extraCache"), 3000)
    }
}

/**
 * 强制进行写操作
 * @param {"cache"|"extraCache"} type 缓存数据类型
 */
const syncCacheToFile = (type) => {
    try {
        localCacheState.writingFile = true
        const cache = type === "cache" ? kvCache : extraKVCache

        let value = []
        cache.forEach((v, k) => {
            value.push({key: k, value: v})
        })
        value.sort((a, b) => `${a.key}`.localeCompare(`${b.key}`))
        syncLocalCacheFile(type, JSON.stringify(value))
    } catch (e) {
        console.info(e)
    } finally {
        localCacheState.writingFile = false
    }
}

module.exports = {
    getExtraLocalCacheValue,
    setExtraLocalCache,
    getLocalCacheValue,
    setLocalCache,
    initLocalCache,
    initExtraLocalCache,
    register: (win, getClient) => {
        /** 手动触发写操作 */
        ipcMain.handle("manual-write-file", async (e, type) => {
            syncCacheToFile(type)
        })
        /** 获取本地缓存数据 */
        ipcMain.handle("fetch-local-cache", async (e, key) => {
            return getLocalCacheValue(key)
        })
        /** 设置本地缓存数据 */
        ipcMain.handle("set-local-cache", (e, key, value) => {
            setLocalCache(key, value)
        })
        /** 获取本地拓展缓存数据 */
        ipcMain.handle("fetch-extra-cache", async (e, key) => {
            return getExtraLocalCacheValue(key)
        })
        /** 设置本地拓展缓存数据 */
        ipcMain.handle("set-extra-cache", (e, key, value) => {
            setExtraLocalCache(key, value)
        })
    }
}
