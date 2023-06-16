
export type FilterMode = "drop" | "match" | 'onlyMatch'
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
    retry: boolean
    /**@name 不重试条件的checked */
    noRetry: boolean
    retryConfiguration?: {
        statusCode: string
        keyWord: string
    }
    noRetryConfiguration?: {
        statusCode: string
        keyWord: string
    }
    retryWaitSeconds: number
    retryMaxWaitSeconds: number
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
    // 过滤配置 0612 不要了
    // filterMode: "drop" | "match"
    // statusCode: string
    // regexps: string
    // keyWord: string
    // /**@name 转换后转给后端的的响应大小最大值 */
    // minBodySize: number
    // /**@name 转换后转给后端的的响应大小最小值 */
    // maxBodySize: number

    // dns config
    dnsServers: string[]
    etcHosts: KVPair[]
    // 设置变量
    params: FuzzerParamItem[]
    // 匹配器
    filterMode: FilterMode
    matchers: HTTPResponseMatcher[]
    matchersCondition: 'and' | 'or'
    hitColor?: string
    //提取器
    extractors: HTTPResponseExtractor[]
}

export interface FuzzerParamItem {
    Key: string
    Value: string
    Type?: string
}

export interface HttpQueryAdvancedConfigProps {
    advancedConfigValue: AdvancedConfigValueProps
    visible: boolean
    setVisible: (b: boolean) => void
    onInsertYakFuzzer: () => void
    onValuesChange: (v: AdvancedConfigValueProps) => void
    /**刷新设置代理的list */
    refreshProxy: boolean
}

export interface KVPair {
    Key: string;
    Value: string;
}