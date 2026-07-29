/**
 * @description 此文件是 HTTPFuzzerPage 页面的通用常用变量
 * @author luoluo
 */

import { LabelDataProps } from '@/pages/fuzzer/HTTPFuzzerEditorMenu'
import { AdvancedConfigShowProps, FuzzerResponse } from '@/pages/fuzzer/HTTPFuzzerPage'
import { AdvancedConfigValueProps } from '@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfigType'
import { WebFuzzerPageInfoProps } from '@/store/pageInfo'
import cloneDeep from 'lodash/cloneDeep'

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
  rule: true,
  'hot-patch': true,
  'api-doc': true,
  ai: true,
}

export const defaultAdvancedConfigValue: AdvancedConfigValueProps = {
  // 请求包配置
  fuzzTagMode: 'standard',
  fuzzTagSyncIndex: false,
  isHttps: false,
  isGmTLS: false,
  randomJA3: false,
  noFixContentLength: false,
  noSystemProxy: false,
  disableUseConnPool: false,
  disableHotPatch: true,
  maxBodySize: 5,
  sNI: '',
  overwriteSNI: 'auto',
  resNumlimit: DefFuzzerTableMaxData,
  actualHost: '',
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
  proxyRuleId: '',
  minDelaySeconds: 0,
  maxDelaySeconds: 0,
  repeatTimes: 0,
  // 重试配置
  maxRetryTimes: 0,
  retry: true,
  noRetry: false,
  retryConfiguration: {
    statusCode: '',
    keyWord: '',
  },
  noRetryConfiguration: {
    statusCode: '',
    keyWord: '',
  },
  retryWaitSeconds: 0,
  retryMaxWaitSeconds: 0,
  // 重定向配置
  redirectCount: 3,
  noFollowRedirect: true,
  followJSRedirect: false,
  redirectConfiguration: {
    statusCode: '',
    keyWord: '',
  },
  noRedirectConfiguration: {
    statusCode: '',
    keyWord: '',
  },
  // dns config
  dnsServers: [],
  etcHosts: [],
  // 设置变量
  params: [{ Key: '', Value: '', Type: 'raw' }],
  methodGet: [
    {
      Key: '',
      Value: '',
    },
  ],
  methodPost: [
    {
      Key: '',
      Value: '',
    },
  ],
  cookie: [
    {
      Key: '',
      Value: '',
    },
  ],
  headers: [
    {
      Key: '',
      Value: '',
    },
  ],
  // 匹配器
  matchers: [],
  // 提取器
  extractors: [],
}

export const emptyFuzzer: FuzzerResponse = {
  BodyLength: 0,
  BodySimilarity: 0,
  ContentType: '',
  Count: 0,
  DurationMs: 0,
  HeaderSimilarity: 0,
  Headers: [],
  Host: '',
  IsHTTPS: false,
  MatchedByFilter: false,
  Method: '',
  Ok: false,
  Payloads: [],
  Reason: '',
  RequestRaw: new Uint8Array(),
  ResponseRaw: new Uint8Array(),
  StatusCode: 0,
  Timestamp: 0,
  UUID: '',

  DNSDurationMs: 0,
  TotalDurationMs: 0,
  TLSHandshakeDurationMs: 0,
  TCPDurationMs: 0,
  ConnectDurationMs: 0,
  ExtractedResults: [],
  MatchedByMatcher: false,
  HitColor: '',

  IsTooLargeResponse: false,
  TooLargeResponseHeaderFile: '',
  TooLargeResponseBodyFile: '',
  DisableRenderStyles: false,
  RuntimeID: '',
  Discard: false,

  IsAutoFixContentType: false,
  OriginalContentType: '',
  FixContentType: '',
  IsSetContentTypeOptions: false,
  RandomChunkedData: [],
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

// retryHandler 允许对重试的请求做处理，定义为 func(https bool, retryCount int,req []byte, rsp []byte, retry func(...[]byte))
// 本函数调用在 1.4.2-beta9 之后支持
// https 请求是否为https请求
// retryCount 此请求已重试次数
// req 请求
// rsp 响应
// retry 重试回调，调用此函数即可触发重试，可以接收一个新的请求包，用于使用修改后的请求包重试，若不传则会使用原来的请求包重试
/* 如需使用，取消注释修改内容即可
retryHandler = (https,retryCount, req, rsp,retry) => {
    // 如果响应码为405，则修改方法为 POST 重试
    if poc.GetStatusCodeFromResponse(rsp) == 405 {
       retry(poc.ReplaceHTTPPacketMethod(req,"POST"))
    }
    return
}
*/

// customFailureChecker 允许自定义失败检查器，即使请求成功也可以将其标记为失败，定义为 func(https bool, req []byte, rsp []byte, fail func(string))
// https 请求是否为https请求
// req 请求数据
// rsp 响应数据
// fail 失败回调函数，调用后会将请求标记为失败
// 本函数调用在 1.4.2-beta9 之后支持
/** 如需使用，取消注释修改内容即可
customFailureChecker = func(https, req, rsp, fail) {
    // 检查响应内容，如果包含错误信息则标记为失败
    // if string(rsp).Contains("error") {
    //     fail("响应包含错误信息")
    // }

    // 检查状态码，如果是5xx错误则标记为失败
    // statusCode = poc.GetStatusCodeFromResponse(rsp)
    // if statusCode >= 500 {
    //     fail("服务器内部错误: " + sprint(statusCode))
    // }

    // 检查响应长度，如果过短可能是错误页面
    // if len(rsp) < 100 {
    //     fail("响应内容过短，可能是错误页面")
    // }
}
*/
`

export const HotPatchTempDefault = [
  {
    name: '响应解密（AES-CBC/Hex）',
    nameUi: 'HTTPFuzzerHotPatch.response_decrypt_aes_cbc_hex',
    temp: `// 响应解密模板 - 适用于响应 body 为 Hex 编码的 AES-CBC 密文
// key / iv 使用 Base64 编码，请替换为实际值
key = "MTIzNDU2Nzg5MDEyMzQ1Ng=="  /* Base64("1234567890123456") */
iv = "MTIzNDU2Nzg5MDEyMzQ1Ng=="
key = codec.DecodeBase64(key)~
iv = codec.DecodeBase64(iv)~

hostFilter = ""  /* 仅解密指定 Host 的响应，留空则解密所有 */

decrypt = func(req, rsp) {
    if hostFilter != "" {
        host = poc.GetHTTPPacketHeader(req, "Host")
        if host != hostFilter {
            return rsp
        }
    }
    body = poc.GetHTTPPacketBody(rsp)
    body = codec.DecodeHex(body)~
    body = codec.AESCBCDecryptWithPKCS7Padding(key, body, iv)~
    rsp = poc.ReplaceHTTPPacketBody(rsp, body)

    /* 若响应头中有需解密的字段，可取消注释并修改头名： */
    // headerParam = poc.GetHTTPPacketHeader(rsp, "headerParam")
    // if headerParam != "" {
    //     headerParam = codec.DecodeHex(headerParam)~
    //     headerParam = codec.AESCBCDecryptWithPKCS7Padding(key, headerParam, iv)~
    //     rsp = poc.ReplaceHTTPPacketHeader(rsp, "headerParam", headerParam)
    // }
    return rsp
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    return decrypt(req, rsp)
}`,
    isDefault: true,
  },
  {
    name: '爆破 AES-CBC',
    nameUi: 'HTTPFuzzerHotPatch.bruteforce_aes_cbc',
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
    isDefault: true,
  },
  {
    name: '爆破 RSA-OAEP',
    nameUi: 'HTTPFuzzerHotPatch.bruteforce_rsa_oaep',
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
    isDefault: true,
  },
  {
    name: '爆破 CSRF（带有保护用 token）',
    nameUi: 'HTTPFuzzerHotPatch.bruteforce_csrf_with_token',
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
    isDefault: true,
  },
  {
    name: '破解 Signature',
    nameUi: 'HTTPFuzzerHotPatch.crack_signature',
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
    isDefault: true,
  },
  {
    name: '第三方验证码绕过',
    nameUi: 'HTTPFuzzerHotPatch.third_party_captcha_bypass',
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
    isDefault: true,
  },
  {
    name: '[国密] 响应解密 SM4-CBC/Base64',
    nameUi: 'HTTPFuzzerHotPatch.response_decrypt_sm4_cbc_base64',
    temp: `// 响应解密模板 - 适用于响应 body 为 Base64 编码的国密 SM4-CBC 密文
// key / iv 使用 Base64 编码，请替换为实际值
key = "MTIzNDU2Nzg5MDEyMzQ1Ng=="  /* Base64("1234567890123456") */
iv = "MTIzNDU2Nzg5MDEyMzQ1Ng=="
key = codec.DecodeBase64(key)~
iv = codec.DecodeBase64(iv)~

hostFilter = ""  /* 仅解密指定 Host 的响应，留空则解密所有 */

decryptSm4Response = func(req, rsp) {
    if hostFilter != "" {
        host = poc.GetHTTPPacketHeader(req, "Host")
        if host != hostFilter {
            return rsp
        }
    }
    body = poc.GetHTTPPacketBody(rsp)
    body = codec.DecodeBase64(body)~
    body = codec.Sm4CBCDecrypt(key, body, iv)~
    return poc.ReplaceHTTPPacketBody(rsp, body)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    return decryptSm4Response(req, rsp)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start sm4 cbc response decrypt self test")

    plaintext = \`{"code":0,"msg":"ok","data":{"id":1}}\`
    cipherBytes = codec.Sm4CBCEncrypt(key, plaintext, iv)~
    cipherBase64 = codec.EncodeBase64(cipherBytes)

    mockReq = \`GET /api/user HTTP/1.1
Host: test.local
User-Agent: yak

\`
    mockRsp = \`HTTP/1.1 200 OK
Content-Type: application/json

\` + cipherBase64

    decRsp = afterRequest(true, []byte(mockReq), []byte(mockReq), []byte(mockRsp), []byte(mockRsp))
    decBody = poc.GetHTTPPacketBody(decRsp)
    log.info("decrypted body: " + string(decBody))
    assert string(decBody) == plaintext, "sm4 cbc response decrypt mismatch"

    log.info("sm4 cbc response decrypt self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[国密] 请求&响应 SM4-CBC 双向加解密',
    nameUi: 'HTTPFuzzerHotPatch.bidirectional_sm4_cbc',
    temp: `// 双向 SM4-CBC 加解密 - beforeRequest 加密请求体, afterRequest 解密响应体
// key / iv 使用 Base64 编码，请替换为实际值
sm4Key = "MTIzNDU2Nzg5MDEyMzQ1Ng=="  /* Base64("1234567890123456") */
sm4Iv = "MTIzNDU2Nzg5MDEyMzQ1Ng=="
sm4Key = codec.DecodeBase64(sm4Key)~
sm4Iv = codec.DecodeBase64(sm4Iv)~

beforeRequest = func(https, originReq, req) {
    body = poc.GetHTTPPacketBody(req)
    if len(body) == 0 {
        return req
    }
    cipherBytes = codec.Sm4CBCEncrypt(sm4Key, body, sm4Iv)~
    cipherText = codec.EncodeBase64(cipherBytes)
    return poc.ReplaceHTTPPacketBody(req, cipherText)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    body = poc.GetHTTPPacketBody(rsp)
    if len(body) == 0 {
        return rsp
    }
    cipherBytes = codec.DecodeBase64(body)~
    plain = codec.Sm4CBCDecrypt(sm4Key, cipherBytes, sm4Iv)~
    return poc.ReplaceHTTPPacketBody(rsp, plain)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start sm4 cbc bidirectional self test")

    plainReqBody = \`{"username":"admin","password":"123456"}\`
    mockReq = \`POST /api/login HTTP/1.1
Host: test.local
Content-Type: application/json

\` + plainReqBody

    encReq = beforeRequest(true, []byte(mockReq), []byte(mockReq))
    encBody = poc.GetHTTPPacketBody(encReq)
    log.info("encrypted req body base64: " + string(encBody))
    cipherBytes = codec.DecodeBase64(encBody)~
    plainBack = codec.Sm4CBCDecrypt(sm4Key, cipherBytes, sm4Iv)~
    assert string(plainBack) == plainReqBody, "request encrypt mismatch"

    plainRspBody = \`{"code":0,"data":{"token":"abc.def.ghi"}}\`
    encRspBytes = codec.Sm4CBCEncrypt(sm4Key, plainRspBody, sm4Iv)~
    mockRsp = \`HTTP/1.1 200 OK
Content-Type: application/json

\` + codec.EncodeBase64(encRspBytes)

    decRsp = afterRequest(true, []byte(mockReq), []byte(mockReq), []byte(mockRsp), []byte(mockRsp))
    decBody = poc.GetHTTPPacketBody(decRsp)
    log.info("decrypted rsp body: " + string(decBody))
    assert string(decBody) == plainRspBody, "response decrypt mismatch"

    log.info("sm4 cbc bidirectional self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[国密-爆破] SM4-CBC 字典加密爆破',
    nameUi: 'HTTPFuzzerHotPatch.bruteforce_sm4_cbc',
    temp: `// SM4-CBC 字典爆破 - 输出加密后的字典数组供 Fuzzer 替换
decodeSm4 = func(param) {
    key = codec.DecodeHex("31323334353637383930313233343536")~  /* 16 字节密钥 */
    iv = codec.DecodeHex("61626364656667686162636465666768")~   /* 16 字节 IV */
    usernameDict = ["admin"]
    passwordDict = ["admin", "123456", "admin123", "88888888", "666666"]
    resultList = []
    for username in usernameDict {
        for password in passwordDict {
            m = {"username": username, "password": password}
            jsonInput = json.dumps(m)
            cipherBytes = codec.Sm4CBCEncrypt(key, jsonInput, iv)~
            resultList.Append(codec.EncodeBase64(cipherBytes))
        }
    }
    return resultList
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start sm4 cbc bruteforce self test")

    payloads = decodeSm4("placeholder")
    log.info(sprintf("generated payload count: %d", len(payloads)))
    assert len(payloads) == 5, "should generate 5 payloads"

    key = codec.DecodeHex("31323334353637383930313233343536")~
    iv = codec.DecodeHex("61626364656667686162636465666768")~

    for p in payloads {
        cipherBytes = codec.DecodeBase64(p)~
        plain = codec.Sm4CBCDecrypt(key, cipherBytes, iv)~
        plainStr = string(plain)
        log.info("decrypted payload: " + plainStr)
        parsed = json.loads(plainStr)
        assert parsed["username"] == "admin", "username mismatch"
        assert parsed["password"] != "", "password should not be empty"
    }

    log.info("sm4 cbc bruteforce self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[国密-爆破] SM2 公钥加密字典爆破',
    nameUi: 'HTTPFuzzerHotPatch.bruteforce_sm2',
    temp: `// SM2 公钥加密字典爆破 - 默认使用 C1C3C2 排列（国密标准）
// 请将下方 publicKeyPem 替换为目标系统的 SM2 公钥
sm2PublicKeyPem = \`-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoEcz1UBgi0DQgAE4E3hKxSesB6qTLcdty+DkfUOEQns
S8TgE/314ha5cBaTdux3yKTWfUficpWqfdWMu15ZOX0VqIdrtb8Py1kwdA==
-----END PUBLIC KEY-----\`

decodeSm2 = func(param) {
    usernameDict = ["admin"]
    passwordDict = ["admin", "123456", "admin123", "88888888", "666666"]
    resultList = []
    for username in usernameDict {
        for password in passwordDict {
            m = {"username": username, "password": password}
            jsonInput = json.dumps(m)
            cipherBytes = codec.Sm2EncryptC1C3C2([]byte(sm2PublicKeyPem), jsonInput)~
            resultList.Append(codec.EncodeBase64(cipherBytes))
        }
    }
    return resultList
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start sm2 bruteforce self test")

    priv, pub = codec.Sm2GeneratePemKeyPair()~
    sm2PublicKeyPem = string(pub)

    decodeSm2Test = func(param) {
        usernameDict = ["admin"]
        passwordDict = ["admin", "123456", "admin123"]
        resultList = []
        for username in usernameDict {
            for password in passwordDict {
                m = {"username": username, "password": password}
                jsonInput = json.dumps(m)
                cipherBytes = codec.Sm2EncryptC1C3C2([]byte(sm2PublicKeyPem), jsonInput)~
                resultList.Append(codec.EncodeBase64(cipherBytes))
            }
        }
        return resultList
    }

    payloads = decodeSm2Test("placeholder")
    log.info(sprintf("generated payload count: %d", len(payloads)))
    assert len(payloads) == 3, "should generate 3 payloads"

    for p in payloads {
        cipherBytes = codec.DecodeBase64(p)~
        plain = codec.Sm2DecryptC1C3C2(priv, cipherBytes)~
        plainStr = string(plain)
        log.info("decrypted payload: " + plainStr)
        parsed = json.loads(plainStr)
        assert parsed["username"] == "admin", "username mismatch"
    }

    log.info("sm2 bruteforce self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[AES] 响应解密 AES-GCM/Base64',
    nameUi: 'HTTPFuzzerHotPatch.response_decrypt_aes_gcm_base64',
    temp: `// AES-GCM 响应解密 - nonce 长度 12 字节
// key / nonce 使用 Base64 编码，请替换为实际值
aesKey = "MTIzNDU2Nzg5MDEyMzQ1Ng=="  /* Base64("1234567890123456") - AES-128 */
aesNonce = "MTIzNDU2Nzg5MDEy"        /* Base64("123456789012") - 12 字节 */
aesKey = codec.DecodeBase64(aesKey)~
aesNonce = codec.DecodeBase64(aesNonce)~

decryptAesGcm = func(req, rsp) {
    body = poc.GetHTTPPacketBody(rsp)
    if len(body) == 0 {
        return rsp
    }
    cipherBytes = codec.DecodeBase64(body)~
    plain = codec.AESGCMDecryptWithNonceSize12(aesKey, cipherBytes, aesNonce)~
    return poc.ReplaceHTTPPacketBody(rsp, plain)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    return decryptAesGcm(req, rsp)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start aes gcm response decrypt self test")

    plaintext = \`{"code":0,"data":{"items":[1,2,3]}}\`
    cipherBytes = codec.AESGCMEncryptWithNonceSize12(aesKey, plaintext, aesNonce)~
    cipherB64 = codec.EncodeBase64(cipherBytes)

    mockRsp = \`HTTP/1.1 200 OK
Content-Type: application/json

\` + cipherB64

    decRsp = afterRequest(true, []byte(""), []byte(""), []byte(mockRsp), []byte(mockRsp))
    decBody = poc.GetHTTPPacketBody(decRsp)
    log.info("decrypted body: " + string(decBody))
    assert string(decBody) == plaintext, "aes gcm decrypt mismatch"

    log.info("aes gcm response decrypt self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[AES] 响应解密 AES-ECB/Base64',
    nameUi: 'HTTPFuzzerHotPatch.response_decrypt_aes_ecb_base64',
    temp: `// AES-ECB 响应解密 - 无需 IV
// key 使用 Base64 编码，请替换为实际值
aesEcbKey = "MTIzNDU2Nzg5MDEyMzQ1Ng=="  /* Base64("1234567890123456") - AES-128 */
aesEcbKey = codec.DecodeBase64(aesEcbKey)~

decryptAesEcb = func(req, rsp) {
    body = poc.GetHTTPPacketBody(rsp)
    if len(body) == 0 {
        return rsp
    }
    cipherBytes = codec.DecodeBase64(body)~
    plain = codec.AESECBDecrypt(aesEcbKey, cipherBytes, nil)~
    return poc.ReplaceHTTPPacketBody(rsp, plain)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    return decryptAesEcb(req, rsp)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start aes ecb response decrypt self test")

    plaintext = \`{"code":0,"msg":"ok","ts":1700000000}\`
    cipherBytes = codec.AESECBEncrypt(aesEcbKey, plaintext, nil)~
    cipherB64 = codec.EncodeBase64(cipherBytes)

    mockRsp = \`HTTP/1.1 200 OK
Content-Type: application/json

\` + cipherB64

    decRsp = afterRequest(true, []byte(""), []byte(""), []byte(mockRsp), []byte(mockRsp))
    decBody = poc.GetHTTPPacketBody(decRsp)
    log.info("decrypted body: " + string(decBody))
    assert string(decBody) == plaintext, "aes ecb decrypt mismatch"

    log.info("aes ecb response decrypt self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[AES] 请求&响应 AES-CBC 双向加解密',
    nameUi: 'HTTPFuzzerHotPatch.bidirectional_aes_cbc',
    temp: `// 双向 AES-CBC 加解密 - beforeRequest 加密请求体, afterRequest 解密响应体
// key / iv 使用 Base64 编码，请替换为实际值
aesCbcKey = "MTIzNDU2Nzg5MDEyMzQ1Ng=="  /* Base64("1234567890123456") - AES-128 */
aesCbcIv = "MTIzNDU2Nzg5MDEyMzQ1Ng=="
aesCbcKey = codec.DecodeBase64(aesCbcKey)~
aesCbcIv = codec.DecodeBase64(aesCbcIv)~

beforeRequest = func(https, originReq, req) {
    body = poc.GetHTTPPacketBody(req)
    if len(body) == 0 {
        return req
    }
    cipherBytes = codec.AESCBCEncrypt(aesCbcKey, body, aesCbcIv)~
    cipherText = codec.EncodeBase64(cipherBytes)
    return poc.ReplaceHTTPPacketBody(req, cipherText)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    body = poc.GetHTTPPacketBody(rsp)
    if len(body) == 0 {
        return rsp
    }
    cipherBytes = codec.DecodeBase64(body)~
    plain = codec.AESCBCDecrypt(aesCbcKey, cipherBytes, aesCbcIv)~
    return poc.ReplaceHTTPPacketBody(rsp, plain)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start aes cbc bidirectional self test")

    plainReqBody = \`{"action":"transfer","amount":100,"to":"acct1"}\`
    mockReq = \`POST /api/pay HTTP/1.1
Host: bank.local
Content-Type: application/json

\` + plainReqBody

    encReq = beforeRequest(true, []byte(mockReq), []byte(mockReq))
    encBody = poc.GetHTTPPacketBody(encReq)
    log.info("encrypted req body base64: " + string(encBody))
    cipherBytes = codec.DecodeBase64(encBody)~
    plainBack = codec.AESCBCDecrypt(aesCbcKey, cipherBytes, aesCbcIv)~
    assert string(plainBack) == plainReqBody, "request encrypt mismatch"

    plainRspBody = \`{"code":0,"data":{"txn_id":"abc123"}}\`
    encRspBytes = codec.AESCBCEncrypt(aesCbcKey, plainRspBody, aesCbcIv)~
    mockRsp = \`HTTP/1.1 200 OK
Content-Type: application/json

\` + codec.EncodeBase64(encRspBytes)

    decRsp = afterRequest(true, []byte(mockReq), []byte(mockReq), []byte(mockRsp), []byte(mockRsp))
    decBody = poc.GetHTTPPacketBody(decRsp)
    log.info("decrypted rsp body: " + string(decBody))
    assert string(decBody) == plainRspBody, "response decrypt mismatch"

    log.info("aes cbc bidirectional self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[签名-爆破] HMAC-MD5 签名',
    nameUi: 'HTTPFuzzerHotPatch.bruteforce_hmac_md5',
    temp: `// HMAC-MD5 签名爆破 - 输出包含 signature 的完整 JSON 字典数组
decodeHmacMd5 = func(param) {
    hmacKey = \`1234567890abcdef\`  /* 替换为目标系统的 HMAC 密钥 */
    usernameDict = ["admin"]
    passwordDict = ["admin", "123456", "admin123", "88888888", "666666"]
    resultList = []
    for username in usernameDict {
        for password in passwordDict {
            data = f"username=\${username}&password=\${password}"
            signature = codec.EncodeToHex(codec.HmacMD5(hmacKey, data))
            m = {
                "username": username,
                "password": password,
                "signature": signature,
            }
            resultList.Append(json.dumps(m))
        }
    }
    return resultList
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hmac md5 bruteforce self test")

    payloads = decodeHmacMd5("placeholder")
    log.info(sprintf("generated payload count: %d", len(payloads)))
    assert len(payloads) == 5, "should generate 5 payloads"

    hmacKey = \`1234567890abcdef\`
    for p in payloads {
        parsed = json.loads(p)
        username = parsed["username"]
        password = parsed["password"]
        gotSig = parsed["signature"]
        data = f"username=\${username}&password=\${password}"
        wantSig = codec.EncodeToHex(codec.HmacMD5(hmacKey, data))
        log.info("got sig: " + gotSig + " expect: " + wantSig)
        assert gotSig == wantSig, "signature mismatch"
        assert len(gotSig) == 32, "hmac md5 hex length should be 32"
    }

    log.info("hmac md5 bruteforce self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[签名] AppKey+Timestamp+Nonce 三方签名生成',
    nameUi: 'HTTPFuzzerHotPatch.sign_appkey_timestamp_nonce',
    temp: `// AppKey + Timestamp + Nonce 三方签名 - beforeRequest 自动注入
appKey = "demo-appkey-001"
appSecret = "S3cr3t!@#example"

genNonce = func(n) {
    return codec.EncodeToHex(codec.RandBytes(n))
}

beforeRequest = func(https, originReq, req) {
    timestamp = sprintf("%d", time.Now().Unix())
    nonce = genNonce(8)
    body = string(poc.GetHTTPPacketBody(req))
    signRaw = appKey + timestamp + nonce + body
    sign = codec.EncodeToHex(codec.HmacSha256(appSecret, signRaw))

    req = poc.AppendHTTPPacketQueryParam(req, "X-App-Key", appKey)
    req = poc.AppendHTTPPacketQueryParam(req, "X-Timestamp", timestamp)
    req = poc.AppendHTTPPacketQueryParam(req, "X-Nonce", nonce)
    req = poc.AppendHTTPPacketQueryParam(req, "X-Sign", sign)
    return req
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start appkey timestamp nonce sign self test")

    mockReq = \`POST /api/order HTTP/1.1
Host: api.example.com
Content-Type: application/json

{"product_id":"P001","quantity":2}\`

    signedReq = beforeRequest(true, []byte(mockReq), []byte(mockReq))
    signedStr = string(signedReq)
    log.info("signed request:\\n" + signedStr)

    gotAppKey = poc.GetHTTPPacketQueryParam(signedReq, "X-App-Key")
    gotTimestamp = poc.GetHTTPPacketQueryParam(signedReq, "X-Timestamp")
    gotNonce = poc.GetHTTPPacketQueryParam(signedReq, "X-Nonce")
    gotSign = poc.GetHTTPPacketQueryParam(signedReq, "X-Sign")

    assert gotAppKey == appKey, "appkey mismatch"
    assert gotTimestamp != "", "timestamp should not be empty"
    assert gotNonce != "" && len(gotNonce) == 16, "nonce should be 16 hex chars"
    assert gotSign != "" && len(gotSign) == 64, "sign should be 64 hex chars"

    body = string(poc.GetHTTPPacketBody(signedReq))
    signRaw = appKey + gotTimestamp + gotNonce + body
    wantSign = codec.EncodeToHex(codec.HmacSha256(appSecret, signRaw))
    log.info("got sign: " + gotSign)
    log.info("expect sign: " + wantSign)
    assert gotSign == wantSign, "sign verification failed"

    log.info("appkey timestamp nonce sign self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[签名] Body MD5/SM3 防篡改签名',
    nameUi: 'HTTPFuzzerHotPatch.sign_body_md5_sm3',
    temp: `// Body Hash 防篡改签名 - 计算 body 哈希注入到 header
// 算法可选: "md5" / "sm3" / "sha256"
bodyDigestAlgo = "sm3"

calcBodyDigest = func(algo, body) {
    if algo == "md5" {
        return codec.Md5(body)
    }
    if algo == "sha256" {
        return codec.EncodeToHex(codec.Sha256(body))
    }
    return codec.EncodeToHex(codec.Sm3(body))
}

beforeRequest = func(https, originReq, req) {
    body = poc.GetHTTPPacketBody(req)
    digest = calcBodyDigest(bodyDigestAlgo, body)
    req = poc.ReplaceHTTPPacketHeader(req, "X-Body-Digest", digest)
    req = poc.ReplaceHTTPPacketHeader(req, "X-Digest-Algo", bodyDigestAlgo)
    return req
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start body digest self test")

    plainBody = \`{"order_id":"O20260526","amount":99.99}\`
    mockReq = \`POST /api/order HTTP/1.1
Host: api.example.com
Content-Type: application/json

\` + plainBody

    signedReq = beforeRequest(true, []byte(mockReq), []byte(mockReq))
    signedStr = string(signedReq)
    log.info("signed request:\\n" + signedStr)

    gotDigest = poc.GetHTTPPacketHeader(signedReq, "X-Body-Digest")
    gotAlgo = poc.GetHTTPPacketHeader(signedReq, "X-Digest-Algo")
    log.info("got digest: " + gotDigest + " algo: " + gotAlgo)
    assert gotAlgo == "sm3", "algo mismatch"
    assert len(gotDigest) == 64, "sm3 hex length should be 64"

    expectDigest = codec.EncodeToHex(codec.Sm3(plainBody))
    assert gotDigest == expectDigest, "digest mismatch"

    log.info("body digest self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[JWT] HS256 重签名',
    nameUi: 'HTTPFuzzerHotPatch.jwt_hs256_resign',
    temp: `// JWT HS256 重签名 - 修改 payload 后用已知 secret 重新签名
jwtSecret = []byte("mysecret")  /* 替换为目标系统的 HS256 secret */

mutateClaims = func(claims) {
    /* 在此处修改 payload，例如权限提升 */
    claims["role"] = "admin"
    claims["isAdmin"] = true
    return claims
}

resignJwt = func(token) {
    parts = str.Split(token, ".")
    if len(parts) != 3 {
        return token
    }
    payloadBytes = codec.DecodeBase64Url(parts[1])~
    claims = json.loads(string(payloadBytes))
    claims = mutateClaims(claims)
    newToken = jwt.JWTGenerate("HS256", claims, jwtSecret)~
    return newToken
}

beforeRequest = func(https, originReq, req) {
    auth = poc.GetHTTPPacketHeader(req, "Authorization")
    if auth == "" {
        return req
    }
    if !str.HasPrefix(auth, "Bearer ") {
        return req
    }
    token = str.TrimPrefix(auth, "Bearer ")
    newToken = resignJwt(token)
    return poc.ReplaceHTTPPacketHeader(req, "Authorization", "Bearer "+newToken)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start jwt hs256 resign self test")

    origClaims = {"sub": "alice", "role": "user"}
    origToken = jwt.JWTGenerate("HS256", origClaims, jwtSecret)~
    log.info("orig token: " + origToken)

    mockReq = \`GET /api/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer \` + origToken + \`

\`

    signedReq = beforeRequest(true, []byte(mockReq), []byte(mockReq))
    log.info("modified request:\\n" + string(signedReq))

    newAuth = poc.GetHTTPPacketHeader(signedReq, "Authorization")
    assert str.HasPrefix(newAuth, "Bearer "), "auth should start with Bearer"
    newToken = str.TrimPrefix(newAuth, "Bearer ")
    log.info("new token: " + newToken)
    assert newToken != origToken, "token should be different"

    parts = str.Split(newToken, ".")
    assert len(parts) == 3, "jwt should have 3 parts"
    payloadBytes = codec.DecodeBase64Url(parts[1])~
    parsedClaims = json.loads(string(payloadBytes))
    log.info("new payload: " + string(payloadBytes))
    assert parsedClaims["role"] == "admin", "role should be admin"
    assert parsedClaims["isAdmin"] == true, "isAdmin should be true"
    assert parsedClaims["sub"] == "alice", "sub should be preserved"

    log.info("jwt hs256 resign self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[会话] 自动登录注入 Authorization Token',
    nameUi: 'HTTPFuzzerHotPatch.session_auto_login_token',
    temp: `// 自动登录获取 token 并注入到 Authorization 请求头
// 请修改下方 loginRequest 为目标系统的真实登录请求
loginRequest = \`POST /api/login HTTP/1.1
Host: 127.0.0.1:8080
Content-Type: application/json

{"username":"admin","password":"admin123"}\`

loginUseHttps = false  /* 登录接口是否走 https */
tokenJsonPath = "data.access_token"  /* 从响应 body JSON 中提取 token 的路径，用点号分隔 */

cachedToken = ""

extractByJsonPath = func(obj, path) {
    parts = str.Split(path, ".")
    cur = obj
    for p in parts {
        if cur == nil {
            return ""
        }
        cur = cur[p]
    }
    return sprintf("%v", cur)
}

fetchToken = func() {
    rsp, _, err = poc.HTTP(loginRequest, poc.https(loginUseHttps), poc.timeout(10))
    if err != nil {
        log.error("login request failed: " + sprintf("%v", err))
        return ""
    }
    body = poc.GetHTTPPacketBody(rsp)
    parsed = json.loads(string(body))
    return extractByJsonPath(parsed, tokenJsonPath)
}

beforeRequest = func(https, originReq, req) {
    if cachedToken == "" {
        cachedToken = fetchToken()
    }
    if cachedToken == "" {
        return req
    }
    return poc.ReplaceHTTPPacketHeader(req, "Authorization", "Bearer "+cachedToken)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start auto login token self test")

    port = os.GetRandomAvailableTCPPort()
    host = "127.0.0.1"
    loginCount = {"n": 0}
    expectedToken = "mock-token-" + codec.EncodeToHex(codec.RandBytes(4))

    go func {
        httpserver.Serve(host, port,
            httpserver.routeHandler("/api/login", (w, req) => {
                loginCount["n"] = loginCount["n"] + 1
                w.Header().Set("Content-Type", "application/json")
                rspJson = json.dumps({
                    "code": 0,
                    "data": {"access_token": expectedToken},
                })
                w.Write(rspJson)
            }),
            httpserver.handler((w, req) => {
                w.Write("fallback")
            }),
        )
    }
    os.WaitConnect(str.HostPort(host, port), 4)

    loginRequest = sprintf(\`POST /api/login HTTP/1.1
Host: %s:%d
Content-Type: application/json

{"username":"admin","password":"admin123"}\`, host, port)
    loginUseHttps = false
    cachedToken = ""

    mockReq = \`GET /api/profile HTTP/1.1
Host: api.example.com

\`

    signedReq1 = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    auth1 = poc.GetHTTPPacketHeader(signedReq1, "Authorization")
    log.info("first call auth: " + auth1)
    assert auth1 == "Bearer "+expectedToken, "auth mismatch first call"
    assert loginCount["n"] == 1, "should login once"

    signedReq2 = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    auth2 = poc.GetHTTPPacketHeader(signedReq2, "Authorization")
    log.info("second call auth: " + auth2)
    assert auth2 == "Bearer "+expectedToken, "auth mismatch second call"
    assert loginCount["n"] == 1, "should NOT login again due to cache"

    log.info("auto login token self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[工具] Hash fuzz tag (MD5/SHA1/SHA256/SM3)',
    nameUi: 'HTTPFuzzerHotPatch.tool_hash_fuzztag',
    temp: `// Hash fuzz tag - 第一个参数是算法名，第二个参数是明文
hash = func(param) {
    parts = str.SplitN(param, ",", 2)
    if len(parts) < 2 {
        return [""]
    }
    algo = str.ToLower(str.TrimSpace(parts[0]))
    data = parts[1]
    if algo == "md5" {
        return [codec.Md5(data)]
    }
    if algo == "sha1" {
        return [codec.Sha1(data)]
    }
    if algo == "sha256" {
        return [codec.Sha256(data)]
    }
    if algo == "sha512" {
        return [codec.Sha512(data)]
    }
    if algo == "sm3" {
        return [codec.EncodeToHex(codec.Sm3(data))]
    }
    return [""]
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hash fuzz tag self test")

    md5Result = hash("md5,hello")[0]
    log.info("md5(hello) = " + md5Result)
    assert md5Result == "5d41402abc4b2a76b9719d911017c592", "md5 mismatch"

    sha1Result = hash("sha1,hello")[0]
    log.info("sha1(hello) = " + sha1Result)
    assert sha1Result == "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d", "sha1 mismatch"

    sha256Result = hash("sha256,hello")[0]
    log.info("sha256(hello) = " + sha256Result)
    assert sha256Result == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "sha256 mismatch"

    sm3Result = hash("sm3,abc")[0]
    log.info("sm3(abc) = " + sm3Result)
    assert sm3Result == "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0", "sm3 mismatch"

    sha512Result = hash("sha512,hello")[0]
    log.info("sha512(hello) = " + sha512Result)
    assert len(sha512Result) == 128, "sha512 should be 128 hex chars"

    unknown = hash("md4,abc")[0]
    assert unknown == "", "unknown algo should return empty"

    log.info("hash fuzz tag self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[工具] 时间戳 fuzz tag',
    nameUi: 'HTTPFuzzerHotPatch.tool_timestamp_fuzztag',
    temp: `// 时间戳 fuzz tag - 支持 s / ms / ns / date 四种格式
ts = func(param) {
    fmtKey = str.ToLower(str.TrimSpace(param))
    n = time.Now()
    if fmtKey == "ms" {
        return [sprintf("%d", n.UnixMilli())]
    }
    if fmtKey == "ns" {
        return [sprintf("%d", n.UnixNano())]
    }
    if fmtKey == "date" {
        return [n.Format("2006-01-02 15:04:05")]
    }
    /* default: seconds */
    return [sprintf("%d", n.Unix())]
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start timestamp fuzz tag self test")

    sec = ts("s")[0]
    log.info("seconds: " + sec)
    secNum = parseInt(sec)
    assert secNum > 1700000000, "seconds value too small"
    assert secNum < 9999999999, "seconds value too large"

    msStr = ts("ms")[0]
    log.info("milliseconds: " + msStr)
    msNum = parseInt(msStr)
    assert msNum > 1700000000000, "ms value too small"
    assert len(msStr) == 13, "ms hex length should be 13 digits"

    nsStr = ts("ns")[0]
    log.info("nanoseconds: " + nsStr)
    assert len(nsStr) >= 16, "ns should have at least 16 digits"

    dateStr = ts("date")[0]
    log.info("date: " + dateStr)
    assert len(dateStr) == 19, "date format YYYY-MM-DD HH:MM:SS"

    defaultStr = ts("")[0]
    log.info("default(seconds): " + defaultStr)
    assert len(defaultStr) == 10, "default seconds length should be 10"

    log.info("timestamp fuzz tag self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[工具] UUID fuzz tag',
    nameUi: 'HTTPFuzzerHotPatch.tool_uuid_fuzztag',
    temp: `// UUID fuzz tag - 默认输出标准 UUID v4，传入 "nohyphen" 输出去掉连字符的 hex
uuidv4 = func(param) {
    raw = uuid()
    if str.ToLower(str.TrimSpace(param)) == "nohyphen" {
        return [str.ReplaceAll(raw, "-", "")]
    }
    return [raw]
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start uuid fuzz tag self test")

    u1 = uuidv4("")[0]
    log.info("uuid: " + u1)
    assert len(u1) == 36, "uuid length should be 36"
    assert str.Contains(u1, "-"), "uuid should contain hyphen"

    u2 = uuidv4("nohyphen")[0]
    log.info("uuid nohyphen: " + u2)
    assert len(u2) == 32, "nohyphen uuid length should be 32"
    assert !str.Contains(u2, "-"), "nohyphen uuid should not contain hyphen"

    /* 两次生成应该不同 */
    u3 = uuidv4("")[0]
    assert u3 != u1, "two uuids should be different"

    log.info("uuid fuzz tag self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[工具] 随机字符串 fuzz tag',
    nameUi: 'HTTPFuzzerHotPatch.tool_randstr_fuzztag',
    temp: `// 随机字符串 fuzz tag - 支持自定义长度和字符集
randstr = func(param) {
    parts = str.SplitN(param, ",", 2)
    n = 8
    if len(parts) >= 1 && str.TrimSpace(parts[0]) != "" {
        v = parseInt(str.TrimSpace(parts[0]))
        if v > 0 {
            n = v
        }
    }
    charset = "alnum"
    if len(parts) >= 2 {
        cs = str.ToLower(str.TrimSpace(parts[1]))
        if cs != "" {
            charset = cs
        }
    }

    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    if charset == "digit" {
        alphabet = "0123456789"
    } else if charset == "lower" {
        alphabet = "abcdefghijklmnopqrstuvwxyz"
    } else if charset == "upper" {
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    } else if charset == "alpha" {
        alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    } else if charset == "hex" {
        alphabet = "0123456789abcdef"
    }

    poolSize = len(alphabet)
    buf = make([]byte, 0)
    for i = 0; i < n; i++ {
        idx = randn(0, poolSize-1)
        buf = append(buf, alphabet[idx])
    }
    return [string(buf)]
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start randstr fuzz tag self test")

    s1 = randstr("")[0]
    log.info("default(8 alnum): " + s1)
    assert len(s1) == 8, "default length should be 8"

    s2 = randstr("16")[0]
    log.info("len 16 alnum: " + s2)
    assert len(s2) == 16, "length should be 16"

    s3 = randstr("10,digit")[0]
    log.info("digit only: " + s3)
    assert len(s3) == 10, "digit length"
    assert re.Match("^[0-9]+$", s3), "digit charset"

    s4 = randstr("12,hex")[0]
    log.info("hex only: " + s4)
    assert len(s4) == 12, "hex length"
    assert re.Match("^[0-9a-f]+$", s4), "hex charset"

    s5 = randstr("6,lower")[0]
    log.info("lower only: " + s5)
    assert len(s5) == 6, "lower length"
    assert re.Match("^[a-z]+$", s5), "lower charset"

    log.info("randstr fuzz tag self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[响应] customFailureChecker 自定义失败检查',
    nameUi: 'HTTPFuzzerHotPatch.response_custom_failure_checker',
    temp: `// 自定义失败检查 - 综合状态码、响应关键字、响应长度判断
failureKeywords = ["error", "exception", "ratelimit", "rate limit", "失败", "异常", "请稍后", "blocked"]
minBodySize = 50

customFailureChecker = func(https, req, rsp, fail) {
    statusCode = poc.GetStatusCodeFromResponse(rsp)
    if statusCode >= 500 {
        fail(sprintf("server error status %d", statusCode))
        return
    }

    body = poc.GetHTTPPacketBody(rsp)
    bodyStr = str.ToLower(string(body))
    for kw in failureKeywords {
        if str.Contains(bodyStr, str.ToLower(kw)) {
            fail(sprintf("response contains failure keyword: %s", kw))
            return
        }
    }

    if len(body) < minBodySize {
        fail(sprintf("response body too short: %d bytes", len(body)))
        return
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start custom failure checker self test")

    failReasonRef = {"reason": ""}
    failCb = func(reason) {
        failReasonRef["reason"] = reason
    }

    // 场景 1: 500 错误
    rsp500 = \`HTTP/1.1 500 Internal Server Error
Content-Type: text/plain
Content-Length: 100

This is a long enough error body to bypass the size check at least.\`
    failReasonRef["reason"] = ""
    customFailureChecker(true, []byte(""), []byte(rsp500), failCb)
    log.info("case 500: " + failReasonRef["reason"])
    assert str.Contains(failReasonRef["reason"], "status 500"), "case 500 should fail"

    // 场景 2: 包含 error 关键字
    rspErr = \`HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 80

{"code":1,"msg":"some error happened in service","data":null,"trace":"xxx"}\`
    failReasonRef["reason"] = ""
    customFailureChecker(true, []byte(""), []byte(rspErr), failCb)
    log.info("case error: " + failReasonRef["reason"])
    assert str.Contains(failReasonRef["reason"], "error"), "case error should fail"

    // 场景 3: body 过短
    rspShort = \`HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 2

ok\`
    failReasonRef["reason"] = ""
    customFailureChecker(true, []byte(""), []byte(rspShort), failCb)
    log.info("case short: " + failReasonRef["reason"])
    assert str.Contains(failReasonRef["reason"], "too short"), "case short should fail"

    // 场景 4: 正常响应不应失败
    rspOk = \`HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 80

{"code":0,"data":{"user":"alice","email":"alice@example.com","level":5,"vip":true}}\`
    failReasonRef["reason"] = ""
    customFailureChecker(true, []byte(""), []byte(rspOk), failCb)
    log.info("case ok reason: " + failReasonRef["reason"])
    assert failReasonRef["reason"] == "", "case ok should NOT fail"

    log.info("custom failure checker self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[重试] retryHandler 智能重试',
    nameUi: 'HTTPFuzzerHotPatch.retry_smart_retry',
    temp: `// retryHandler - 根据响应状态码采用不同重试策略
retryHandler = func(https, retryCount, req, rsp, retry) {
    statusCode = poc.GetStatusCodeFromResponse(rsp)
    if statusCode == 405 {
        log.info(sprintf("retry: switch GET to POST (count=%d)", retryCount))
        retry(poc.ReplaceHTTPPacketMethod(req, "POST"))
        return
    }
    if statusCode == 429 {
        log.info(sprintf("retry: rate limited, sleep 1s (count=%d)", retryCount))
        sleep(1)
        retry()
        return
    }
    if statusCode == 401 || statusCode == 403 {
        log.info(sprintf("retry: %d denied, give up", statusCode))
        return
    }
    if statusCode >= 500 {
        log.info(sprintf("retry: %d server error, retry once (count=%d)", statusCode, retryCount))
        retry()
        return
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start smart retry self test")

    retryStat = {
        "called": 0,
        "lastReq": "",
    }
    retryCb = func(args...) {
        retryStat["called"] = retryStat["called"] + 1
        if len(args) > 0 {
            retryStat["lastReq"] = string(args[0])
        } else {
            retryStat["lastReq"] = ""
        }
    }

    // 场景 1: 405 应该切到 POST
    origReq = \`GET /api/data HTTP/1.1
Host: test.local

\`
    rsp405 = \`HTTP/1.1 405 Method Not Allowed
Content-Length: 0

\`
    retryStat["called"] = 0
    retryStat["lastReq"] = ""
    retryHandler(false, 1, []byte(origReq), []byte(rsp405), retryCb)
    log.info(sprintf("case 405: called=%d", retryStat["called"]))
    assert retryStat["called"] == 1, "405 should trigger retry"
    assert str.HasPrefix(retryStat["lastReq"], "POST "), "should switch to POST"

    // 场景 2: 429 应该重发原请求
    rsp429 = \`HTTP/1.1 429 Too Many Requests
Retry-After: 1
Content-Length: 0

\`
    retryStat["called"] = 0
    retryStat["lastReq"] = ""
    start = time.Now().Unix()
    retryHandler(false, 1, []byte(origReq), []byte(rsp429), retryCb)
    elapsed = time.Now().Unix() - start
    log.info(sprintf("case 429: called=%d elapsed=%ds", retryStat["called"], elapsed))
    assert retryStat["called"] == 1, "429 should trigger retry"
    assert elapsed >= 1, "429 should sleep at least 1 second"

    // 场景 3: 401 不应重试
    rsp401 = \`HTTP/1.1 401 Unauthorized
Content-Length: 0

\`
    retryStat["called"] = 0
    retryHandler(false, 1, []byte(origReq), []byte(rsp401), retryCb)
    log.info(sprintf("case 401: called=%d", retryStat["called"]))
    assert retryStat["called"] == 0, "401 should NOT retry"

    // 场景 4: 500 应该重试一次
    rsp500 = \`HTTP/1.1 500 Internal Server Error
Content-Length: 0

\`
    retryStat["called"] = 0
    retryHandler(false, 1, []byte(origReq), []byte(rsp500), retryCb)
    log.info(sprintf("case 500: called=%d", retryStat["called"]))
    assert retryStat["called"] == 1, "500 should retry once"

    log.info("smart retry self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[流处理] mirrorHTTPFlow 提取参数链',
    nameUi: 'HTTPFuzzerHotPatch.mirror_flow_extract_chain',
    temp: `// mirrorHTTPFlow - 从响应中提取关键参数注入到下一个请求
mirrorHTTPFlow = func(req, rsp, params) {
    if params == nil {
        params = {}
    }

    statusCode = poc.GetStatusCodeFromResponse(rsp)
    params["current_status_code"] = sprintf("%d", statusCode)

    csrfHeader = poc.GetHTTPPacketHeader(rsp, "X-CSRF-Token")
    if csrfHeader != "" {
        params["csrf_token"] = csrfHeader
    }

    body = poc.GetHTTPPacketBody(rsp)
    if len(body) > 0 {
        tryParseJson = func() {
            defer func {
                err = recover()
                if err != nil {
                    log.warn("mirror flow: not a json body")
                }
            }
            data = json.loads(string(body))
            keys = ["access_token", "token", "csrfToken", "csrf_token", "session_id"]
            for k in keys {
                v = data[k]
                if v != nil {
                    params[k] = sprintf("%v", v)
                }
            }
        }
        tryParseJson()
    }

    return params
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mirror flow self test")

    mockReq = \`GET /api/login HTTP/1.1
Host: test.local

\`

    mockRsp = \`HTTP/1.1 200 OK
Content-Type: application/json
X-CSRF-Token: csrf-abc-123
Content-Length: 100

{"code":0,"access_token":"tok_xyz_456","csrfToken":"csrf-body-789","session_id":"sess_abc"}\`

    result = mirrorHTTPFlow([]byte(mockReq), []byte(mockRsp), {})
    log.info(sprintf("result: %v", result))

    assert result["current_status_code"] == "200", "should extract status code"
    assert result["csrf_token"] == "csrf-abc-123", "should extract csrf from header"
    assert result["access_token"] == "tok_xyz_456", "should extract access_token"
    assert result["csrfToken"] == "csrf-body-789", "should extract csrfToken from body"
    assert result["session_id"] == "sess_abc", "should extract session_id"

    /* 测试 nil params 处理 */
    result2 = mirrorHTTPFlow([]byte(mockReq), []byte(mockRsp), nil)
    assert result2["current_status_code"] == "200", "nil params should work"

    /* 测试非 JSON 响应 */
    mockRsp2 = \`HTTP/1.1 200 OK
Content-Type: text/html

<html>not json</html>\`
    result3 = mirrorHTTPFlow([]byte(mockReq), []byte(mockRsp2), {})
    log.info(sprintf("result3: %v", result3))
    assert result3["current_status_code"] == "200", "non-json should still extract status"

    log.info("mirror flow self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[挑战] 动态 Challenge + HMAC 签名注入',
    nameUi: 'HTTPFuzzerHotPatch.challenge_response_sign',
    temp: `// 动态挑战应答签名模板
// 流程: 取 challenge → AES-CBC 解密拿到 nonce → HMAC-SHA256 计算签名 → 注入 X-Auth-Signature
// 仅对命中 TARGET_PATH 的请求生效，避免污染其他接口
API_AES_KEY = "YakitVulinboxAES"               /* 解密 challenge 用的对称密钥 */
API_SIGN_KEY = "YakitVulinboxHMACKey-SIGNATURE"/* 计算签名用的 HMAC 密钥 */
TARGET_PATH = "/api/user/info"                 /* 仅对该路径补签名 */
CHALLENGE_PATH = "/api/get-challenge"          /* challenge 接口路径 */
SIGN_HEADER = "X-Auth-Signature"               /* 签名注入的头名 */

isTargetRequest = func(isHttps, packet) {
    u, err = str.ExtractURLFromHTTPRequestRaw(packet, isHttps)
    if err != nil {
        return false
    }
    return str.Contains(u.String(), TARGET_PATH)
}

fetchChallengeSignature = func(isHttps, packet) {
    host = poc.GetHTTPPacketHeader(packet, "Host")
    if host == "" {
        log.error("challenge sign: request host is empty")
        return ""
    }
    challengeReq = "GET " + CHALLENGE_PATH + " HTTP/1.1\\r\\n" +
        "Host: " + host + "\\r\\n" +
        "User-Agent: yak-challenge-sign\\r\\n" +
        "Connection: close\\r\\n\\r\\n"
    rsp, _, err = poc.HTTP(challengeReq, poc.https(isHttps), poc.timeout(5), poc.save(false))
    if err != nil {
        log.error("challenge sign: fetch challenge failed: " + sprintf("%v", err))
        return ""
    }
    body = poc.GetHTTPPacketBody(rsp)
    params = json.loads(string(body))
    if !("challenge" in params) || !("iv" in params) {
        log.error("challenge sign: response missing challenge/iv")
        return ""
    }
    challengeBytes = codec.DecodeBase64(params.challenge)~
    ivBytes = codec.DecodeBase64(params.iv)~
    nonce = codec.AESCBCDecrypt(API_AES_KEY, challengeBytes, ivBytes)~
    return codec.EncodeToHex(codec.HmacSha256(API_SIGN_KEY, nonce))
}

beforeRequest = func(https, originReq, req) {
    if !isTargetRequest(https, req) {
        return req
    }
    signature = fetchChallengeSignature(https, req)
    if signature == "" {
        return req
    }
    return poc.ReplaceHTTPPacketHeader(req, SIGN_HEADER, signature)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start challenge response sign self test")

    port = os.GetRandomAvailableTCPPort()
    host = "127.0.0.1"

    mockNonce = "nonce-" + codec.EncodeToHex(codec.RandBytes(8))
    expectedSig = codec.EncodeToHex(codec.HmacSha256(API_SIGN_KEY, mockNonce))

    challengeCount = {"n": 0}

    go func {
        httpserver.Serve(host, port,
            httpserver.routeHandler(CHALLENGE_PATH, (w, req) => {
                challengeCount["n"] = challengeCount["n"] + 1
                iv = codec.RandBytes(16)
                cipher = codec.AESCBCEncrypt(API_AES_KEY, mockNonce, iv)~
                rspJson = json.dumps({
                    "challenge": codec.EncodeBase64(cipher),
                    "iv": codec.EncodeBase64(iv),
                })
                w.Header().Set("Content-Type", "application/json")
                w.Write(rspJson)
            }),
            httpserver.handler((w, req) => {
                w.Write("fallback")
            }),
        )
    }
    os.WaitConnect(str.HostPort(host, port), 4)

    targetHost = sprintf("%s:%d", host, port)
    mockReq = sprintf(\`GET %s HTTP/1.1
Host: %s
User-Agent: yak

\`, TARGET_PATH, targetHost)
    otherReq = sprintf(\`GET /api/healthz HTTP/1.1
Host: %s

\`, targetHost)

    signedReq = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    sig = poc.GetHTTPPacketHeader(signedReq, SIGN_HEADER)
    log.info("injected signature: " + sig)
    assert sig == expectedSig, "challenge signature mismatch"
    assert challengeCount["n"] == 1, "should call challenge once"

    untouchedReq = beforeRequest(false, []byte(otherReq), []byte(otherReq))
    sig2 = poc.GetHTTPPacketHeader(untouchedReq, SIGN_HEADER)
    log.info("non-target request signature header: '" + sig2 + "'")
    assert sig2 == "", "non-target request should NOT be signed"
    assert challengeCount["n"] == 1, "non-target request should NOT trigger challenge fetch"

    log.info("challenge response sign self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[会话] Bootstrap 动态会话 + 多 Header 签名 + 响应解密',
    nameUi: 'HTTPFuzzerHotPatch.bootstrap_session_pipeline',
    temp: `// Bootstrap Session 完整 pipeline 模板
// 流程:
//   1. beforeRequest: 命中目标路径 → 取 bootstrap → 解 ticket 拿 session_id+session_key
//      → 用 session_key 对 METHOD+\\n+PATH+\\n+TIMESTAMP 算签名 → 注入 3 个 X-Pipeline-* 头
//   2. afterRequest:  响应 body 含 {data, iv} → 用缓存的 session_key 做 AES-CBC 解密
// 缓存策略: sessionKeyCache[sessionID] 减少 bootstrap 调用次数
BOOTSTRAP_KEY = "YakitPipeBootKey"             /* 解 bootstrap ticket 的固定引导密钥 */
BOOTSTRAP_PATH = "/api/pipeline/bootstrap"     /* bootstrap 接口路径 */
TARGET_PATH = "/api/pipeline/orders/search"    /* 真正的业务接口 */
SESSION_HEADER = "X-Pipeline-Session"
TIMESTAMP_HEADER = "X-Pipeline-Timestamp"
SIGNATURE_HEADER = "X-Pipeline-Signature"

sessionKeyCache = {}

isTargetRequest = func(isHttps, packet) {
    u, err = str.ExtractURLFromHTTPRequestRaw(packet, isHttps)
    if err != nil {
        return false
    }
    return u.Path == TARGET_PATH
}

parseBootstrapTicket = func(packet) {
    body = poc.GetHTTPPacketBody(packet)
    params = json.loads(string(body))
    if !("ticket" in params) || !("iv" in params) {
        log.error("bootstrap: response missing ticket/iv")
        return nil
    }
    ticketBytes = codec.DecodeBase64(params.ticket)~
    ivBytes = codec.DecodeBase64(params.iv)~
    plain = codec.AESCBCDecrypt(BOOTSTRAP_KEY, ticketBytes, ivBytes)~
    return json.loads(string(plain))
}

fetchSession = func(isHttps, packet) {
    host = poc.GetHTTPPacketHeader(packet, "Host")
    if host == "" {
        log.error("bootstrap: request host is empty")
        return nil
    }
    bootstrapReq = "GET " + BOOTSTRAP_PATH + " HTTP/1.1\\r\\n" +
        "Host: " + host + "\\r\\n" +
        "User-Agent: yak-bootstrap-pipeline\\r\\n" +
        "Connection: close\\r\\n\\r\\n"
    rsp, _, err = poc.HTTP(bootstrapReq, poc.https(isHttps), poc.timeout(5), poc.save(false))
    if err != nil {
        log.error("bootstrap: fetch failed: " + sprintf("%v", err))
        return nil
    }
    return parseBootstrapTicket(rsp)
}

buildSignature = func(method, path, sessionKey) {
    ts = sprintf("%d", time.Now().Unix())
    raw = method + "\\n" + path + "\\n" + ts
    sig = codec.EncodeToHex(codec.HmacSha256(sessionKey, raw))
    return ts, sig
}

decryptResponseBody = func(packet, sessionKey) {
    body = string(poc.GetHTTPPacketBody(packet))
    if !str.Contains(body, \`"data"\`) || !str.Contains(body, \`"iv"\`) {
        return packet
    }
    params = json.loads(body)
    if !("data" in params) || !("iv" in params) {
        return packet
    }
    dataBytes = codec.DecodeBase64(params.data)~
    ivBytes = codec.DecodeBase64(params.iv)~
    plain = codec.AESCBCDecrypt(sessionKey, dataBytes, ivBytes)~
    return poc.ReplaceHTTPPacketBody(packet, plain)
}

beforeRequest = func(https, originReq, req) {
    if !isTargetRequest(https, req) {
        return req
    }
    ticket = fetchSession(https, req)
    if ticket == nil {
        return req
    }
    sessionID = sprintf("%v", ticket.session_id)
    sessionKeyB64 = sprintf("%v", ticket.session_key)
    sessionKey = codec.DecodeBase64(sessionKeyB64)~
    method = poc.GetHTTPRequestMethod(req)
    u = str.ExtractURLFromHTTPRequestRaw(req, https)~
    ts, sig = buildSignature(method, u.Path, sessionKey)
    sessionKeyCache[sessionID] = sessionKeyB64
    req = poc.ReplaceHTTPPacketHeader(req, SESSION_HEADER, sessionID)
    req = poc.ReplaceHTTPPacketHeader(req, TIMESTAMP_HEADER, ts)
    req = poc.ReplaceHTTPPacketHeader(req, SIGNATURE_HEADER, sig)
    return req
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    if !isTargetRequest(https, req) {
        return rsp
    }
    sessionID = poc.GetHTTPPacketHeader(req, SESSION_HEADER)
    sessionKeyB64 = sessionKeyCache[sessionID]
    if sessionKeyB64 == "" {
        return rsp
    }
    sessionKey = codec.DecodeBase64(sessionKeyB64)~
    return decryptResponseBody(rsp, sessionKey)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start bootstrap session pipeline self test")

    port = os.GetRandomAvailableTCPPort()
    host = "127.0.0.1"

    expectedSessionID = "sess-" + codec.EncodeToHex(codec.RandBytes(4))
    expectedSessionKey = codec.RandBytes(16)
    expectedSessionKeyB64 = codec.EncodeBase64(expectedSessionKey)
    expectedPlain = \`{"rows":[{"id":1,"product":"商品A"}],"row_count":1}\`

    bootstrapCount = {"n": 0}

    go func {
        httpserver.Serve(host, port,
            httpserver.routeHandler(BOOTSTRAP_PATH, (w, req) => {
                bootstrapCount["n"] = bootstrapCount["n"] + 1
                ticketObj = json.dumps({
                    "session_id": expectedSessionID,
                    "session_key": expectedSessionKeyB64,
                })
                iv = codec.RandBytes(16)
                cipher = codec.AESCBCEncrypt(BOOTSTRAP_KEY, ticketObj, iv)~
                w.Header().Set("Content-Type", "application/json")
                w.Write(json.dumps({
                    "ticket": codec.EncodeBase64(cipher),
                    "iv": codec.EncodeBase64(iv),
                }))
            }),
            httpserver.handler((w, req) => {
                w.Write("fallback")
            }),
        )
    }
    os.WaitConnect(str.HostPort(host, port), 4)

    targetHost = sprintf("%s:%d", host, port)

    mockReq = sprintf(\`POST %s HTTP/1.1
Host: %s
Content-Type: application/json

{"keyword":"x","page":1,"size":10}\`, TARGET_PATH, targetHost)

    signedReq = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    gotSession = poc.GetHTTPPacketHeader(signedReq, SESSION_HEADER)
    gotTs = poc.GetHTTPPacketHeader(signedReq, TIMESTAMP_HEADER)
    gotSig = poc.GetHTTPPacketHeader(signedReq, SIGNATURE_HEADER)
    log.info("session id: " + gotSession)
    log.info("timestamp: " + gotTs)
    log.info("signature: " + gotSig)
    assert gotSession == expectedSessionID, "session id mismatch"
    assert gotTs != "", "timestamp should be set"
    expectedSig = codec.EncodeToHex(codec.HmacSha256(expectedSessionKey, "POST\\n"+TARGET_PATH+"\\n"+gotTs))
    assert gotSig == expectedSig, "signature mismatch"
    assert bootstrapCount["n"] == 1, "should call bootstrap once"
    assert sessionKeyCache[expectedSessionID] == expectedSessionKeyB64, "session key should be cached"

    rspIv = codec.RandBytes(16)
    rspCipher = codec.AESCBCEncrypt(expectedSessionKey, expectedPlain, rspIv)~
    mockRsp = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n" + json.dumps({
        "data": codec.EncodeBase64(rspCipher),
        "iv": codec.EncodeBase64(rspIv),
        "session_id": expectedSessionID,
    })

    decRsp = afterRequest(false, []byte(mockReq), signedReq, []byte(mockRsp), []byte(mockRsp))
    decBody = string(poc.GetHTTPPacketBody(decRsp))
    log.info("decrypted body: " + decBody)
    assert decBody == expectedPlain, "response decryption mismatch"

    otherReq = sprintf(\`GET /api/healthz HTTP/1.1
Host: %s

\`, targetHost)
    untouchedReq = beforeRequest(false, []byte(otherReq), []byte(otherReq))
    sig2 = poc.GetHTTPPacketHeader(untouchedReq, SIGNATURE_HEADER)
    assert sig2 == "", "non-target request should NOT be signed"
    assert bootstrapCount["n"] == 1, "non-target request should NOT trigger bootstrap"

    log.info("bootstrap session pipeline self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[AES] 自带 key/iv 信封协议双向加解密',
    nameUi: 'HTTPFuzzerHotPatch.aes_cbc_key_iv_envelope',
    temp: `// 自带 key/iv 信封协议（key 与 iv 随请求/响应一并下发）
// 请求方向: 把明文 body 用每次新生成的 key/iv 加密后，封装成 {key, iv, message} 发出
// 响应方向: 解开服务端返回的 {key, iv, message}，把 body 替换成明文便于查看
// 适用前提: 协议本身不依赖固定密钥，例如学习靶场 vulinbox /crypto/sqli/aes-ecb 系列
encryptEnvelope = func(packet) {
    body = poc.GetHTTPPacketBody(packet)
    if len(body) == 0 {
        return packet
    }
    key = codec.RandBytes(16)
    iv = codec.RandBytes(16)
    cipher = codec.AESCBCEncryptWithPKCS7Padding(key, string(body), iv)~
    envelope = json.dumps({
        "key": codec.EncodeToHex(key),
        "iv": codec.EncodeToHex(iv),
        "message": codec.EncodeBase64(cipher),
    })
    packet = poc.ReplaceHTTPPacketBody(packet, envelope)
    packet = poc.ReplaceHTTPPacketHeader(packet, "Content-Type", "application/json")
    return packet
}

decryptEnvelope = func(packet) {
    body = string(poc.GetHTTPPacketBody(packet))
    if !str.Contains(body, \`"key"\`) || !str.Contains(body, \`"iv"\`) || !str.Contains(body, \`"message"\`) {
        return packet
    }
    params = json.loads(body)
    if !("key" in params) || !("iv" in params) || !("message" in params) {
        return packet
    }
    key = codec.DecodeHex(params.key)~
    iv = codec.DecodeHex(params.iv)~
    cipher = codec.DecodeBase64(params.message)~
    plain = codec.AESCBCDecrypt(key, cipher, iv)~
    return poc.ReplaceHTTPPacketBody(packet, plain)
}

beforeRequest = func(https, originReq, req) {
    return encryptEnvelope(req)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    return decryptEnvelope(rsp)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start aes cbc key/iv envelope self test")

    plain = \`{"search":"' OR 1=1 -- "}\`
    mockReq = \`POST /crypto/sqli/aes-ecb/encrypt/login HTTP/1.1
Host: 127.0.0.1:8080
Content-Type: application/json

\` + plain

    encReq = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    encBody = string(poc.GetHTTPPacketBody(encReq))
    log.info("encrypted request body: " + encBody)
    params = json.loads(encBody)
    assert "key" in params, "envelope must contain key"
    assert "iv" in params, "envelope must contain iv"
    assert "message" in params, "envelope must contain message"

    keyBytes = codec.DecodeHex(params.key)~
    ivBytes = codec.DecodeHex(params.iv)~
    cipherBytes = codec.DecodeBase64(params.message)~
    roundTrip = codec.AESCBCDecrypt(keyBytes, cipherBytes, ivBytes)~
    log.info("round trip plaintext: " + string(roundTrip))
    assert string(roundTrip) == plain, "request envelope round trip mismatch"

    encReq2 = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    params2 = json.loads(string(poc.GetHTTPPacketBody(encReq2)))
    assert params2.key != params.key, "request key should be random each time"
    assert params2.iv != params.iv, "request iv should be random each time"

    rspKey = codec.RandBytes(16)
    rspIv = codec.RandBytes(16)
    rspPlain = \`{"code":0,"msg":"login success","data":{"username":"admin"}}\`
    rspCipher = codec.AESCBCEncryptWithPKCS7Padding(rspKey, rspPlain, rspIv)~
    mockRsp = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n" + json.dumps({
        "key": codec.EncodeToHex(rspKey),
        "iv": codec.EncodeToHex(rspIv),
        "message": codec.EncodeBase64(rspCipher),
    })

    decRsp = afterRequest(false, []byte(mockReq), encReq, []byte(mockRsp), []byte(mockRsp))
    decBody = string(poc.GetHTTPPacketBody(decRsp))
    log.info("decrypted response body: " + decBody)
    assert decBody == rspPlain, "response decryption mismatch"

    nonEnvelopeRsp = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n" + \`{"hello":"world"}\`
    untouchedRsp = afterRequest(false, []byte(mockReq), encReq, []byte(nonEnvelopeRsp), []byte(nonEnvelopeRsp))
    untouchedBody = string(poc.GetHTTPPacketBody(untouchedRsp))
    assert untouchedBody == \`{"hello":"world"}\`, "non envelope response should be untouched"

    log.info("aes cbc key/iv envelope self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[MITM] hijackSaveHTTPFlow 数据库存储明文',
    nameUi: 'HTTPFuzzerHotPatch.mitm_hijack_save_decrypt',
    temp: `// hijackSaveHTTPFlow 模板 - MITM 入库时把响应改写为明文，浏览器仍收原密文
// 仅对命中 TARGET_PATH 的 flow 做改写；其他 flow 原样保存
// 注意: flow.Request / flow.Response 是 strconv.Quote 后的字符串，需 Unquote/Quote 来回
SAVE_AES_KEY = "1234567890123456" /* 16 字节 AES 密钥，按实际环境替换 */
SAVE_AES_IV = "1234567890123456"
TARGET_PATH = "/api/secret/data"   /* 仅对该 path 入库改写 */

isTargetFlowRequest = func(packet) {
    for isHttps in [false, true] {
        u, err = str.ExtractURLFromHTTPRequestRaw(packet, isHttps)
        if err == nil && u != nil && str.Contains(u.Path, TARGET_PATH) {
            return true
        }
    }
    return false
}

decryptFlowResponse = func(rspPacket) {
    body = poc.GetHTTPPacketBody(rspPacket)
    if len(body) == 0 {
        return rspPacket
    }
    plain, err = codec.AESCBCDecrypt(SAVE_AES_KEY, body, SAVE_AES_IV)
    if err != nil {
        return rspPacket
    }
    return poc.ReplaceHTTPPacketBody(rspPacket, plain)
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    req = codec.StrconvUnquote(flow.Request)~
    if !isTargetFlowRequest(req) {
        modify(flow)
        return
    }
    rsp = codec.StrconvUnquote(flow.Response)~
    newRsp = decryptFlowResponse(rsp)
    flow.Response = codec.StrconvQuote(string(newRsp))
    modify(flow)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hijack save http flow self test")

    plain = \`{"secret":"deadbeef","ok":true}\`
    cipher = codec.AESCBCEncrypt(SAVE_AES_KEY, plain, SAVE_AES_IV)~

    targetReq = sprintf(\`GET %s HTTP/1.1
Host: target.local

\`, TARGET_PATH)
    encryptedRsp := []byte("HTTP/1.1 200 OK\\r\\nContent-Type: application/octet-stream\\r\\n\\r\\n") + cipher
    targetFlow = {
        "Request": codec.StrconvQuote(targetReq),
        "Response": codec.StrconvQuote(string(encryptedRsp)),
    }

    saved = []
    modify = func(flow) {
        saved = append(saved, flow)
    }
    drop = func() {
        log.error("should not drop")
    }

    hijackSaveHTTPFlow(targetFlow, modify, drop)
    assert len(saved) == 1, "modify should be called once for target"
    finalRsp = codec.StrconvUnquote(saved[0].Response)~
    finalBody = string(poc.GetHTTPPacketBody(finalRsp))
    log.info("target flow saved body: " + finalBody)
    assert finalBody == plain, "target flow response body should be plaintext after hijack"

    nonTargetReq = \`GET /api/healthz HTTP/1.1
Host: target.local

\`
    nonTargetRsp = "HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\n\\r\\nOK"
    nonTargetFlow = {
        "Request": codec.StrconvQuote(nonTargetReq),
        "Response": codec.StrconvQuote(nonTargetRsp),
    }

    saved = []
    hijackSaveHTTPFlow(nonTargetFlow, modify, drop)
    assert len(saved) == 1, "modify should still be called for non-target"
    finalRsp2 = codec.StrconvUnquote(saved[0].Response)~
    finalBody2 = string(poc.GetHTTPPacketBody(finalRsp2))
    log.info("non-target flow saved body: " + finalBody2)
    assert finalBody2 == "OK", "non-target flow response should remain unchanged"

    log.info("hijack save http flow self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
  {
    name: '[Mock] mockHTTPRequest 离线响应模拟',
    nameUi: 'HTTPFuzzerHotPatch.mock_http_offline_response',
    temp: `// mockHTTPRequest Hook - Fuzzer 不真正发包，由脚本直接返回响应
// 函数签名: mockHTTPRequest(isHttps bool, url string, req []byte, mockResponse func)
// 调用 mockResponse(rsp) → 立即返回该 rsp，不会走网络
// 不调用 mockResponse → 请求按正常链路发出
MOCK_PATH = "/api/offline-mock"   /* 命中该路径的请求会被本地 mock */
MOCK_LATENCY_MS = 0               /* 模拟服务端处理耗时（毫秒），0 表示立即返回 */

buildMockResponse = func(req) {
    method = poc.GetHTTPRequestMethod(req)
    body = json.dumps({
        "mocked": true,
        "method": method,
        "echo_body": string(poc.GetHTTPPacketBody(req)),
    }, json.withIndent(""))
    return "HTTP/1.1 200 OK\\r\\n" +
        "Content-Type: application/json\\r\\n" +
        "X-Yak-Mock: 1\\r\\n" +
        "Content-Length: " + sprintf("%d", len(body)) + "\\r\\n\\r\\n" + body
}

mockHTTPRequest = func(isHttps, url, req, mockResponse) {
    if !str.Contains(url, MOCK_PATH) {
        return
    }
    if MOCK_LATENCY_MS > 0 {
        time.Sleep(float(MOCK_LATENCY_MS) / 1000.0)
    }
    mockResponse(buildMockResponse(req))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明：
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit Fuzzer 热加载使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mock http request self test")

    captured = {"rsp": ""}
    mockResponse = func(rsp) {
        captured["rsp"] = rsp
    }

    mockReq := []byte(\`POST /api/offline-mock HTTP/1.1
Host: anywhere.local
Content-Type: application/json

{"hello":"yak"}\`)
    mockHTTPRequest(false, "http://anywhere.local/api/offline-mock", mockReq, mockResponse)
    log.info("captured rsp: " + sprintf("%v", captured["rsp"]))
    assert captured["rsp"] != "", "mock response should be captured"
    rspStr = sprintf("%v", captured["rsp"])
    assert str.Contains(rspStr, "X-Yak-Mock: 1"), "response should contain mock header"
    assert str.Contains(rspStr, \`"mocked":true\`), "response body should contain mocked flag"
    assert str.Contains(rspStr, \`"method":"POST"\`), "response should echo method"
    assert str.Contains(rspStr, \`"echo_body":"{\\"hello\\":\\"yak\\"}"\`), "response should echo body"

    captured["rsp"] = ""
    otherReq := []byte(\`GET /api/healthz HTTP/1.1
Host: anywhere.local

\`)
    mockHTTPRequest(false, "http://anywhere.local/api/healthz", otherReq, mockResponse)
    assert captured["rsp"] == "", "non-target request should NOT trigger mockResponse"

    log.info("mock http request self test passed")
}

if YAK_MAIN {
    runSelfTest()
}`,
    isDefault: true,
  },
]

export const defaultWebFuzzerPageInfo: WebFuzzerPageInfoProps = {
  pageId: '',
  advancedConfigValue: cloneDeep(defaultAdvancedConfigValue),
  advancedConfigShow: null,
  request: defaultPostTemplate,
  variableActiveKeys: undefined,
  hotPatchCode: HotPatchDefaultContent,
}
// 注：此处顺序为倒序（新增DefaultDescription记得带-fixed，此处为标识固定项）
export const defaultLabel: LabelDataProps[] = [
  {
    DefaultDescription: '调用codec模块保存的codec flow-fixed',
    Description: '调用codec模块保存的codec flow',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.save_codec_flow',
    Label: '{{codecflow(name|abc)}}',
  },
  {
    DefaultDescription: '反向正则（单个）-fixed',
    Description: '反向正则（单个）',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.reverse_regex_single',
    Label: '{{regen:one([0-9a-f]{3})}}',
  },
  {
    DefaultDescription: '反向正则（全部）-fixed',
    Description: '反向正则（全部）',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.reverse_regex_all',
    Label: '{{regen([0-9a-f]{3})}}',
  },
  {
    DefaultDescription: '时间戳（秒）-fixed',
    Description: '时间戳（秒）',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.timestamp_seconds',
    Label: '{{timestamp(seconds)}}',
  },
  {
    DefaultDescription: '验证码-fixed',
    Description: '验证码',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.captcha',
    Label: '{{int(0000-9999)}}',
  },
  {
    DefaultDescription: '随机数-fixed',
    Description: '随机数',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.random_number',
    Label: '{{randint(0,10)}}',
  },
  {
    DefaultDescription: '随机字符串-fixed',
    Description: '随机字符串',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.random_string',
    Label: '{{randstr}}',
  },
  {
    DefaultDescription: '整数范围-fixed',
    Description: '整数范围',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.integer_range',
    Label: '{{int(1-10)}}',
  },
  {
    DefaultDescription: '插入字典-fixed',
    Description: '插入字典',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.insert_dictionary',
  },
  {
    DefaultDescription: '插入临时字典-fixed',
    Description: '插入临时字典',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.insert_temp_dictionary',
  },
  {
    DefaultDescription: '插入文件-fixed',
    Description: '插入文件',
    DescriptionUi: 'HTTPFuzzerClickEditorMenu.insert_file',
  },
]
