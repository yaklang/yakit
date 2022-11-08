const os = require("os")
const path = require("path")
const process = require("process")

/** 软件关联项目相关目录路径 */
const homeDir = path.join(os.homedir(), "yakit-projects")

const yaklangEngineDir = path.join(homeDir, "yak-engine")
/**
 * Yaklang引擎在本地的绝对地址
 * @returns {String} 本地绝对地址
 */
const getLocalYaklangEngine = () => {
    switch (process.platform) {
        case "darwin":
        case "linux":
            return path.join(yaklangEngineDir, "yak")
        case "win32":
            return path.join(yaklangEngineDir, "yak.exe")
    }
}

const basicDir = path.join(homeDir, "base")
/** 本地缓存数据文件地址 */
const localCachePath = path.join(basicDir, "yakit-local.json")
/** 本地缓存数据(扩展数据)文件地址 */
const extraLocalCachePath = path.join(basicDir, "yakit-extra-local.json")

module.exports = {
    getLocalYaklangEngine,
    localCachePath,
    extraLocalCachePath
}
