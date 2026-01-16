export interface ThrottleOptions {
    /** 等待时间，单位为毫秒(default: 1000) */
    wait?: number
    /** 是否在延迟开始前调用函数(default: true) */
    leading?: boolean
    /** 是否在延迟开始后调用函数(default: true) */
    trailing?: boolean
}
