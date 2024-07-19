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
    /**@name 不修复长度 */
    noFixContentLength: boolean
    noSystemProxy: boolean
    resNumlimit: number
    actualHost: string
    timeout: number
    batchTarget?: Uint8Array
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
    filterMode: FilterMode
    matchers: HTTPResponseMatcher[]
    matchersCondition: "and" | "or"
    hitColor: string
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
    onShowResponseMatcherAndExtraction?: (activeType: MatchingAndExtraction, activeKey: string) => void
    inViewportCurrent?: boolean
    id: string
    matchSubmitFun: () => void
    /**根据type 显示高级配置中得内容 */
    showFormContentType: WebFuzzerType
    proxyListRef: React.Ref
    isbuttonIsSendReqStatus: boolean
}
