import isNil from "lodash/isNil"
import {debugToPrintLogs} from "./logCollection"

/** @name 将传入对象中值为null或undefined的键值对删除 */
export const toolDelInvalidKV = (data: any) => {
    try {
        if (!data) return data
        if (!isObject(data)) return data
        for (const key in data) {
            if (isNil(data[key])) {
                delete data[key]
            } else if (isObject(data[key])) {
                toolDelInvalidKV(data[key])
            }
        }
        return data
    } catch (error) {
        return data
    }
}

/**判断值是否为对象 */
export const isObject = (value) => {
    return Object.prototype.toString.call(value) === "[object Object]"
}
/**判断值是否为数组 */
export const isArray = (value) => {
    return Object.prototype.toString.call(value) === "[object Array]"
}

/**是否为空对象 */
export const isEmptyObject = (obj: object) => {
    return !(obj && Object.keys(obj).length > 0)
}

/**是否为有效数字 */
export const isNumberNaN = (n: number) => {
    return Number.isNaN(Number(n))
}

/**
 * 校验 URL 格式的正则表达式（支持 HTTP/HTTPS/FTP）
 * 允许：协议、域名/IP、端口、路径、查询参数、哈希
 * 不允许：用户名密码、空格等非法字符
 */
const urlRegex =
    /^(https?|ftp):\/\/(?:www\.)?(?:[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[a-fA-F0-9:]+\])(?::\d{1,5})?(?:\/(?:[-a-zA-Z0-9()@:%_+.~#&/=]*)?)?(?:\?[^#\s]*)?(?:#.*)?$/i
/** 是否为有效 URL */
export const isValidURL = (url: string) => {
    return urlRegex.test(url)
}

/**将 CSS 变量名转换为对应的值 */
export const getCssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export interface JSONParseLogOption {
    page?: string
    fun?: string
    reviver?: (key: string, value: any) => any
}
/**JSON.parse安全记录 */
export function JSONParseLog(text: string, option?: JSONParseLogOption) {
    try {
        const result = JSON.parse(text, option?.reviver)
        return result
    } catch (err) {
        debugToPrintLogs({
            page: option?.page || "tool",
            fun: option?.fun || "safeJSONParse",
            title: text,
            content: err
        })
        throw err
    }
}
