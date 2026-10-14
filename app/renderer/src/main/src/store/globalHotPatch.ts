/**
 * @description 全局热加载模板配置 Store
 */

import { create } from 'zustand'
import { yakitFailed } from '@/utils/notification'

const { ipcRenderer } = window.require('electron')

export interface GlobalHotPatchTemplateRef {
  Name: string
  Type: string
  Enabled: boolean
}

export interface GlobalHotPatchConfig {
  Enabled: boolean
  Version: string
  Items: GlobalHotPatchTemplateRef[]
}

interface GlobalHotPatchStore {
  globalHotPatchConfig: GlobalHotPatchConfig | null
  setGlobalHotPatchConfig: (config: GlobalHotPatchConfig) => void
  loadGlobalHotPatchConfig: () => Promise<void>
  enableGlobalHotPatch: (name: string) => Promise<void>
  disableGlobalHotPatch: () => Promise<void>
}

export const DEFAULT_GLOBAL_TEMPLATE_NAME = '全局默认模板'
export const DEFAULT_GLOBAL_TEMPLATE_CONTENT = `// 全局 HotPatch 示例（默认模板）
// - MITM / WebFuzzer 都会优先执行全局模板
// - 执行顺序：全局 HotPatch -> 模块 HotPatch
//
// 你可以通过观察请求头中是否出现 X-Yakit-Global-HotPatch 来确认是否生效

hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    req = poc.AppendHTTPPacketHeader(req, "X-Yakit-Global-HotPatch", "1")
    forward(req)
}

beforeRequest = func(https, originReq, req) {
    req = poc.AppendHTTPPacketHeader(req, "X-Yakit-Global-HotPatch", "1")
    return req
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    flow.AddTag("global-hotpatch")
    modify(flow)
}`

export interface DefaultGlobalTemplate {
  name: string
  nameUi: string
  content: string
}

export const DEFAULT_GLOBAL_TEMPLATES: DefaultGlobalTemplate[] = [
  {
    name: DEFAULT_GLOBAL_TEMPLATE_NAME,
    nameUi: 'GlobalHotPatch.default',
    content: DEFAULT_GLOBAL_TEMPLATE_CONTENT,
  },
  {
    name: '[全局] 内网 SM4-CBC 透明加解密 + 入库明文',
    nameUi: 'GlobalHotPatch.guomi_sm4_transparent',
    content: `/*
模版名称: [全局] 内网 SM4-CBC 透明加解密 + 入库明文
对应 i18n key: GlobalHotPatch.guomi_sm4_transparent
关键词: 全局热加载, SM4, SM4-CBC, 国密, beforeRequest, afterRequest, hijackSaveHTTPFlow, 透明加解密, 入库明文
适用场景: 全站统一使用国密 SM4-CBC 加密的内网业务，安装本全局模板后所有 MITM/Fuzzer 流量自动加解密；同时入库存明文便于排查
参考文章: yak-project-public 009 (2026-03-18) 全局热加载帮你自动接管签名流程 + 084 (2024-12-05) 渗透测试高级技巧(三) 全站加密章节
*/

// ===== HOT PATCH TEMPLATE START =====
// 全局 SM4-CBC 透明加解密模板
// 工作流程:
//   1. beforeRequest: 把明文 body 加密成 SM4-CBC 密文
//   2. afterRequest:  把响应密文解密成明文返回给客户端
//   3. hijackSaveHTTPFlow: 入库时确保 Request/Response 都是明文（便于在 yakit 历史里直接看）
SM4_KEY = "1234567890123456"   /* 16 字节 SM4 密钥 */
SM4_IV = "1234567890123456"    /* 16 字节 IV */

shouldHandle = func(packet) {
    body = poc.GetHTTPPacketBody(packet)
    return len(body) > 0
}

tryEncryptBody = func(packet) {
    body = poc.GetHTTPPacketBody(packet)
    if len(body) == 0 { return packet }
    cipher, err = codec.Sm4CBCEncrypt(SM4_KEY, string(body), SM4_IV)
    if err != nil {
        log.error(sprintf("sm4 encrypt failed: %v", err))
        return packet
    }
    encoded = codec.EncodeBase64(cipher)
    return poc.ReplaceHTTPPacketBody(packet, encoded)
}

tryDecryptBody = func(packet) {
    body = poc.GetHTTPPacketBody(packet)
    if len(body) == 0 { return packet }
    raw, err = codec.DecodeBase64(string(body))
    if err != nil { return packet }
    plain, err2 = codec.Sm4CBCDecrypt(SM4_KEY, raw, SM4_IV)
    if err2 != nil { return packet }
    return poc.ReplaceHTTPPacketBody(packet, plain)
}

beforeRequest = func(https, originReq, req) {
    return tryEncryptBody(req)
}

afterRequest = func(https, originReq, req, originRsp, rsp) {
    return tryDecryptBody(rsp)
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    rsp = codec.StrconvUnquote(flow.Response)~
    plainRsp = tryDecryptBody(rsp)
    flow.Response = codec.StrconvQuote(string(plainRsp))
    flow.AddTag("sm4-transparent")
    modify(flow)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 全局热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start global sm4 transparent self test")

    plain = \`{"username":"admin","password":"P@ssw0rd"}\`
    mockReq = sprintf(\`POST /api/login HTTP/1.1
Host: target.local
Content-Type: application/json

%s\`, plain)

    encReq = beforeRequest(false, []byte(mockReq), []byte(mockReq))
    encBody = string(poc.GetHTTPPacketBody(encReq))
    log.info("encrypted body: " + encBody)
    assert encBody != plain, "body should be encrypted"
    cipherBytes = codec.DecodeBase64(encBody)~
    roundTrip = codec.Sm4CBCDecrypt(SM4_KEY, cipherBytes, SM4_IV)~
    assert string(roundTrip) == plain, "request encrypt round-trip mismatch"

    rspPlain = \`{"code":0,"msg":"ok","token":"abc123"}\`
    rspCipher = codec.Sm4CBCEncrypt(SM4_KEY, rspPlain, SM4_IV)~
    mockRsp = "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n" + codec.EncodeBase64(rspCipher)
    decRsp = afterRequest(false, []byte(mockReq), encReq, []byte(mockRsp), []byte(mockRsp))
    decBody = string(poc.GetHTTPPacketBody(decRsp))
    log.info("decrypted response body: " + decBody)
    assert decBody == rspPlain, "response decryption mismatch"

    flow = make(map[string]any)
    flow["Request"] = codec.StrconvQuote(mockReq)
    flow["Response"] = codec.StrconvQuote(string(mockRsp))
    tags = []
    flow["AddTag"] = func(t...) { for one in t { tags = append(tags, one) } }
    saved = []
    modify = func(f) { saved = append(saved, f) }
    drop = func() { log.error("should not drop") }

    hijackSaveHTTPFlow(flow, modify, drop)
    assert len(saved) == 1, "modify must be called"
    finalRsp = codec.StrconvUnquote(saved[0].Response)~
    finalBody = string(poc.GetHTTPPacketBody(finalRsp))
    log.info("saved-to-db body: " + finalBody)
    assert finalBody == rspPlain, "saved response body should be plaintext"
    assert "sm4-transparent" in tags, "tag should be added"

    log.info("global sm4 transparent self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
  },
  {
    name: '[全局] 动态 Challenge + HMAC 签名注入 pipeline',
    nameUi: 'GlobalHotPatch.challenge_sign_pipeline',
    content: `/*
模版名称: [全局] 动态 Challenge + HMAC 签名注入 pipeline
对应 i18n key: GlobalHotPatch.challenge_sign_pipeline
关键词: 全局热加载, Challenge, HMAC, beforeRequest, 签名注入, 协议归一化, 内网对抗
适用场景: 全站统一签名场景（所有业务接口都需要先取 challenge → HMAC 签名 → 注入 header），全局热加载一次配置全局生效
参考文章: yak-project-public 009 (2026-03-18) 前端加密测不动 全局热加载帮你自动接管签名流程
说明: fetchChallenge 是可注入的扩展点，自测时替换为 mock；与模块版（webFuzzer G1）的区别是全局版对"匹配 host 列表"的所有接口自动签名
*/

// ===== HOT PATCH TEMPLATE START =====
// 全局动态 Challenge 签名模板
// 工作流程:
//   1. beforeRequest 命中目标 host（HOST_PATTERN）且不是 challenge 接口本身
//   2. fetchChallenge(host, isHttps) 从远端取密文 nonce
//   3. HMAC-SHA256 签名 → 注入 X-Global-Sign 头
// 自测时把 fetchChallenge 替换成 mock，避免发包
SIGN_KEY = "GlobalSignSharedKey"
HOST_PATTERN = ".internal."           /* 命中 host 包含该串才签名 */
CHALLENGE_PATH = "/api/auth/challenge"
SIGN_HEADER = "X-Global-Sign"

fetchChallenge = func(isHttps, host) {
    challengeReq = "GET " + CHALLENGE_PATH + " HTTP/1.1\\r\\n" +
        "Host: " + host + "\\r\\n" +
        "User-Agent: yak-global-sign\\r\\n" +
        "Connection: close\\r\\n\\r\\n"
    rsp, _, err = poc.HTTP(challengeReq, poc.https(isHttps), poc.timeout(5), poc.save(false))
    if err != nil {
        log.error(sprintf("fetchChallenge failed: %v", err))
        return ""
    }
    body = poc.GetHTTPPacketBody(rsp)
    params = json.loads(string(body))
    if params == nil || !("nonce" in params) {
        return ""
    }
    return sprintf("%v", params.nonce)
}

isTargetHost = func(host) {
    return str.Contains(host, HOST_PATTERN)
}

beforeRequest = func(https, originReq, req) {
    host = poc.GetHTTPPacketHeader(req, "Host")
    if !isTargetHost(host) {
        return req
    }
    u = str.ExtractURLFromHTTPRequestRaw(req, https)~
    if str.HasPrefix(u.Path, CHALLENGE_PATH) {
        return req
    }
    nonce = fetchChallenge(https, host)
    if nonce == "" {
        return req
    }
    sig = codec.EncodeToHex(codec.HmacSha256(SIGN_KEY, nonce))
    return poc.ReplaceHTTPPacketHeader(req, SIGN_HEADER, sig)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 全局热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start global challenge sign pipeline self test")

    mockNonce = "nonce-" + codec.EncodeToHex(codec.RandBytes(8))
    expectedSig = codec.EncodeToHex(codec.HmacSha256(SIGN_KEY, mockNonce))
    fetchCalls = 0

    fetchChallenge = func(isHttps, host) {
        fetchCalls = fetchCalls + 1
        return mockNonce
    }

    targetReq := []byte(\`GET /api/biz/list HTTP/1.1
Host: api.shop.internal.example.com

\`)
    signedReq = beforeRequest(false, targetReq, targetReq)
    sig = poc.GetHTTPPacketHeader(signedReq, SIGN_HEADER)
    log.info("injected sign: " + sig)
    assert sig == expectedSig, "global sign mismatch"
    assert fetchCalls == 1, "fetchChallenge should be called once"

    challengeReqRaw := []byte(\`GET /api/auth/challenge HTTP/1.1
Host: api.shop.internal.example.com

\`)
    untouched = beforeRequest(false, challengeReqRaw, challengeReqRaw)
    sig2 = poc.GetHTTPPacketHeader(untouched, SIGN_HEADER)
    assert sig2 == "", "challenge endpoint itself should NOT be signed"
    assert fetchCalls == 1, "challenge endpoint should NOT trigger fetch (avoid recursion)"

    externalReq := []byte(\`GET /api/biz/list HTTP/1.1
Host: api.public.example.com

\`)
    untouched2 = beforeRequest(false, externalReq, externalReq)
    sig3 = poc.GetHTTPPacketHeader(untouched2, SIGN_HEADER)
    assert sig3 == "", "non-target host should NOT be signed"
    assert fetchCalls == 1, "non-target host should NOT trigger fetch"

    log.info("global challenge sign pipeline self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
  },
  {
    name: '[全局] 默认 Authorization Bearer 自动注入',
    nameUi: 'GlobalHotPatch.auto_bearer_token',
    content: `/*
模版名称: [全局] 默认 Authorization Bearer 自动注入（缓存登录）
对应 i18n key: GlobalHotPatch.auto_bearer_token
关键词: 全局热加载, Authorization, Bearer, 自动登录, Token 缓存, beforeRequest, hijackHTTPRequest
适用场景: 所有内网接口都需要 Authorization Bearer，全局热加载安装后自动登录拿一次 token 并缓存，所有 MITM/Fuzzer 请求自动补 header
说明: fetchToken 是可注入扩展点；同时支持 beforeRequest (Fuzzer 链路) 和 hijackHTTPRequest (MITM 链路)
*/

// ===== HOT PATCH TEMPLATE START =====
// 全局自动 Bearer 注入模板
// 工作流程:
//   1. 首次请求触发 fetchToken() 自动登录拿一个 token，缓存到 tokenCache
//   2. 后续所有目标 host 请求自动注入 Authorization Bearer
//   3. 当响应 401 时（通过 hijackHTTPResponseEx 检测），清空缓存触发下次重新登录
TOKEN_TARGET_HOST = ".internal."
LOGIN_PATH = "/api/auth/login"
tokenCache = {"value": "", "expires_at": 0}

isTargetByReq = func(req, https) {
    host = poc.GetHTTPPacketHeader(req, "Host")
    if !str.Contains(host, TOKEN_TARGET_HOST) {
        return false
    }
    u, err = str.ExtractURLFromHTTPRequestRaw(req, https)
    if err != nil { return false }
    if str.HasPrefix(u.Path, LOGIN_PATH) {
        return false
    }
    return true
}

fetchToken = func(host, https) {
    loginReq = "POST " + LOGIN_PATH + " HTTP/1.1\\r\\n" +
        "Host: " + host + "\\r\\n" +
        "Content-Type: application/json\\r\\n" +
        "Connection: close\\r\\n\\r\\n" +
        \`{"username":"yak-test","password":"yak-test-pass"}\`
    rsp, _, err = poc.HTTP(loginReq, poc.https(https), poc.timeout(5), poc.save(false))
    if err != nil {
        log.error(sprintf("auto bearer login failed: %v", err))
        return ""
    }
    body = poc.GetHTTPPacketBody(rsp)
    params = json.loads(string(body))
    if params == nil || !("token" in params) {
        return ""
    }
    return sprintf("%v", params.token)
}

ensureToken = func(req, https) {
    if tokenCache.value != "" {
        return tokenCache.value
    }
    host = poc.GetHTTPPacketHeader(req, "Host")
    if host == "" { return "" }
    t = fetchToken(host, https)
    if t != "" {
        tokenCache["value"] = t
    }
    return t
}

injectToken = func(req, https) {
    if !isTargetByReq(req, https) {
        return req
    }
    if poc.GetHTTPPacketHeader(req, "Authorization") != "" {
        return req
    }
    t = ensureToken(req, https)
    if t == "" {
        return req
    }
    return poc.ReplaceHTTPPacketHeader(req, "Authorization", "Bearer " + t)
}

beforeRequest = func(https, originReq, req) {
    return injectToken(req, https)
}

hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    forward(injectToken(req, isHttps))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 全局热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start global auto bearer token self test")

    tokenCache["value"] = ""
    mockToken = "tk-" + codec.EncodeToHex(codec.RandBytes(8))
    fetchCalls = 0
    fetchToken = func(host, https) {
        fetchCalls = fetchCalls + 1
        return mockToken
    }

    targetReq := []byte(\`GET /api/biz/list HTTP/1.1
Host: api.crm.internal.example.com

\`)
    out1 = beforeRequest(false, targetReq, targetReq)
    auth1 = poc.GetHTTPPacketHeader(out1, "Authorization")
    log.info("injected auth (beforeRequest): " + auth1)
    assert auth1 == "Bearer " + mockToken, "Bearer should be injected via beforeRequest"
    assert fetchCalls == 1, "first call should trigger fetchToken"

    captured = {"req": []byte("")}
    forward = func(b) { captured["req"] = b }
    drop = func() { log.error("should not drop") }

    targetReq2 := []byte(\`GET /api/biz/orders HTTP/1.1
Host: api.crm.internal.example.com

\`)
    hijackHTTPRequest(false, "http://api.crm.internal.example.com/api/biz/orders", targetReq2, forward, drop)
    auth2 = poc.GetHTTPPacketHeader(captured["req"], "Authorization")
    log.info("injected auth (MITM): " + auth2)
    assert auth2 == "Bearer " + mockToken, "Bearer should be injected via hijackHTTPRequest"
    assert fetchCalls == 1, "second call should reuse cached token, no new fetch"

    loginReq := []byte(\`POST /api/auth/login HTTP/1.1
Host: api.crm.internal.example.com

\`)
    loginOut = beforeRequest(false, loginReq, loginReq)
    loginAuth = poc.GetHTTPPacketHeader(loginOut, "Authorization")
    assert loginAuth == "", "login endpoint should NOT be injected"

    externalReq := []byte(\`GET /api/biz/list HTTP/1.1
Host: api.public.example.com

\`)
    externalOut = beforeRequest(false, externalReq, externalReq)
    externalAuth = poc.GetHTTPPacketHeader(externalOut, "Authorization")
    assert externalAuth == "", "non-target host should NOT be injected"

    existingAuthReq := []byte(\`GET /api/biz/list HTTP/1.1
Host: api.crm.internal.example.com
Authorization: Bearer user-supplied-token

\`)
    existingOut = beforeRequest(false, existingAuthReq, existingAuthReq)
    existingAuth = poc.GetHTTPPacketHeader(existingOut, "Authorization")
    assert existingAuth == "Bearer user-supplied-token", "existing Authorization should NOT be overwritten"

    log.info("global auto bearer token self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
  },
  {
    name: '[全局] 流量染色 + tag（敏感关键字/状态码）',
    nameUi: 'GlobalHotPatch.flow_tag_coloring',
    content: `/*
模版名称: [全局] 流量染色 + tag（敏感关键字/状态码）
对应 i18n key: GlobalHotPatch.flow_tag_coloring
关键词: 全局热加载, 流量染色, AddTag, hijackSaveHTTPFlow, 状态码染色, 敏感关键字, 路径分类
适用场景: 全局生效的流量分类与染色——所有 MITM/Fuzzer 的入库流量都会被打标签 + 染色，方便后续在历史/分析面板按 tag 过滤
说明: 与 M10 不同的是，本模板作为"全局热加载"启用，对全系统流量都生效，规则集中维护一次
*/

// ===== HOT PATCH TEMPLATE START =====
// 全局染色 + tag 模板（hijackSaveHTTPFlow）
// 规则列表 → 命中 → AddTag + 染色
PATH_RULES = [
    {"keyword": "/admin",  "tag": "admin-area",  "color": "Blue"},
    {"keyword": "upload",  "tag": "upload-api",  "color": "Purple"},
    {"keyword": "login",   "tag": "login-flow",  "color": "Green"},
]
BODY_RULES = [
    {"keyword": "password", "tag": "credential", "color": "Red"},
    {"keyword": "secret",   "tag": "credential", "color": "Red"},
    {"keyword": "id_card",  "tag": "pii",        "color": "Orange"},
]

applyColor = func(flow, color) {
    if color == "Red"    { flow.Red() }
    if color == "Orange" { flow.Orange() }
    if color == "Yellow" { flow.Yellow() }
    if color == "Green"  { flow.Green() }
    if color == "Blue"   { flow.Blue() }
    if color == "Purple" { flow.Purple() }
    if color == "Cyan"   { flow.Cyan() }
    if color == "Grey"   { flow.Grey() }
}

tagByStatus = func(flow) {
    code = flow.StatusCode
    if code >= 500 {
        flow.AddTag("server-error")
        flow.Red()
        return
    }
    if code >= 400 {
        flow.AddTag("client-error")
        flow.Yellow()
    }
}

scanBody = func(flow) {
    rsp = codec.StrconvUnquote(flow.Response)~
    text = str.ToLower(string(rsp))
    for rule in BODY_RULES {
        if str.Contains(text, str.ToLower(rule.keyword)) {
            flow.AddTag(rule.tag)
            applyColor(flow, rule.color)
        }
    }
}

scanPath = func(flow) {
    url = flow.Url
    lower = str.ToLower(url)
    for rule in PATH_RULES {
        if str.Contains(lower, str.ToLower(rule.keyword)) {
            flow.AddTag(rule.tag)
            applyColor(flow, rule.color)
            return
        }
    }
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    tagByStatus(flow)
    scanPath(flow)
    scanBody(flow)
    modify(flow)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 全局热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start global flow tag coloring self test")

    makeFlow = func(url, statusCode, rsp) {
        f = make(map[string]any)
        f["Url"] = url
        f["StatusCode"] = statusCode
        f["Request"] = codec.StrconvQuote("GET " + url + " HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n")
        f["Response"] = codec.StrconvQuote(rsp)
        f["__tags"] = []
        f["__colors"] = []
        f["AddTag"] = func(t...) { for one in t { f["__tags"] = append(f["__tags"], one) } }
        f["Red"]    = func() { f["__colors"] = append(f["__colors"], "Red") }
        f["Orange"] = func() { f["__colors"] = append(f["__colors"], "Orange") }
        f["Yellow"] = func() { f["__colors"] = append(f["__colors"], "Yellow") }
        f["Green"]  = func() { f["__colors"] = append(f["__colors"], "Green") }
        f["Blue"]   = func() { f["__colors"] = append(f["__colors"], "Blue") }
        f["Purple"] = func() { f["__colors"] = append(f["__colors"], "Purple") }
        f["Cyan"]   = func() { f["__colors"] = append(f["__colors"], "Cyan") }
        f["Grey"]   = func() { f["__colors"] = append(f["__colors"], "Grey") }
        return f
    }

    saved = []
    modify = func(f) { saved = append(saved, f) }
    drop = func() { log.error("should not drop") }

    adminFlow = makeFlow("http://target/admin/users", 200, "HTTP/1.1 200 OK\\r\\n\\r\\n{\\"ok\\":1}")
    hijackSaveHTTPFlow(adminFlow, modify, drop)
    log.info(sprintf("admin tags=%v colors=%v", adminFlow["__tags"], adminFlow["__colors"]))
    assert "admin-area" in adminFlow["__tags"], "admin-area tag should be added"
    assert "Blue" in adminFlow["__colors"], "Blue color should be applied"

    creFlow = makeFlow("http://target/api/login", 500, "HTTP/1.1 500\\r\\n\\r\\n{\\"password\\":\\"x\\"}")
    hijackSaveHTTPFlow(creFlow, modify, drop)
    log.info(sprintf("login+5xx tags=%v colors=%v", creFlow["__tags"], creFlow["__colors"]))
    assert "server-error" in creFlow["__tags"], "server-error tag should be added"
    assert "login-flow" in creFlow["__tags"], "login-flow tag should be added"
    assert "credential" in creFlow["__tags"], "credential tag should be added"
    assert "Red" in creFlow["__colors"], "Red should be applied (server-error + credential)"
    assert "Green" in creFlow["__colors"], "Green should be applied (login)"

    safeFlow = makeFlow("http://target/api/items", 200, "HTTP/1.1 200 OK\\r\\n\\r\\n{\\"items\\":[]}")
    hijackSaveHTTPFlow(safeFlow, modify, drop)
    assert len(safeFlow["__tags"]) == 0, "safe flow should not be tagged"
    assert len(safeFlow["__colors"]) == 0, "safe flow should not be colored"

    assert len(saved) == 3, "all 3 flows should be saved"
    log.info("global flow tag coloring self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
  },
  {
    name: '[全局] 危险操作 Mock 保护（DELETE/PUT 自动 mock）',
    nameUi: 'GlobalHotPatch.danger_mock_protect',
    content: `/*
模版名称: [全局] 危险操作 Mock 保护（DELETE/PUT 自动 mock）
对应 i18n key: GlobalHotPatch.danger_mock_protect
关键词: 全局热加载, mockHTTPRequest, 危险操作保护, DELETE, PUT, 误操作护栏, 全站防护
适用场景: 全系统级护栏：所有 MITM/Fuzzer 流量经过此模板后，凡是 DELETE/PUT/PATCH 或 path 含 delete/destroy 的请求都被 mock 成 403，不会真到服务端
说明: 与 M12（MITM 模块版）的区别——本模板作为"全局"启用，对 MITM + WebFuzzer 流量都生效，是更高一层的安全网
参考文章: yak-project-public 024 (2025-12-05) Mock 重塑无污染客户端测试
*/

// ===== HOT PATCH TEMPLATE START =====
// 全局危险操作护栏模板
// 命中 → 直接 mockResponse 一个 403，请求不发出
DANGEROUS_METHODS = ["DELETE", "PUT", "PATCH"]
DANGEROUS_PATH_KEYWORDS = ["/delete", "/destroy", "/wipe", "/drop", "/purge", "/truncate"]
// 允许白名单 host 跳过保护（如靶场 / 测试环境）
WHITELIST_HOST_KEYWORDS = ["vulinbox", "127.0.0.1", "localhost"]

isWhitelistByUrl = func(url) {
    for h in WHITELIST_HOST_KEYWORDS {
        if str.Contains(url, h) { return true }
    }
    return false
}

isDangerousByMethod = func(method) {
    upper = str.ToUpper(method)
    for m in DANGEROUS_METHODS {
        if upper == m { return true }
    }
    return false
}

isDangerousByPath = func(url) {
    lower = str.ToLower(url)
    for kw in DANGEROUS_PATH_KEYWORDS {
        if str.Contains(lower, kw) { return true }
    }
    return false
}

buildBlockedResponse = func(method, url) {
    body = json.dumps({
        "ok": false,
        "code": 403,
        "msg": "[GLOBAL-PROTECT] dangerous operation blocked",
        "method": method,
        "url": url,
        "tip": "remove this template or add host to WHITELIST_HOST_KEYWORDS to allow",
    }, json.withIndent(""))
    return "HTTP/1.1 403 Forbidden\\r\\n" +
        "Content-Type: application/json\\r\\n" +
        "X-Yak-Global-Protect: 1\\r\\n" +
        "Content-Length: " + sprintf("%d", len(body)) + "\\r\\n\\r\\n" + body
}

mockHTTPRequest = func(isHttps, url, req, mockResponse) {
    if isWhitelistByUrl(url) {
        return
    }
    method = poc.GetHTTPRequestMethod(req)
    if isDangerousByMethod(method) || isDangerousByPath(url) {
        log.warn(sprintf("[GLOBAL-PROTECT] blocked %s %s", method, url))
        mockResponse(buildBlockedResponse(method, url))
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 全局热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start global danger mock protect self test")

    captured = {"rsp": ""}
    mockResponse = func(rsp) { captured["rsp"] = rsp }

    delReq := []byte("DELETE /api/users/1 HTTP/1.1\\r\\nHost: prod.target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://prod.target/api/users/1", delReq, mockResponse)
    assert captured["rsp"] != "", "production DELETE should be blocked"
    assert str.Contains(captured["rsp"], "GLOBAL-PROTECT"), "blocked rsp should contain global mark"

    captured["rsp"] = ""
    putReq := []byte("PUT /api/items/9 HTTP/1.1\\r\\nHost: prod.target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://prod.target/api/items/9", putReq, mockResponse)
    assert captured["rsp"] != "", "PUT should be blocked"

    captured["rsp"] = ""
    pathReq := []byte("POST /admin/users/delete HTTP/1.1\\r\\nHost: prod.target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://prod.target/admin/users/delete", pathReq, mockResponse)
    assert captured["rsp"] != "", "delete keyword path should be blocked"

    captured["rsp"] = ""
    safeReq := []byte("GET /api/users HTTP/1.1\\r\\nHost: prod.target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://prod.target/api/users", safeReq, mockResponse)
    assert captured["rsp"] == "", "GET should NOT be blocked"

    captured["rsp"] = ""
    rangeReq := []byte("DELETE /api/users/1 HTTP/1.1\\r\\nHost: vulinbox.test\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://vulinbox.test/api/users/1", rangeReq, mockResponse)
    assert captured["rsp"] == "", "vulinbox should be whitelisted"

    captured["rsp"] = ""
    localReq := []byte("DELETE /api/x HTTP/1.1\\r\\nHost: 127.0.0.1:8080\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://127.0.0.1:8080/api/x", localReq, mockResponse)
    assert captured["rsp"] == "", "127.0.0.1 should be whitelisted"

    log.info("global danger mock protect self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
  },
  {
    name: '[全局] HTTP流量测试项打标',
    nameUi: 'GlobalHotPatch.http_flow_test_tags',
    content: `// 全局 HTTP 流量候选测试项标记器。
//
// 这个插件只做“值得测什么”的流量分类，不代表已经确认存在漏洞。
// 标签统一使用 TEST: 前缀，便于前端筛选、二次 Fuzz 和报表统计。

// 全局加载时预编译，避免在每条流量上重复编译正则。
inputContentTypeRe = re2.Compile(\`content-type:.*(form-urlencoded|multipart/form-data|json)\`)~
inputBodyRe = re2.Compile(\`\\r?\\n\\r?\\n.+\`)~
htmlResponseRe = re2.Compile(\`content-type:.*(text/html|application/xhtml)|<html[\\s>]|<script[\\s>]\`)~
injectionParamRe = re2.Compile(\`(^|[?&"'])((id|name|q|query|search|keyword|filter|sort|order|where|value|input|data|cmd|command|exec|template|expr)([=:"']))\`)~
injectionPayloadRe = re2.Compile(\`(union(?:%20|\\s)+select|select(?:%20|\\s)+.+from|sleep\\s*\\(|waitfor\\s+delay|pg_sleep\\s*\\(|\\b(and|or)\\b(?:%20|\\s)+\\d+(?:%20|\\s)*=|;\\s*(cat|id|whoami|curl|wget)|\\$\\{[^}]+\\}|\\{\\{[^}]+\\}\\}|<%[^>]+%>)\`)~
commandParamRe = re2.Compile(\`(^|[?&"'])((cmd|command|exec|execute|shell|ping|host|ip)([=:"']))\`)~
commandPayloadRe = re2.Compile(\`(;|\\||&&)(\\s|%20|%09)*(cat|id|whoami|uname|curl|wget)(\\s|%20|%09|[&]|$)\`)~
sstiRe = re2.Compile(\`(\\$\\{|\\{\\{|<%|#\\{).*(\\}|%>)\`)~
authRe = re2.Compile(\`authorization:|cookie:|token=|session=|jwt=|x-api-key:\`)~
resourceIDRe = re2.Compile(\`(^|[/?&=_-])(id|uid|user_?id|account_?id|order_?id|tenant_?id|project_?id|role|permission)([/?&=_-]|\\d)\`)~
resourcePathIDRe = re2.Compile(\`/[0-9]{1,12}(/|$)\`)~
massAssignmentRe = re2.Compile(\`("|')?(role|isadmin|is_admin|permission|permissions|privilege|owner_?id)("|')?\\s*[:=]\`)~
sensitiveResponseRe = re2.Compile(\`(password|passwd|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|private[_-]?key|client[_-]?secret|authorization)\\s*[:=]|-----begin (rsa |ec |openssh )?private key-----|aws_access_key_id|akia[0-9a-z]{12,}|eyj[a-z0-9_-]{10,}\\.[a-z0-9_-]{10,}\\.\`)~
errorDisclosureRe = re2.Compile(\`stack trace|traceback \\(|exception in thread|sql syntax.*error|未处理异常|debug=true|development mode\`)~
corsRe = re2.Compile(\`access-control-allow-origin:\\s*\\*\`)~
originRe = re2.Compile(\`origin:\`)~
xssInputRe = re2.Compile(\`(q|query|search|keyword|name|title|content|comment|message|html|value|input)(=|:|%3d|")\`)~
xssPayloadRe = re2.Compile(\`<script|javascript:|onerror\\s*=|onload\\s*=|%3cscript\`)~
uploadRe = re2.Compile(\`content-type:\\s*multipart/form-data|content-disposition:\\s*form-data;[^\\r\\n]*filename=\`)~
downloadURLRe = re2.Compile(\`/download|/export|/attachment|/file|/archive|\\.((zip|tar|gz|7z|rar|pdf|csv|xlsx?)($|[?/#]))\`)~
downloadResponseRe = re2.Compile(\`content-disposition:\\s*attachment|content-type:\\s*application/(octet-stream|zip|pdf)\`)~
traversalRe = re2.Compile(\`\\.\\./|%2e%2e|%252e%252e|/etc/passwd|boot\\.ini|win\\.ini\`)~
fileSchemeRe = re2.Compile(\`file://|php://|zip://|phar://\`)~
ssrfRe = re2.Compile(\`(url|uri|link|callback|webhook|redirect|next|dest|target|image|avatar|feed|proxy|src)([=:]|%3d|")([^\\r\\n]{0,80})(https?://|file://|gopher://|dict://|127\\.0\\.0\\.1|localhost|169\\.254\\.169\\.254|0x7f000001)\`)~
redirectRe = re2.Compile(\`(redirect|next|return|dest|url)([=:]|%3d|")https?://\`)~
xmlRe = re2.Compile(\`content-type:.*(xml|soap)|<!doctype|<!entity\`)~
deserializationRe = re2.Compile(\`java\\.lang|ac\\s*ed|__viewstate|@type\\s*[:=]|o:\\d+:"|php serialized\`)~
authenticationRe = re2.Compile(\`authorization:|set-cookie:|cookie:.*(session|token|sid)\`)~
cookieRe = re2.Compile(\`cookie:\`)~
csrfTokenRe = re2.Compile(\`csrf|xsrf|x-csrf-token|x-xsrf-token|nonce\`)~

match = func(pattern, source) {
    return pattern.MatchString(source)~
}

tag = func(flow, name) {
    flow.AddTag("TEST:" + name)
}

containsAny = func(source, words) {
    for word in words {
        if str.Contains(source, word) {
            return true
        }
    }
    return false
}

hasInput = func(req) {
    return str.Contains(req, "?") || match(inputContentTypeRe, req) || match(inputBodyRe, req)
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    req = flow.GetRequest()
    rsp = flow.GetResponse()
    url = str.ToLower(flow.Url)
    requestLower = str.ToLower(req)
    responseLower = str.ToLower(rsp)
    method = ""
    requestLines = str.ParseStringToLines(req)
    if len(requestLines) > 0 {
        methodParts = str.Split(requestLines[0], " ")
        if len(methodParts) > 0 {
            method = str.ToUpper(methodParts[0])
        }
    }

    input = hasInput(requestLower)
    stateChanging = method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE"
    htmlResponse = match(htmlResponseRe, responseLower)

    // A05 Injection: SQL、命令、模板、表达式和高风险参数输入。
    injectionParam = match(injectionParamRe, requestLower)
    injectionPayload = match(injectionPayloadRe, requestLower)
    if input && (injectionParam || injectionPayload) {
        tag(flow, "Injection")
    }
    if injectionParam || injectionPayload {
        tag(flow, "SQLi")
    }
    // re2 默认多行匹配，参数识别避开普通 Host 请求头。
    commandInput = url + "\\n" + str.ToLower(string(poc.GetHTTPPacketBody(req)))
    if match(commandParamRe, commandInput) || match(commandPayloadRe, requestLower) {
        tag(flow, "CommandInjection")
    }
    if match(sstiRe, requestLower) {
        tag(flow, "SSTI")
    }

    // A01 Broken Access Control / IDOR: 带身份态的资源 ID、租户和角色操作。
    hasAuth = match(authRe, requestLower)
    resourceID = match(resourceIDRe, url+requestLower) || match(resourcePathIDRe, url)
    if resourceID && (hasAuth || stateChanging) {
        tag(flow, "AccessControl")
        tag(flow, "IDOR")
    }
    if match(massAssignmentRe, requestLower) {
        tag(flow, "MassAssignment")
    }

    // 敏感信息、密钥、调试信息和不安全的跨域配置。
    if match(sensitiveResponseRe, responseLower) {
        tag(flow, "SensitiveInformation")
    }
    if match(errorDisclosureRe, responseLower) {
        tag(flow, "InformationDisclosure")
    }
    if match(corsRe, responseLower) && match(originRe, requestLower) {
        tag(flow, "CORS")
    }

    // HTML 响应与用户可控输入同时出现，进入反射/存储 XSS 测试队列。
    if htmlResponse && (match(xssInputRe, requestLower) || match(xssPayloadRe, requestLower)) {
        tag(flow, "XSS")
    }

    // 文件上传、下载与路径穿越/LFI。
    if match(uploadRe, requestLower) {
        tag(flow, "FileUpload")
    }
    if match(downloadURLRe, url) || match(downloadResponseRe, responseLower) {
        tag(flow, "FileDownload")
    }
    if match(traversalRe, requestLower) ||
        (containsAny(requestLower, ["filename", "filepath", "path", "file", "template", "page"]) && match(fileSchemeRe, requestLower)) {
        tag(flow, "PathTraversal")
        tag(flow, "FileInclusion")
    }

    // SSRF、重定向和 XML/反序列化输入。
    if match(ssrfRe, requestLower) {
        tag(flow, "SSRF")
    }
    if match(redirectRe, requestLower) {
        tag(flow, "OpenRedirect")
    }
    if match(xmlRe, requestLower) {
        tag(flow, "XXE")
    }
    if match(deserializationRe, requestLower) {
        tag(flow, "Deserialization")
    }

    // 登录、令牌和带 Cookie 的状态变更请求。
    if containsAny(url, ["/login", "/signin", "/oauth", "/token", "/session", "/password", "/reset"]) ||
        match(authenticationRe, requestLower+responseLower) {
        tag(flow, "Authentication")
    }
    if stateChanging && match(cookieRe, requestLower) && !match(csrfTokenRe, requestLower) {
        tag(flow, "CSRF")
    }

    // 保存链路要求 hook 必须显式放行修改后的 flow。
    modify(flow)
}

// 命令行运行模板时执行；作为热加载加载时不执行。
func runSelfTest() {
    cases = [
        {"path": "/health", "body": "", "expected": []},
        {"path": "/ping?host=example.com", "body": "", "expected": ["CommandInjection"]},
        {"path": "/ping", "body": "host=example.com", "expected": ["CommandInjection"]},
        {"path": "/run?cmd=whoami", "body": "", "expected": ["Injection", "SQLi", "CommandInjection"]},
        {"path": "/run", "body": "cmd=whoami", "expected": ["Injection", "SQLi", "CommandInjection"]},
        {"path": "/run", "body": "foo; id", "expected": ["Injection", "SQLi", "CommandInjection"]},
        {"path": "/run", "body": "foo && whoami", "expected": ["CommandInjection"]},
        {"path": "/run", "body": "foo;%20id", "expected": ["CommandInjection"]},
        {"path": "/run", "body": "foo&&%09whoami", "expected": ["CommandInjection"]},
        {"path": "/run", "body": "foo; identity", "expected": ["Injection", "SQLi"]},
        {"path": "/?return=https://evil.example", "body": "", "expected": ["OpenRedirect"]},
        {"path": "/?redirect=https://evil.example", "body": "", "expected": ["SSRF", "OpenRedirect"]},
    ]
    for c in cases {
        request = "POST " + c.path + " HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n" + c.body
        response = "HTTP/1.1 200 OK\\r\\n\\r\\nok"
        flow = make(map[string]any)
        flow["Url"] = "http://example.com" + c.path
        flow["GetRequest"] = func() { return request }
        flow["GetResponse"] = func() { return response }
        flow["tags"] = ["existing"]
        flow["AddTag"] = func(name) { flow["tags"] = append(flow["tags"], name) }
        forwarded = 0
        hijackSaveHTTPFlow(flow, func(f) {
            assert f == flow, "must forward the original flow"
            forwarded++
        }, func() { die("must not drop flow") })
        assert forwarded == 1, "must explicitly forward once"
        assert "existing" in flow.tags, "must preserve existing tags"
        assert len(flow.tags) == len(c.expected) + 1, sprintf("unexpected tags: %v for %v", flow.tags, c)
        for name in c.expected {
            assert ("TEST:" + name) in flow.tags, sprintf("missing %v for %v", name, c)
        }
    }
    log.info("HTTP flow test tagging self test passed: 12 cases")
}

if YAK_MAIN {
    runSelfTest()
}`,
  },
]

export const useGlobalHotPatch = create<GlobalHotPatchStore>((set, get) => ({
  globalHotPatchConfig: null,

  setGlobalHotPatchConfig: (config) => set({ globalHotPatchConfig: config }),

  loadGlobalHotPatchConfig: async () => {
    try {
      const res: GlobalHotPatchConfig = await ipcRenderer.invoke('GetGlobalHotPatchConfig', {})
      set({ globalHotPatchConfig: res })
    } catch (error) {
      yakitFailed(error + '')
    }
  },

  enableGlobalHotPatch: async (name: string) => {
    const { globalHotPatchConfig, loadGlobalHotPatchConfig } = get()
    const expectedVersion = globalHotPatchConfig?.Version || '0'
    try {
      const res: GlobalHotPatchConfig = await ipcRenderer.invoke('SetGlobalHotPatchConfig', {
        Config: { Enabled: true, Version: expectedVersion, Items: [{ Name: name, Type: 'global', Enabled: true }] },
        ExpectedVersion: expectedVersion,
      })
      set({ globalHotPatchConfig: res })
    } catch (error) {
      yakitFailed(error + '')
      await loadGlobalHotPatchConfig()
    }
  },

  disableGlobalHotPatch: async () => {
    const { globalHotPatchConfig, loadGlobalHotPatchConfig } = get()
    const expectedVersion = globalHotPatchConfig?.Version || '0'
    try {
      const res: GlobalHotPatchConfig = await ipcRenderer.invoke('SetGlobalHotPatchConfig', {
        Config: {
          Enabled: false,
          Version: expectedVersion,
          Items: [],
        },
        ExpectedVersion: expectedVersion,
      })
      set({ globalHotPatchConfig: res })
    } catch (error) {
      yakitFailed(error + '')
      await loadGlobalHotPatchConfig()
    }
  },
}))

export const useGlobalHotPatchTag = () => {
  const config = useGlobalHotPatch((s) => s.globalHotPatchConfig)
  const globalEnabledTemplateName = config?.Enabled ? config?.Items?.[0]?.Name || '' : ''
  const onDisableGlobalHotPatch = () => useGlobalHotPatch.getState().disableGlobalHotPatch()
  return { globalEnabledTemplateName, onDisableGlobalHotPatch }
}

export const GLOBAL_HOT_PATCH_AUTO_START = 'global-hot-patch-auto-start'

export const autoEnableGlobalHotPatch = async () => {
  try {
    const name = ((await ipcRenderer.invoke('GetKey', { Key: GLOBAL_HOT_PATCH_AUTO_START })) || '').trim()
    if (!name) return
    const res: { Data?: Array<{ Name?: string }> } = await ipcRenderer.invoke('QueryHotPatchTemplate', {
      Type: 'global',
      Name: [name],
    })
    if (!res?.Data?.some((item) => item.Name === name)) {
      await ipcRenderer.invoke('SetKey', { Key: GLOBAL_HOT_PATCH_AUTO_START, Value: '' })
      return
    }
    await useGlobalHotPatch.getState().loadGlobalHotPatchConfig()
    if (!useGlobalHotPatch.getState().globalHotPatchConfig) return
    await useGlobalHotPatch.getState().enableGlobalHotPatch(name)
  } catch (error) {
    yakitFailed(error + '')
  }
}
