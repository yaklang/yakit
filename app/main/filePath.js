const {app} = require("electron")
const electronIsDev = require("electron-is-dev")
const os = require("os")
const path = require("path")
const process = require("process")
const fs = require("fs")
/** 软件根目录 */
const appPath = app.isPackaged ? path.dirname(app.getPath("exe")) : app.getAppPath()
/** 软件关联项目相关目录路径 */
/** 优先使用家目录下的yakit-projects
 * 在新版本中，windows自定义安装路径会将家目录的yakit-projects迁移到软件根目录下，则会使用该目录 */
const defaultYakitProjectPath = path.join(os.homedir(), "yakit-projects")
const currentYakitProjectPath = path.join(appPath, "yakit-projects")
const YakitProjectPath =
    (
        process.platform === "win32"
        ? (
            fs.existsSync(currentYakitProjectPath) ? 
            currentYakitProjectPath: 
            process.env.YAKIT_HOME  || defaultYakitProjectPath
        )
        : defaultYakitProjectPath
    )

/** 引擎和软件安装包路径 */
const yaklangEngineDir = path.join(YakitProjectPath, "yak-engine")
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

const loadExtraFilePath = (s) => {
    if (electronIsDev) {
        return s
    }

    switch (os.platform()) {
        case "darwin":
            return path.join(app.getAppPath(), "../..", s)
        case "linux":
            return path.join(app.getAppPath(), "../..", s)
        case "win32":
            return path.join(app.getAppPath(), "../..", s)
        default:
            return path.join(app.getAppPath(), s)
    }
}

/** 所有缓存数据文件夹 */
const basicDir = path.join(YakitProjectPath, "base")
/** 本地缓存数据文件地址 */
const localCachePath = path.join(basicDir, "yakit-local.json")
/** 本地缓存数据(扩展数据)文件地址 */
const extraLocalCachePath = path.join(basicDir, "yakit-extra-local.json")
/** 本地引擎启动日志 */
const engineLog = path.join(basicDir, "engine.log")

/** 远程连接配置信息储存文件夹 */
const remoteLinkDir = path.join(YakitProjectPath, "auth")
/** 远程连接引擎配置数据文件地址 */
const remoteLinkFile = path.join(remoteLinkDir, "yakit-remote.json")

/** Html模板文件地址 */
// const yakitDir = path.join(os.homedir(), "AppData","Local","Programs","yakit")
// const htmlTemplateDir = path.join(yakitDir, "report")
const htmlTemplateDir = loadExtraFilePath(path.join("report"))

/** 窗口缓存文件路径 */
const windowStatePatch = path.join(basicDir)

module.exports = {
    YakitProjectPath,
    yaklangEngineDir,
    getLocalYaklangEngine,
    localCachePath,
    extraLocalCachePath,
    engineLog,
    remoteLinkDir,
    remoteLinkFile,
    htmlTemplateDir,
    windowStatePatch
}
