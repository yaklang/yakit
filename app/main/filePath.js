const {app} = require("electron")
const electronIsDev = require("electron-is-dev")
const os = require("os")
const path = require("path")
const process = require("process")
const fs = require("fs")

/** 软件根目录 */
const appPath = app.isPackaged ? path.dirname(app.getPath("exe")) : app.getAppPath()
/** 系统用户根路径 */
const osHome = os.homedir()
/** 软件关联数据文件夹名 */
const projectName = "yakit-projects"

/** 软件关联数据路径设置逻辑 Start */
// 数据文件夹路径
let project_path = ""
// os-home环境 项目文件夹路径
const osHomeProjectPath = path.join(osHome, projectName)
// 软件环境 项目文件夹路径
const appProjectPath = path.join(appPath, projectName)

try {
    /**
     * 开发环境，win系统会优先查找环境变量的指定地址，mac和linux指定为os-home
     * 发布环境，win系统指定为软件根目录下，mac和linux指定为os-home
     */
    if (process.platform === "win32") {
        if (electronIsDev) {
            project_path = process.env.YAKIT_HOME
                ? fs.existsSync(process.env.YAKIT_HOME)
                    ? process.env.YAKIT_HOME
                    : osHomeProjectPath
                : osHomeProjectPath
        } else {
            project_path = appProjectPath
        }
    } else {
        project_path = osHomeProjectPath
    }
} catch (error) {
    console.log(`读取项目数据文件夹失败，${error}`)
}
/** 软件关联数据路径设置逻辑 End */

/**
 * @name 软件关联项目相关目录路径
 * 在新版本中，windows自定义安装路径会将os-home目录的yakit-projects迁移到软件根目录下
 * 如果获取项目关联文件夹路径错误时，将自动设置为系统用户下面(容灾处理)
 */
const YakitProjectPath = project_path || osHomeProjectPath

console.log(`---------- Global-Path Start ----------`)
console.log(`software-path: ${appPath}`)
console.log(`os-home-path: ${osHome}`)
console.log(`yakit-projects-path: ${YakitProjectPath}`)
console.log(`---------- Global-Path End ----------`)

/** 引擎文件夹路径 */
const yaklangEngineDir = path.join(YakitProjectPath, "yak-engine")

/** yakit安装包路径 */
const yakitInstallDir = path.join(os.homedir(), "Downloads")

/** 引擎文件路径 */
const getLocalYaklangEngine = () => {
    switch (process.platform) {
        case "darwin":
        case "linux":
            return path.join(yaklangEngineDir, "yak")
        case "win32":
            return path.join(yaklangEngineDir, "yak.exe")
    }
}

/** 生成软件根目录+参数的完成路径 */
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

/** 基础缓存数据文件夹 */
const basicDir = path.join(YakitProjectPath, "base")
/** 本地缓存数据文件地址 */
const localCachePath = path.join(basicDir, "yakit-local.json")
/** 本地缓存数据(扩展数据)文件地址 */
const extraLocalCachePath = path.join(basicDir, "yakit-extra-local.json")

/** 引擎错误日志 */
const engineLog = path.join(YakitProjectPath, "engine-log")
/** 渲染端错误日志 */
const renderLog = path.join(YakitProjectPath, "render-log")
/** 可以问题的打印日志 */
const printLog = path.join(YakitProjectPath, "print-log")

/** 远程连接配置信息储存文件夹 */
const remoteLinkDir = path.join(YakitProjectPath, "auth")
/** 远程连接引擎配置数据文件地址 */
const remoteLinkFile = path.join(remoteLinkDir, "yakit-remote.json")

/** yak code文件夹路径 */
const codeDir = path.join(YakitProjectPath, "code")

/** Html模板文件地址 */
// const yakitDir = path.join(os.homedir(), "AppData","Local","Programs","yakit")
// const htmlTemplateDir = path.join(yakitDir, "report")
const htmlTemplateDir = loadExtraFilePath(path.join("report"))

/** 窗口缓存文件路径 */
const windowStatePatch = path.join(basicDir)

/** yak 项目相关文件路径 */
const yakProjects = path.join(YakitProjectPath, "projects")

module.exports = {
    YakitProjectPath,

    yaklangEngineDir,
    yakitInstallDir,
    getLocalYaklangEngine,
    loadExtraFilePath,

    basicDir,
    localCachePath,
    extraLocalCachePath,
    engineLog,
    renderLog,
    printLog,

    remoteLinkDir,
    remoteLinkFile,

    codeDir,

    htmlTemplateDir,
    windowStatePatch,
    yakProjects
}
