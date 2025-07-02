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

// WebFuzzer表格默认显示数量
export const DefFuzzerTableMaxData = 2000
// 发包配置默认显示数量
export const DefFuzzerConcurrent = 20

export const defaultAdvancedConfigShow: AdvancedConfigShowProps = {
    config: false,
    rule: false
}

export const defaultAdvancedConfigValue: AdvancedConfigValueProps = {
    // 请求包配置
    fuzzTagMode: "standard",
    fuzzTagSyncIndex: false,
    isHttps: false,
    isGmTLS: false,
    randomJA3: false,
    noFixContentLength: false,
    noSystemProxy: false,
    disableUseConnPool: false,
    disableHotPatch: false,
    maxBodySize: 5,
    sNI: "",
    overwriteSNI: "auto",
    resNumlimit: DefFuzzerTableMaxData,
    actualHost: "",
    dialTimeoutSeconds: 10,
    timeout: 30,
    // Random Chunked
    enableRandomChunked: false,
    randomChunkedMinLength: 10,
    randomChunkedMaxLength: 25,
    randomChunkedMinDelay: 50,
    randomChunkedMaxDelay: 100,
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
    TLSHandshakeDurationMs: 0,
    TCPDurationMs: 0,
    ConnectDurationMs: 0,
    ExtractedResults: [],
    MatchedByMatcher: false,
    HitColor: "",

    IsTooLargeResponse: false,
    TooLargeResponseHeaderFile: "",
    TooLargeResponseBodyFile: "",
    DisableRenderStyles: false,
    RuntimeID: "",
    Discard: false,

    IsAutoFixContentType: false,
    OriginalContentType: "",
    FixContentType: "",
    IsSetContentTypeOptions: false,
    RandomChunkedData: []
}

export const HotPatchDefaultContent = `// 使用标签 {{yak(handle|param)}} 可以触发热加载调用
handle = func(p) {
    // 返回值可以是一个字符串
    return codec.EncodeBase64("base64-prefix" + p) + sprintf("_origin(%v)", p)
}

// 使用标签 {{yak(handle1|...)}} 也可以触发热加载调用
// 如何传多个参数：使用自定义的分隔符进行分隔，例如逗号(,)
handle1 = func(p) {
    results = str.Split(p, ",")
    // 返回值也支持返回一个数组
    return results
}

// 使用标签 {{yak(handleYield|...)}} 可以触发热加载调用，这通常用于返回的数据需要长时间执行（例如读取大文件）的时候
// 使用yield可以在执行中途返回值并交给渲染系统进行渲染，无需等待该函数执行完再进行发包
handleYield = func(param, yield) {
    // 这个特殊的 Hook 也支持返回数组
    for s in ["12312312", "abc", "def"] {
        yield(s)
    }
}

// beforeRequest 允许在每次发送数据包前对请求做最后的处理，定义为 func(https bool, originReq []byte, req []byte) []byte
// https 请求是否为https请求
// originReq 原始请求
// req 请求
beforeRequest = func(https, originReq, req) {
    // 我们可以将请求进行一定的修改
    /*
    一个替换请求参数a的例子
    poc.ReplaceHTTPPacketQueryParam(req, "a", "bbb")
    */
    // 将修改后的请求返回
    return []byte(req)
}

// afterRequest 允许在返回响应前对响应做最后的处理，定义为 func(https bool, originReq []byte, req []byte, originRsp []byte, rsp []byte) []byte
// https 请求是否为https请求
// originReq 原始请求
// req 请求
// originRsp 原始响应
// rsp 响应
afterRequest = func(https, originReq, req, originRsp, rsp) {
       // 我们可以将响应进行一定的修改，例如解密响应
    /*
    一个替换响应的例子
    body = poc.GetHTTPPacketBody(rsp)
    data = json.loads(body)~
    if "result" in data {
        data["result"] = string(codec.DecodeBase64(data["result"])~)
    }
    */

    return []byte(rsp)
}

// mirrorHTTPFlow 允许对每一个请求的响应做处理，定义为 func(req []byte, rsp []byte, params map[string]any) map[string]any
// req 请求
// rsp 响应
// params 之前提取器/mirrorHTTPFlow中提取到的参数
// 返回值会作为下一个请求的参数
/** 如需使用，取消注释修改内容即可
mirrorHTTPFlow = func(req, rsp, params) {
    // statusCode = poc.GetStatusCodeFromResponse(rsp)
    // params["current_status_code"] = sprint(statusCode) // 即可在下一个请求中使用，或“提取数据”中发现
    return params
}
*/

// retryHandler 允许对重试的请求做处理，定义为 func(https bool, req []byte, rsp []byte) bool
//     本热加载函数暂时不支持热加载重新执行，在 1.4.2-beta7 之后支持
// https 请求是否为https请求
// req 请求
// rsp 响应
// 返回值为是否重试, true 为重试, false 为不重试
/** 如需使用，取消注释修改内容即可
retryHandler = func(https, req, rsp) {
    // 如果响应码为403，则重试
    // if poc.GetStatusCodeFromResponse(rsp) == 403 {
    //     return true
    // }
    return false
}
*/
`

export const HotPatchTempDefault = [
    {
        name: "爆破 AES-CBC",
        temp: `decode = func(param) {
    key = codec.DecodeHex("31323334313233343132333431323334")~ /* 加密密钥 */
    iv = codec.DecodeHex("03395d68979ed8632646813f4c0bbdb3")~ /* 初始化向量 */
    usernameDict = ["admin"] /* 用户字典 */
    passwordDict = ["admin", "123456", "admin123", "88888888", "666666"] /* 密码字典 */
    resultList = []
    for username in usernameDict {
        for password in passwordDict {
            m = {"username": username, "password": password} /* 这里替换为你需要的格式 */
            jsonInput = json.dumps(m)
            result = codec.AESCBCEncryptWithPKCS7Padding(key, jsonInput, iv)~
            base64Result = codec.EncodeBase64(result)
            resultList.Append(base64Result)
        }
    }
    return resultList
}`,
        isDefault: true
    },
    {
        name: "爆破 RSA-OAEP",
        temp: `decode2 = func(param) {
    publicKey64 = \`LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUFvVlRNNjNuRXE3YXpGQ0Yza2lEKwpuMGgyMnlvWmd2eU92TDJaS001NDg0SWZ0TFFERGdLUjFGTGhBOHJpZDkzRUdYVTRwNVNKZHVHdmhLRmxqR2s1ClFXYmFDcWNOdVNqM3NuYi9RRXU0TXZ2ZmFTMStWd3R4Vk84Z0lIdTVMRCs4ZXNTT1FMdTZaY1Q4dVJ3Wm00c00KNEh0ZXltc2Fjc1lGZmpWME5vMklnMnNVSVJaOTBYR2NzK01CMVFlMFQzcHBHa2V1WGhORnpjMldzS3ZreXBRSApZUDlUeENXejUwR1VhV3YzK2xnUDJzUTZtcFd6SWRDeUZ2OWRlU1NWeE1uRlJQQzU0R0s1endFNmJ3blBhRHJJClhzS0IxN2VnK1NES0FFVHpEYi9YSGxXamZqcWo3aWlabUw5bHJxK3pTU2F0R2llMzM4NVdQMlpUVlZHcDZlSnQKd1FJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t\` /* base64格式的publicKey */
    publicKey = codec.DecodeBase64(publicKey64)~ 

    publicKey = []byte(publicKey)

    usernameDict = ["admin"] /* 用户字典 */
    passwordDict = ["admin", "123456", "admin123", "88888888", "666666"] /* 密码字典 */
    resultList = []
    for username in usernameDict {
        for password in passwordDict {
            m = {"username":username,"password":password, "age":"0"} /* 这里替换为你需要的格式 */
            jsonInput = json.dumps(m)
            result = codec.RSAEncryptWithOAEP(publicKey , jsonInput)~
            base64Result = codec.EncodeBase64(result)
            resultList.Append(base64Result)
        }
    }
    return resultList
}
`,
        isDefault: true
    },
    {
        name: "爆破 CSRF（带有保护用 token）",
        temp: `beforeRequest = func(req) { /* beforeRequest将在请求发起之前执行 */
    // 发送GET请求，获取响应
    rsp, _, err = poc.HTTP(\`\`) /* 这里可以替换为你需要的请求 */
    if err != nil {
        return req
    }
    // 获取GET响应的Set-Cookie
    cookie = poc.GetHTTPPacketHeader(rsp, "Set-Cookie")
    node, err = xpath.LoadHTMLDocument(rsp)
    if err != nil {
        return req
    }
    // 通过xpath语法获取token的值
    tokenNode = xpath.FindOne(node, "//input[@name='token']")
    if tokenNode == nil {
        return req
    }
    token = xpath.SelectAttr(tokenNode, "value")
    // 替换token
    req = req.ReplaceAll("__TOKEN__", token)
    // 替换cookie
    req = poc.AppendHTTPPacketHeader(req, "Cookie", cookie)
    return req
}`,
        isDefault: true
    },
    {
        name: "破解 Signature",
        temp: `decode3 = func(param) {
    key = \`1234123412341234\`
    usernameDict = ["admin"] /* 用户字典 */
    passwordDict = ["admin", "123456", "admin123", "88888888", "666666"] /* 密码字典 */
    resultList = []

    for username in usernameDict {
        for password in passwordDict {
            data = f\`username=\${username}&password=\${password}\`
            signature = codec.EncodeToHex(codec.HmacSha256(key, data))
            m = {
                "signature": signature,
                "key": "31323334313233343132333431323334",
                "username": username,
                "password": password
            }
            res = json.dumps(m)
            resultList.Append(res)
        }
    }
    return resultList
}`,
        isDefault: true
    },
    {
        name: "第三方验证码绕过",
        temp: `beforeRequest = func(req) {
    img_packet = \`\`
    img_packet_rsp, _ = poc.HTTP(img_packet, poc.https(true))~

    result = re2.FindGroup(img_packet_rsp, \`,"img":"(?P&lt;img_data&gt;.*)"}}\`)
    b64_img = str.ParamsGetOr(result, "img_data", "nope")

    result = re2.FindGroup(img_packet_rsp, \`"vi":"(?P&lt;img_id&gt;.*)","img"\`)
    img_id = str.ParamsGetOr(result, "img_id", "nope")
    ocr_packet = \`\`
    
    ocr_packet = ocr_packet + b64_img
    img_data, _ = poc.HTTP(ocr_packet)~
    ocr_result = string(poc.GetHTTPPacketBody(img_data))
    req = re.ReplaceAll(req, \`__ocr__\`, codec.EncodeBase64(ocr_result))
    req = re.ReplaceAll(req, \`__vi__\`, img_id)
    return []byte(req)
}`,
        isDefault: true
    }
]

export const defaultWebFuzzerPageInfo: WebFuzzerPageInfoProps = {
    pageId: "",
    advancedConfigValue: cloneDeep(defaultAdvancedConfigValue),
    advancedConfigShow: null,
    request: defaultPostTemplate,
    variableActiveKeys: undefined,
    hotPatchCode: HotPatchDefaultContent
}
// 注：此处顺序为倒序（新增DefaultDescription记得带-fixed，此处为标识固定项）
export const defaultLabel: LabelDataProps[] = [
    {
        DefaultDescription: "调用codec模块保存的codec flow-fixed",
        Description: "调用codec模块保存的codec flow",
        Label: "{{codecflow(name|abc)}}"
    },
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
