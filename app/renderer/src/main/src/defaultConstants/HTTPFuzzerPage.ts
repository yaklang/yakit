/**
 * @description 此文件是 HTTPFuzzerPage 页面的通用常用变量
 * @author luoluo
 */

import {LabelDataProps} from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import {AdvancedConfigShowProps, FuzzerResponse} from "@/pages/fuzzer/HTTPFuzzerPage"
import {AdvancedConfigValueProps} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType"
import {WebFuzzerPageInfoProps} from "@/store/pageInfo"
import cloneDeep from "lodash/cloneDeep"

export const defaultPostTemplate = `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`

export const WEB_FUZZ_HOTPATCH_CODE = "WEB_FUZZ_HOTPATCH_CODE"
export const WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE = "WEB_FUZZ_HOTPATCH_WITH_PARAM_CODE"

// WebFuzzer表格默认显示数量
export const DefFuzzerTableMaxData = 2000
// 发包配置默认显示数量
export const DefFuzzerConcurrent = 20

export const defaultAdvancedConfigShow: AdvancedConfigShowProps = {
    config: true,
    rule: true
}

export const defaultAdvancedConfigValue: AdvancedConfigValueProps = {
    // 请求包配置
    fuzzTagMode: "standard",
    fuzzTagSyncIndex: false,
    isHttps: false,
    isGmTLS: false,
    noFixContentLength: false,
    noSystemProxy: false,
    maxBodySize: 5,
    sNI: "",
    overwriteSNI: "auto",
    resNumlimit: DefFuzzerTableMaxData,
    actualHost: "",
    timeout: 30.0,
    // 批量目标
    batchTarget: new Uint8Array(),
    // 发包配置
    concurrent: DefFuzzerConcurrent,
    proxy: [],
    minDelaySeconds: 0,
    maxDelaySeconds: 0,
    repeatTimes: 0,
    // 重试配置
    maxRetryTimes: 0,
    retry: true,
    noRetry: false,
    retryConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    noRetryConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    retryWaitSeconds: 0,
    retryMaxWaitSeconds: 0,
    // 重定向配置
    redirectCount: 3,
    noFollowRedirect: true,
    followJSRedirect: false,
    redirectConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    noRedirectConfiguration: {
        statusCode: "",
        keyWord: ""
    },
    // dns config
    dnsServers: [],
    etcHosts: [],
    // 设置变量
    params: [{Key: "", Value: "", Type: "raw"}],
    methodGet: [
        {
            Key: "",
            Value: ""
        }
    ],
    methodPost: [
        {
            Key: "",
            Value: ""
        }
    ],
    cookie: [
        {
            Key: "",
            Value: ""
        }
    ],
    headers: [
        {
            Key: "",
            Value: ""
        }
    ],
    // 匹配器
    matchers: [],
    // 提取器
    extractors: []
}

export const emptyFuzzer: FuzzerResponse = {
    BodyLength: 0,
    BodySimilarity: 0,
    ContentType: "",
    Count: 0,
    DurationMs: 0,
    HeaderSimilarity: 0,
    Headers: [],
    Host: "",
    IsHTTPS: false,
    MatchedByFilter: false,
    Method: "",
    Ok: false,
    Payloads: [],
    Reason: "",
    RequestRaw: new Uint8Array(),
    ResponseRaw: new Uint8Array(),
    StatusCode: 0,
    Timestamp: 0,
    UUID: "",

    DNSDurationMs: 0,
    TotalDurationMs: 0,
    ExtractedResults: [],
    MatchedByMatcher: false,
    HitColor: "",

    IsTooLargeResponse: false,
    TooLargeResponseHeaderFile: "",
    TooLargeResponseBodyFile: "",
    DisableRenderStyles: false,
    RuntimeID: "",
    Discard: false
}

export const defaultWebFuzzerPageInfo: WebFuzzerPageInfoProps = {
    pageId: "",
    advancedConfigValue: cloneDeep(defaultAdvancedConfigValue),
    advancedConfigShow: null,
    request: defaultPostTemplate,
    variableActiveKeys: undefined
}
// 注：此处顺序为倒序（新增DefaultDescription记得带-fixed，此处为标识固定项）
export const defaultLabel: LabelDataProps[] = [
    {
        DefaultDescription: "反向正则（单个）-fixed",
        Description: "反向正则（单个）",
        Label: "{{regen:one([0-9a-f]{3})}}"
    },
    {
        DefaultDescription: "反向正则（全部）-fixed",
        Description: "反向正则（全部）",
        Label: "{{regen([0-9a-f]{3})}}"
    },
    {
        DefaultDescription: "时间戳（秒）-fixed",
        Description: "时间戳（秒）",
        Label: "{{timestamp(seconds)}}"
    },
    {
        DefaultDescription: "验证码-fixed",
        Description: "验证码",
        Label: "{{int(0000-9999)}}"
    },
    {
        DefaultDescription: "随机数-fixed",
        Description: "随机数",
        Label: "{{randint(0,10)}}"
    },
    {
        DefaultDescription: "随机字符串-fixed",
        Description: "随机字符串",
        Label: "{{randstr}}"
    },
    {
        DefaultDescription: "整数范围-fixed",
        Description: "整数范围",
        Label: "{{int(1-10)}}"
    },
    {
        DefaultDescription: "插入Payload-fixed",
        Description: "插入Payload"
    },
    {
        DefaultDescription: "插入临时字典-fixed",
        Description: "插入临时字典"
    },
    {
        DefaultDescription: "插入文件-fixed",
        Description: "插入文件"
    }
]
