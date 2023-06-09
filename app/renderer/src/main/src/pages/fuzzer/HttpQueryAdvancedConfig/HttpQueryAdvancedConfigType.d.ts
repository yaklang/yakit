
export interface AdvancedConfigValueProps {
    // 请求包配置
    forceFuzz?: boolean
    isHttps: boolean
    isGmTLS: boolean
    /**@name 不修复长度 */
    noFixContentLength: boolean
    noSystemProxy: boolean
    actualHost: string
    timeout: number
    // 发包配置
    concurrent: number
    proxy: string[]
    minDelaySeconds: number
    maxDelaySeconds: number
    repeatTimes: number
    // 重试配置
    maxRetryTimes: number
    /**@name 重试条件的checked */
    retrying: boolean
    /**@name 不重试条件的checked */
    noRetrying: boolean
    retryConfiguration?: {
        statusCode: string
        keyWord: string
        waitTime?: number
        maxWaitTime?: number
    }
    noRetryConfiguration?: {
        statusCode: string
        keyWord: string
    }
    // 重定向配置
    redirectCount: number
    noFollowRedirect: boolean
    followJSRedirect: boolean
    redirectConfiguration?: {
        statusCode: string
        keyWord: string
    }
    noRedirectConfiguration?: {
        statusCode: string
        keyWord: string
    }
    // 过滤配置
    filterMode: "drop" | "match"
    statusCode: string
    regexps: string
    keyWord: string
    /**@name 转换后转给后端的的响应大小最大值 */
    minBodySize: number
    /**@name 转换后转给后端的的响应大小最小值 */
    maxBodySize: number
    // /**@name 前端显示的响应大小最小值 */
    // minBodySizeInit?: number
    // /**@name 前端显示的响应大小最大值 */
    // maxBodySizeInit?: number
    // /**@name 响应大小最小值单位 */
    // minBodySizeUnit: "B" | "K" | "M"
    // /**@name 响应大小最大值单位 */
    // maxBodySizeUnit: "B" | "K" | "M"

    // dns config
    dnsServers: string[]
    etcHosts: {Key: string; Value: string}[]
    // 设置变量
    params: FuzzerParamItem[]
}

export interface FuzzerParamItem {
    Key: string
    Value: string
}

export interface HttpQueryAdvancedConfigProps {
    advancedConfigValue: AdvancedConfigValueProps
    isHttps: boolean
    isGmTLS: boolean
    setIsHttps: (b: boolean) => void
    setIsGM: (b: boolean) => void
    visible: boolean
    setVisible: (b: boolean) => void
    onInsertYakFuzzer: () => void
    onValuesChange: (v: AdvancedConfigValueProps) => void
    /**刷新设置代理的list */
    refreshProxy: boolean
}