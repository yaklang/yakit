const os = require("os")
const path = require("path")
const process = require("process")

/** 软件关联项目相关目录路径 */
const homeDir = path.join(os.homedir(), "yakit-projects")
/** 引擎和软件安装包路径 */
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

/** 所有缓存数据文件夹 */
const basicDir = path.join(homeDir, "base")
/** 本地缓存数据文件地址 */
const localCachePath = path.join(basicDir, "yakit-local.json")
/** 本地缓存数据(扩展数据)文件地址 */
const extraLocalCachePath = path.join(basicDir, "yakit-extra-local.json")
/** 本地引擎启动日志 */
const engineLog = path.join(basicDir, "engine.log")

/** 远程连接配置信息储存文件夹 */
const remoteLinkDir = path.join(homeDir, "auth")
/** 远程连接引擎配置数据文件地址 */
const remoteLinkFile = path.join(remoteLinkDir, "yakit-remote.json")

module.exports = {
    yaklangEngineDir,
    getLocalYaklangEngine,
    localCachePath,
    extraLocalCachePath,
    engineLog,
    remoteLinkDir,
    remoteLinkFile
}
