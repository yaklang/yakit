// const https = require("https");
// const {caBundle} = require("../missedCABundle");
const axios = require("axios")
const url = require("url")
const process = require("process")
const {requestWithProgress} = require("./requestWithProgress")
const events = require("events")
const fs = require("fs")
const path = require("path")
const {loadExtraFilePath} = require("../../filePath")
const {HttpsProxyAgent} = require("hpagent")

const add_proxy = process.env.https_proxy || process.env.HTTPS_PROXY

const agent = !!add_proxy
    ? new HttpsProxyAgent({
          proxy: add_proxy,
          rejectUnauthorized: false // 忽略 HTTPS 错误
      })
    : undefined

const ossDomains = [
    "oss-qn.yaklang.com",
    "aliyun-oss.yaklang.com",
    "yaklang.oss-cn-beijing.aliyuncs.com",
    "yaklang.oss-accelerate.aliyuncs.com"
]

const getHttpsAgentByDomain = (domain) => {
    // if (domain.endsWith('.yaklang.com')) {
    //     console.info(`use ssl ca-bundle for ${domain}`);
    //     return new https.Agent({ca: caBundle, rejectUnauthorized: true}) // unsafe...
    // }
    console.info(`skip ssl ca-bundle for ${domain}`)
    return undefined
}

const config = {
    initializedOSSDomain: false,
    currentOSSDomain: "",
    fetchingOSSDomain: false,
    fetchOSSDomainEventEmitter: new events.EventEmitter(),
    loggedCachedDomain: false
}

/** 初始化 oss 配置信息 */
async function getAvailableOSSDomain() {
    try {
        if (config.initializedOSSDomain) {
            if (!config.currentOSSDomain) {
                config.loggedCachedDomain = false
                return "yaklang.oss-accelerate.aliyuncs.com"
            } else {
                if (!config.loggedCachedDomain) {
                    console.info(`(cached) use oss domain: ${config.currentOSSDomain}`)
                    config.loggedCachedDomain = true
                }
                return config.currentOSSDomain
            }
        }

        if (config.fetchingOSSDomain) {
            return new Promise((resolve, reject) => {
                config.fetchOSSDomainEventEmitter.once("done", () => {
                    console.info("fetch oss domain done, resolve the promise.")
                    if (!config.currentOSSDomain) {
                        config.loggedCachedDomain = false
                        resolve("yaklang.oss-accelerate.aliyuncs.com")
                    } else {
                        if (!config.loggedCachedDomain) {
                            console.info(`(cached) use oss domain: ${config.currentOSSDomain}`)
                            config.loggedCachedDomain = true
                        }
                        resolve(config.currentOSSDomain)
                    }
                })
            })
        }

        config.fetchingOSSDomain = true

        try {
            for (const domain of ossDomains) {
                const url = `https://${domain}/yak/latest/version.txt`
                try {
                    console.info(`start to do axios.get to ${url}`)
                    const response = await axios.get(url, {
                        httpsAgent: getHttpsAgentByDomain(domain),
                        ...(agent ? {httpsAgent: agent, proxy: false} : {})
                    })
                    if (response.status !== 200) {
                        console.error(`Failed to access (StatusCode) ${url}: ${response.status}`)
                        continue
                    }
                    config.currentOSSDomain = domain
                    config.initializedOSSDomain = true
                    break
                } catch (e) {
                    console.error(`Failed to access ${url}: ${e.message}`)
                }
            }
            if (!config.currentOSSDomain) {
                return "yaklang.oss-accelerate.aliyuncs.com"
            }
            return config.currentOSSDomain
        } catch (e) {
            return "yaklang.oss-accelerate.aliyuncs.com"
        } finally {
            config.fetchingOSSDomain = false
            config.fetchOSSDomainEventEmitter.emit("done")
        }
    } catch (e) {
        return "yaklang.oss-accelerate.aliyuncs.com"
    }
}

/** 获取校验url */
const getCheckTextUrl = async (version) => {
    const domain = await getAvailableOSSDomain()
    let system_mode = ""
    try {
        system_mode = fs.readFileSync(loadExtraFilePath(path.join("bins", "yakit-system-mode.txt"))).toString("utf8")
    } catch (error) {
        console.log("error", error)
    }
    const suffix = system_mode === "legacy"

    let url = ""
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                url = `https://${domain}/yak/${version}/yak_darwin_arm64.sha256.txt`
            } else {
                url = `https://${domain}/yak/${version}/yak_darwin_amd64.sha256.txt`
            }
            break
        case "win32":
            url = `https://${domain}/yak/${version}/yak_windows_${suffix ? "leagacy_" : ""}amd64.exe.sha256.txt`
            break
        case "linux":
            if (process.arch === "arm64") {
                url = `https://${domain}.com/yak/${version}/yak_linux_arm64.sha256.txt`
            } else {
                url = `https://${domain}.com/yak/${version}/yak_linux_amd64.sha256.txt`
            }
            break
        default:
            break
    }
    return url
}
/** 获取指定版本号的引擎Hash值 */
const fetchSpecifiedYakVersionHash = async (version, requestConfig) => {
    const url = await getCheckTextUrl(version)
    if (url === "") {
        throw new Error(`No Find ${version} Hash Url`)
    }
    return axios.get(url, {...(requestConfig || {}), httpsAgent: getHttpsAgentByDomain(url)}).then((response) => {
        const versionData = Buffer.from(response.data).toString("utf8")
        if (versionData.length > 0) {
            return Buffer.from(response.data).toString("utf8")
        } else {
            throw new Error("校验值不存在")
        }
    })
}
/** 获取最新 yak 版本号 */
const fetchLatestYakEngineVersion = async () => {
    const domain = await getAvailableOSSDomain()
    const versionUrl = `https://${domain}/yak/latest/version.txt`
    return axios
        .get(versionUrl, {
            httpsAgent: getHttpsAgentByDomain(domain),
            ...(agent ? {httpsAgent: agent, proxy: false} : {})
        })
        .then((response) => {
            const versionData = `${response.data}`.trim()
            if (versionData.length > 0) {
                return versionData.startsWith("v") ? versionData : `v${versionData}`
            } else {
                throw new Error("Failed to fetch version data")
            }
        })
}
/** 获取最新 yakit 版本号 */
const fetchLatestYakitVersion = async (requestConfig) => {
    const domain = await getAvailableOSSDomain()
    const versionUrl = `https://${domain}/yak/latest/yakit-version.txt`
    return axios
        .get(versionUrl, {
            ...(requestConfig || {}),
            httpsAgent: getHttpsAgentByDomain(domain),
            ...(agent ? {httpsAgent: agent, proxy: false} : {})
        })
        .then((response) => {
            const versionData = `${response.data}`.trim()
            if (versionData.length > 0) {
                return versionData.startsWith("v") ? versionData : `v${versionData}`
            } else {
                throw new Error("Failed to fetch version data")
            }
        })
}
/** 获取最新 yakit EE 版本号 */
const fetchLatestYakitEEVersion = async (requestConfig) => {
    const domain = await getAvailableOSSDomain()
    const versionUrl = `https://${domain}/vip/latest/yakit-version.txt`
    return axios
        .get(versionUrl, {
            ...(requestConfig || {}),
            httpsAgent: getHttpsAgentByDomain(domain),
            ...(agent ? {httpsAgent: agent, proxy: false} : {})
        })
        .then((response) => {
            const versionData = `${response.data}`.trim()
            if (versionData.length > 0) {
                return versionData.startsWith("v") ? versionData : `v${versionData}`
            } else {
                throw new Error("Failed to fetch version data")
            }
        })
}
/** 引擎下载地址 */
const getYakEngineDownloadUrl = async (version) => {
    const domain = await getAvailableOSSDomain()
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `https://${domain}/yak/${version}/yak_darwin_arm64`
            } else {
                return `https://${domain}/yak/${version}/yak_darwin_amd64`
            }
        case "win32":
            return `https://${domain}/yak/${version}/yak_windows_amd64.exe`
        case "linux":
            if (process.arch === "arm64") {
                return `https://${domain}/yak/${version}/yak_linux_arm64`
            } else {
                return `https://${domain}/yak/${version}/yak_linux_amd64`
            }
        default:
            throw new Error(`Unsupported platform: ${process.platform}`)
    }
}
/** Yakit CE 版本下载地址 */
const getYakitCommunityDownloadUrl = async (version) => {
    const domain = await getAvailableOSSDomain()
    const suffix = process.env["SYSTEM_MODE"] === "legacy" ? "-legacy" : ""
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `https://${domain}/yak/${version}/Yakit-${version}-darwin${suffix}-arm64.dmg`
            } else {
                return `https://${domain}/yak/${version}/Yakit-${version}-darwin${suffix}-x64.dmg`
            }
        case "win32":
            return `https://${domain}/yak/${version}/Yakit-${version}-windows${suffix}-amd64.exe`
        case "linux":
            if (process.arch === "arm64") {
                return `https://${domain}/yak/${version}/Yakit-${version}-linux${suffix}-arm64.AppImage`
            } else {
                return `https://${domain}/yak/${version}/Yakit-${version}-linux${suffix}-amd64.AppImage`
            }
    }
    throw new Error(`Unsupported platform: ${process.platform}`)
}
/** Yakit EE 版本下载地址 */
const getYakitEEDownloadUrl = async (version) => {
    const domain = await getAvailableOSSDomain()
    let system_mode = ""
    try {
        system_mode = fs.readFileSync(loadExtraFilePath(path.join("bins", "yakit-system-mode.txt"))).toString("utf8")
    } catch (error) {
        console.log("error", error)
    }
    const suffix = system_mode === "legacy" ? "-legacy" : ""

    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `https://${domain}/vip/${version}/EnpriTrace-${version}-darwin${suffix}-arm64.dmg`
            } else {
                return `https://${domain}/vip/${version}/EnpriTrace-${version}-darwin${suffix}-x64.dmg`
            }
        case "win32":
            return `https://${domain}/vip/${version}/EnpriTrace-${version}-windows${suffix}-amd64.exe`
        case "linux":
            if (process.arch === "arm64") {
                return `https://${domain}/vip/${version}/EnpriTrace-${version}-linux${suffix}-arm64.AppImage`
            } else {
                return `https://${domain}/vip/${version}/EnpriTrace-${version}-linux${suffix}-amd64.AppImage`
            }
    }
    throw new Error(`Unsupported platform: ${process.platform}`)
}
/** 下载引擎进度 */
const downloadYakEngine = async (version, destination, progressHandler, onFinished, onError) => {
    const downloadUrl = await getYakEngineDownloadUrl(version)
    requestWithProgress(
        downloadUrl,
        destination,
        {
            httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host)
        },
        progressHandler,
        onFinished,
        onError
    )
}
/** 下载 Yakit CE 进度 */
const downloadYakitCommunity = async (version, destination, progressHandler, onFinished, onError) => {
    const downloadUrl = await getYakitCommunityDownloadUrl(version)

    console.info(`start to download yakit community: ${downloadUrl}`)
    requestWithProgress(
        downloadUrl,
        destination,
        {
            httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host)
        },
        progressHandler,
        onFinished,
        onError
    )
}
/** 下载 Yakit EE 进度 */
const downloadYakitEE = async (version, destination, progressHandler, onFinished, onError) => {
    const downloadUrl = await getYakitEEDownloadUrl(version)
    requestWithProgress(
        downloadUrl,
        destination,
        {
            httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host)
        },
        progressHandler,
        onFinished,
        onError
    )
}

module.exports = {
    getCheckTextUrl,
    fetchSpecifiedYakVersionHash,
    fetchLatestYakEngineVersion,
    fetchLatestYakitVersion,
    fetchLatestYakitEEVersion,
    downloadYakitCommunity,
    downloadYakEngine,
    downloadYakitEE,
    getYakitCommunityDownloadUrl,
    getYakEngineDownloadUrl,
    getYakitEEDownloadUrl,
    getAvailableOSSDomain
}
