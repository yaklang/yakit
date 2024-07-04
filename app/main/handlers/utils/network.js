// const https = require("https");
// const {caBundle} = require("../missedCABundle");
const axios = require("axios");
const url = require("url");
const process = require("process");
const { requestWithProgress } = require("./requestWithProgress");
const events = require("events");
const { async } = require("node-stream-zip");

const ossDomains = ["aliyun-oss.yaklang.com", "yaklang.oss-cn-beijing.aliyuncs.com", "yaklang.oss-accelerate.aliyuncs.com"];

const getHttpsAgentByDomain = (domain) => {
    // if (domain.endsWith('.yaklang.com')) {
    //     console.info(`use ssl ca-bundle for ${domain}`);
    //     return new https.Agent({ca: caBundle, rejectUnauthorized: true}) // unsafe...
    // }
    console.info(`skip ssl ca-bundle for ${domain}`);
    return undefined
}

const config = {
    initializedOSSDomain: false, currentOSSDomain: "",
    fetchingOSSDomain: false,
    fetchOSSDomainEventEmitter: new events.EventEmitter()
};


async function getAvailableOSSDomain() {
    console.info("start to fetch oss domain for download extra resources")
    try {
        if (config.initializedOSSDomain) {
            if (!config.currentOSSDomain) {
                return "yaklang.oss-accelerate.aliyuncs.com"
            } else {
                return config.currentOSSDomain
            }
        }

        if (config.fetchingOSSDomain) {
            return new Promise((resolve, reject) => {
                config.fetchOSSDomainEventEmitter.once("done", () => {
                    console.info("fetch oss domain done, resolve the promise.")
                    if (!config.currentOSSDomain) {
                        resolve("yaklang.oss-accelerate.aliyuncs.com")
                    } else {
                        resolve(config.currentOSSDomain)
                    }
                })
            })
        }

        config.fetchingOSSDomain = true;

        try {
            for (const domain of ossDomains) {
                const url = `https://${domain}/yak/latest/version.txt`;
                try {
                    console.info(`start to do axios.get to ${url}`)
                    const response = await axios.get(url, { httpsAgent: getHttpsAgentByDomain(domain) });
                    if (response.status !== 200) {
                        console.error(`Failed to access (StatusCode) ${url}: ${response.status}`);
                        continue
                    }
                    config.currentOSSDomain = domain;
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
            config.fetchingOSSDomain = false;
            config.fetchOSSDomainEventEmitter.emit("done")
        }
    } catch (e) {
        return "yaklang.oss-accelerate.aliyuncs.com"
    }
}

/**获取校验url */
const getCheckTextUrl = async () => {
    const domain = await getAvailableOSSDomain();
    let url = ''
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                url = `https://${domain}/yak/${version}/yak_darwin_arm64.sha256.txt`
            } else {
                url = `https://${domain}/yak/${version}/yak_darwin_amd64.sha256.txt`
            }
            break
        case "win32":
            url = `https://${domain}/yak/${version}/yak_windows_amd64.exe.sha256.txt`
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
const fetchLatestYakEngineVersion = async () => {
    const domain = await getAvailableOSSDomain();
    const versionUrl = `https://${domain}/yak/latest/version.txt`;
    return axios.get(versionUrl, { httpsAgent: getHttpsAgentByDomain(domain) }).then(response => {
        const versionData = `${response.data}`.trim()
        if (versionData.length > 0) {
            return versionData.startsWith("v") ? versionData : `v${versionData}`
        } else {
            throw new Error("Failed to fetch version data")
        }
    })
}

const fetchLatestYakitVersion = async () => {
    const domain = await getAvailableOSSDomain();
    const versionUrl = `https://${domain}/yak/latest/yakit-version.txt`;
    return axios.get(versionUrl, { httpsAgent: getHttpsAgentByDomain(domain) }).then(response => {
        const versionData = `${response.data}`.trim()
        if (versionData.length > 0) {
            return versionData.startsWith("v") ? versionData : `v${versionData}`
        } else {
            throw new Error("Failed to fetch version data")
        }
    })
}

const fetchLatestYakitEEVersion = async () => {
    const domain = await getAvailableOSSDomain();
    const versionUrl = `https://${domain}/yak/latest/yakit-ee-version.txt`;
    return axios.get(versionUrl, { httpsAgent: getHttpsAgentByDomain(domain) }).then(response => {
        const versionData = `${response.data}`.trim()
        if (versionData.length > 0) {
            return versionData.startsWith("v") ? versionData : `v${versionData}`
        } else {
            throw new Error("Failed to fetch version data")
        }
    })
}

const getYakEngineDownloadUrl = async (version) => {
    const domain = await getAvailableOSSDomain();
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

const getYakitCommunityDownloadUrl = async (version) => {
    const domain = await getAvailableOSSDomain();
    switch (process.platform) {
        case "darwin":
            if (process.arch === "arm64") {
                return `https://${domain}/yak/${version}/Yakit-${version}-darwin-arm64.dmg`
            } else {
                return `https://${domain}/yak/${version}/Yakit-${version}-darwin-x64.dmg`
            }
        case "win32":
            return `https://${domain}/yak/${version}/Yakit-${version}-windows-amd64.exe`
        case "linux":
            if (process.arch === "arm64") {
                return `https://${domain}/yak/${version}/Yakit-${version}-linux-arm64.AppImage`
            } else {
                return `https://${domain}/yak/${version}/Yakit-${version}-linux-amd64.AppImage`
            }
    }
    throw new Error(`Unsupported platform: ${process.platform}`)
}

const getYakitEEDownloadUrl = async (version) => {
    const domain = await getAvailableOSSDomain();
    switch (process.platform) {
        case "darwin":
            return `https://${domain}/yak/${version}/Yakit-EE-${version}-darwin-x64.dmg`
        case "win32":
            return `https://${domain}/yak/${version}/Yakit-EE-${version}-windows-amd64.exe`
        case "linux":
            return `https://${domain}/yak/${version}/Yakit-EE-${version}-linux-amd64.AppImage`
    }
    throw new Error(`Unsupported platform: ${process.platform}`)
}

const downloadYakEngine = async (version, destination, progressHandler, onFinished, onError) => {
    const downloadUrl = await getYakEngineDownloadUrl(version);
    requestWithProgress(downloadUrl, destination, {
        httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host),
    }, progressHandler, onFinished, onError)
}
const downloadYakitCommunity = async (version, destination, progressHandler, onFinished, onError) => {
    const downloadUrl = await getYakitCommunityDownloadUrl(version);

    console.info(`start to download yakit community: ${downloadUrl}`)
    requestWithProgress(downloadUrl, destination, {
        httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host),
    }, progressHandler, onFinished, onError)
}

const downloadYakitEE = async (version, destination, progressHandler, onFinished, onError) => {
    const downloadUrl = await getYakitEEDownloadUrl(version);
    requestWithProgress(downloadUrl, destination, {
        httpsAgent: getHttpsAgentByDomain(url.parse(downloadUrl).host),
    }, progressHandler, onFinished, onError)
}

module.exports = {
    getCheckTextUrl,
    fetchLatestYakEngineVersion,
    fetchLatestYakitVersion,
    fetchLatestYakitEEVersion,
    downloadYakitCommunity,
    downloadYakEngine,
    downloadYakitEE,
    getYakitCommunityDownloadUrl,
    getYakEngineDownloadUrl,
    getYakitEEDownloadUrl,
}