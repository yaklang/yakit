import { grpcFetchLocalYakVersion } from "@/apiUtils/grpc"
import { yakitFailed } from "./notification"

/** 代理规则配置storage key */
export const PROXY_CONFIG_STORAGE_KEY = "GLOBAL_PROXY_RULES_CONFIG_V1"

/** 代理配置最低引擎版本 */
const MIN_PROXY_VERSION = "1.4.4-beta16"

/**
 * 版本号比较
 * @param current 当前版本
 * @param min 最低版本
 * @returns 当前版本 >= 最低版本
 */
const compareVersion = (current: string, min: string): boolean => {
    const parseVer = (v: string) => {
        const [base, suffix] = v.split("-")
        const [major, minor, patch] = base.split(".").map(Number)
        
        // 解析后缀，提取前缀和数字部分（如 "beta16" -> {prefix: "beta", num: 16}）
        let suffixPrefix = ""
        let suffixNum = 0
        if (suffix) {
            const match = suffix.match(/^([a-zA-Z]+)(\d+)?$/)
            if (match) {
                suffixPrefix = match[1] || ""
                suffixNum = match[2] ? parseInt(match[2]) : 0
            } else {
                suffixPrefix = suffix
            }
        }
        
        return { major, minor, patch, suffixPrefix, suffixNum }
    }
    const curr = parseVer(current)
    const minVer = parseVer(min)

    // 比较主版本、副版本、补丁版本
    if (curr.major !== minVer.major) return curr.major > minVer.major
    if (curr.minor !== minVer.minor) return curr.minor > minVer.minor
    if (curr.patch !== minVer.patch) return curr.patch > minVer.patch

    // 版本号相同，比较后缀（如 beta10）
    if (!curr.suffixPrefix && !minVer.suffixPrefix) return true
    if (!curr.suffixPrefix) return true // 没有后缀 > 有后缀
    if (!minVer.suffixPrefix) return false // 有后缀 < 没有后缀
    
    return curr.suffixNum >= minVer.suffixNum
}

/**
 * 检查引擎版本是否符合要求
 * @returns true 表示版本符合要求，false 表示版本不符合
 */
export const checkProxyVersion = async (): Promise<boolean> => {
    try {
        const localVersion = await grpcFetchLocalYakVersion()

        const isValid = compareVersion(localVersion, MIN_PROXY_VERSION)

        if (!isValid && !localVersion.includes('dev')) {
            yakitFailed(`引擎版本过低，请更新到 ${MIN_PROXY_VERSION} 及以上`)
            return false
        }

        return true
    } catch (error) {
        yakitFailed("检查引擎版本失败")
        return false
    }
}



export const isValidUrlWithProtocol = (url: string): boolean => {
    try {
        // 使用正则表达式验证代理 URL 格式: 协议://主机:端口
        // 仅支持 http, https, socks4, socks5 四种协议
        const proxyPattern = /^(https?|socks[45]):\/\/[^:\/\s]+:\d+$/
        return proxyPattern.test(url)
    } catch (error) {
        return false
    }
}