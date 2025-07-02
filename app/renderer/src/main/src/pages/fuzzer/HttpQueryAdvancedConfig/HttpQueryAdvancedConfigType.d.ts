import {KVPair} from "@/models/kv"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {WebFuzzerType} from "../WebFuzzerPage/WebFuzzerPageType"

export type FilterMode = "drop" | "match" | "onlyMatch"

export type FuzzTagMode = "close" | "standard" | "legacy"

export interface AdvancedConfigValueProps {
    // 请求包配置
    fuzzTagMode: FuzzTagMode
    fuzzTagSyncIndex: boolean
    isHttps: boolean
    isGmTLS: boolean
    randomJA3: boolean
    /**@name 不修复长度 */
    noFixContentLength: boolean
    noSystemProxy: boolean
    disableHotPatch: boolean
    disableUseConnPool: boolean
    resNumlimit: number
    sNI: string
    overwriteSNI: string
    actualHost: string
    timeout: number
    dialTimeoutSeconds: nnumber
    batchTarget?: Uint8Array
    // Random Chunked
    enableRandomChunked: boolean
    randomChunkedMinLength: number
    randomChunkedMaxLength: number
    randomChunkedMinDelay: number
    randomChunkedMaxDelay: number

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
    maxBodySize: number

    // dns config
    dnsServers: string[]
    etcHosts: KVPair[]

    // 设置变量
    params: FuzzerParamItem[]
    methodGet: KVPair[]
    methodPost: KVPair[]
    headers: KVPair[]
    cookie: KVPair[]

    // 匹配器
    matchers: HTTPResponseMatcher[]
    //提取器
    extractors: HTTPResponseExtractor[]

    // 序列
    /**@name  */
    inheritCookies?: boolean
    /**@name  */
    inheritVariables?: boolean
}

export interface FuzzerParamItem {
    Key: string
    Value: string
    Type: string
}

export interface ShowResponseMatcherAndExtractionProps {
    activeType: MatchingAndExtraction
    activeKey: string
    /**只有 activeType为matchers 必传 */
    order?: number
}
export interface HttpQueryAdvancedConfigProps {
    advancedConfigValue: AdvancedConfigValueProps
    visible: boolean
    onInsertYakFuzzer: () => void
    onValuesChange: (v: AdvancedConfigValueProps) => void
    /**匹配器和提取器里面的响应 */
    defaultHttpResponse: string
    /**@name 与onShowShowResponseMatcherAndExtraction配合使用 */
    outsideShowResponseMatcherAndExtraction?: boolean
    /**@name  webfuzzer如果有响应信息,就在响应信息下方展示匹配器和提取器;需与outsideShowResponseMatcherAndExtraction配合使用*/
    onShowResponseMatcherAndExtraction?: (params: ShowResponseMatcherAndExtractionProps) => void
    inViewportCurrent?: boolean
    id: string
    matchSubmitFun: () => void
    /**根据type 显示高级配置中得内容 */
    showFormContentType: WebFuzzerType
    proxyListRef: React.Ref
    isbuttonIsSendReqStatus: boolean
}
