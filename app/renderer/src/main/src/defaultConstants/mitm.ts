import { ChromeLauncherParams } from '@/pages/mitm/MITMChromeLauncher'
import { MITMAdvancedFilter, MITMFilterData, MITMFilterSchema } from '@/pages/mitm/MITMServerStartForm/MITMFilters'
import { v4 as uuidv4 } from 'uuid'
import { HotPatchDefaultContent } from '@/defaultConstants/HTTPFuzzerPage'

// 浏览器启动最小参数配置
export const chromeLauncherMinParams: ChromeLauncherParams[] = [
  {
    id: uuidv4(),
    parameterName: '--no-first-run',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '启动时跳过首次运行向导',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--ignore-certificate-errors',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '忽略 SSL 证书错误',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--test-type',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '表示这是一个测试实例',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--proxy-bypass-list',
    variableValues: '<-loopback>',
    variableType: 'input',
    disabled: false,
    desc: '为代理设置回避列表，不代理回环地址',
    default: true,
  },
]

export const chromeLauncherParamsArr: ChromeLauncherParams[] = [
  {
    id: uuidv4(),
    parameterName: '--no-system-proxy-config-service',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用系统代理配置服务',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--proxy-bypass-list',
    variableValues: '<-loopback>',
    variableType: 'input',
    disabled: false,
    desc: '为代理设置回避列表，不代理回环地址',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--ignore-certificate-errors',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '忽略 SSL 证书错误',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--test-type',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '表示这是一个测试实例',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-sandbox',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: 'https://stackoverflow.com/questions/64788142/nodejs-error-connect-econnrefused-127-0-0-1port-chrome-remote-interface',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--ignore-urlfetcher-cert-requests',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '忽略 URL fetcher 的证书请求',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-webrtc',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用 WebRTC',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-component-extensions-with-background-pages',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用带有背景页的组件扩展',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-extensions',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用所有扩展',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-notifications',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用通知',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--force-webrtc-ip-handling-policy',
    variableValues: 'default_public_interface_only',
    variableType: 'input',
    disabled: false,
    desc: '强制 WebRTC IP 处理策略仅使用默认的公共接口',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-ipc-flooding-protection',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用 IPC 洪水攻击保护',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-xss-auditor',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用 XSS 审查器',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-bundled-ppapi-flash',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用捆绑的 PPAPI Flash 版本',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-plugins-discovery',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁止插件发现',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-default-apps',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用默认应用',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-prerender-local-predictor',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用本地预加载页面的预测功能',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-sync',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用同步功能',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-breakpad',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用 Breakpad 崩溃报告',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-crash-reporter',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用崩溃报告器',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disk-cache-size',
    variableValues: '0',
    variableType: 'input',
    disabled: false,
    desc: '设置磁盘缓存大小为 0',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-settings-window',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用设置窗口',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-speech-api',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用语音API',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-file-system',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用文件系统API',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-presentation-api',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用演示API',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-permissions-api',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用权限API',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-new-zip-unpacker',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用新 ZIP 解压功能',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-media-session-api',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用媒体会话API',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-experiments',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁止实验',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-events',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '不发送事件',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-first-run',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '启动时跳过首次运行向导',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-default-browser-check',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '启动时不检查默认浏览器',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-pings',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '禁用 ping 跟踪',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--no-service-autorun',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '不自动运行服务',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--media-cache-size',
    variableValues: '0',
    variableType: 'input',
    disabled: true,
    desc: '设置媒体缓存大小为0',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--use-fake-device-for-media-stream',
    variableValues: '',
    variableType: 'bool',
    disabled: true,
    desc: '使用虚拟设备来捕获媒体流',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--dbus-stub',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '使用 DBus 存根',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-background-networking',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '禁用后台网络活动',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-component-update',
    variableValues: '',
    variableType: 'bool',
    disabled: false,
    desc: '不要更新 chrome://components/ 中列出的浏览器“组件”',
    default: true,
  },
  {
    id: uuidv4(),
    parameterName: '--disable-features',
    variableValues: 'ChromeWhatsNewUI,HttpsUpgrades,OptimizationHints',
    variableType: 'input',
    disabled: false,
    desc: '禁用特定的功能。',
    default: true,
  },
]

export const defaultMITMAdvancedFilter: MITMAdvancedFilter = {
  Field: 'ExcludeHostnames',
  MatcherType: 'regexp',
  Group: [''],
}

export const defaultMITMBaseFilter: MITMFilterSchema = {
  includeHostname: [],
  excludeHostname: [],
  includeSuffix: [],
  excludeSuffix: [],
  filterBundledStaticJS: true,
  excludeMethod: [],
  excludeContentTypes: [],
  excludeUri: [],
  includeUri: [],
}

export const defaultMITMFilterData: MITMFilterData = {
  IncludeHostnames: [],
  ExcludeHostnames: [],
  IncludeSuffix: [],
  ExcludeSuffix: [],
  IncludeUri: [],
  ExcludeUri: [],
  ExcludeMethods: [],
  ExcludeMIME: [],
  FilterBundledStaticJS: true,
}

export const MITMHotPatchTempDefault = [
  {
    name: '加解密模板',
    temp: `// 假设响应加密方式为 aes-cbc
// 秘钥(key)为1234567890123456,向量(iv)为1234567890123456
// 例如响应为{"encrypted":"nwvjULjLOqzUFt9nQt+gVg==", "key":"1234567890123456", "iv":"1234567890123456"}
key = "1234567890123456"
iv = "1234567890123456"
decrypt = func(rsp) {
    body = poc.GetHTTPPacketBody(rsp)
    data = json.loads(body)
    if "encrypted" in data {
        encrypted = data.encrypted
        encrypted = codec.DecodeBase64(encrypted)~ // 一般会将密文base64一次,所以要先解码
        decrypted = codec.AESCBCDecrypt(key, encrypted, iv)~
        if decrypted != "" {
            rsp = poc.ReplaceHTTPPacketBody(rsp, decrypted) // 替换body
        }
    }
    return rsp
}

encrypt = func(rsp) {
    body = poc.GetHTTPPacketBody(rsp)
    encrypted = codec.AESCBCEncrypt(key, body, iv)~
    encrypted = codec.EncodeBase64(encrypted)
    encryptedBody = omap({"encrypted":encrypted, "key":key, "iv":iv})
    rsp = poc.ReplaceHTTPPacketBody(rsp, json.dumps(encryptedBody)) // 替换body
    return rsp
}

// hijackHTTPResponseEx 是hijackHTTPResponse的扩展，能够获取到响应对应的请求，会在过滤后的响应到达Yakit MITM前被调用，可以通过该函数提前将响应修改或丢弃
// !!! 通常实现hijackHTTPResponse 或 hijackHTTPResponseEx 其中一个函数即可
// isHttps 请求是否为https请求
// url 网站URL
// req 请求
// rsp 响应
// forward(req) 提交修改后的响应，如果未被调用，则使用原始的响应
// drop() 丢弃响应
hijackHTTPResponseEx = func(isHttps  /*bool*/, url  /*string*/, req/*[]byte*/, rsp /*[]byte*/, forward /*func(modifiedResponse []byte)*/, drop /*func()*/) {
    // 这里要对劫持的响应做解密再返回给Yakit
    rsp = decrypt(rsp)
    forward(rsp)
}

// afterRequest 会在响应到达客户端之前被调用,可以通过该函数对响应做最后一次修改
// isHttps 请求是否为https请求
// oreq 原始请求
// req hijackRequest修改后的请求
// orsp 原始响应
// rsp hijackHTTPResponse/hijackHTTPResponseEx修改后的响应
// 返回值: 修改后的响应,如果没有返回值则使用hijackHTTPResponse/hijackHTTPResponseEx修改后的响应
afterRequest = func(ishttps, oreq/*原始请求*/ ,req/*hiajck修改之后的请求*/ ,orsp/*原始响应*/ ,rsp/*hijack修改后的响应*/){
    // Yakit查看之后需要再加密回去
    // !!! 也可以不加密回去,这样客户端拿到的也是解密后的数据
    // 如果这里不加密,那么后续hijackSaveHTTPFlow也不需要再解密
    rsp = encrypt(rsp)
    return rsp
}

// hijackSaveHTTPFlow 会在流量被存储到数据库前被调用,可以通过该函数对入库前的流量进行修改,例如修改请求/响应,添加tag/染色等
// flow 流量结构体,可以通过鼠标悬浮提示查看其拥有的字段并对其进行修改
// modify(modified) 提交修改后的流量结构体，如果未被调用，则使用原始的流量结构体
// drop() 丢弃流量
hijackSaveHTTPFlow = func(flow /* *yakit.HTTPFlow */, modify /* func(modified *yakit.HTTPFlow) */, drop/* func() */) {
    // flow.Request 转义后的请求
    // flow.Response 转义后的响应
    // 对于转义后的请求和响应,需要通过以下方式拿到原始的请求/响应
    // req = str.Unquote(flow.Request)~
    // rsp = str.Unquote(flow.Response)~
    // 对于修改后的请求和响应,需要通过以下方式再将其转义回去
    // flow.Request = str.Quote(req)
    // flow.Response = str.Quote(rsp)
    // flow.AddTag("tag") // 添加tag
    // flow.Red() // 染红色
    // 需要在流量中再将数据解密
    rsp = str.Unquote(flow.Response)~
    rsp = decrypt(rsp)
    flow.Response = str.Quote(rsp)
    modify(flow)
}`,
    isDefault: true,
  },
  {
    name: 'MockHttp模板',
    temp: `// mockHTTPRequest 会在请求即将发往真实服务器之前被调用。
// 你可以通过调用 mockResponse(fakeResponse) 来伪造一个响应直接返回给客户端，从而阻止原始请求被发送。
// isHttps    (bool):                  请求是否为HTTPS协议。
// url        (string):                请求的完整URL。
// req        ([]byte):                完整的原始HTTP请求报文。
// mockResponse func(fakeResponse string): 回调函数，用于注入虚假的响应。
mockHTTPRequest = func(isHttps, url, req, mockResponse) {
    // 场景1：Mock一个成功的JSON响应 (例如：获取用户信息)
    // 适用于测试前端在拿到正确数据后，UI是否能正常渲染。
    if str.Contains(url, "/api/user/profile") {
        yakit.Info("[MOCK] 拦截到用户信息请求，返回成功的模拟数据: " + url)
        // 构造一个合法的 HTTP 响应报文
        // 关键点:
        // 1. 状态行: "HTTP/1.1 200 OK"
        // 2. 响应头: 至少要有 Content-Type，跨域的请求需要 Access-Control-Allow-Origin
        // 3. 空行: 响应头和响应体之间必须有一个空行 \`\\r\\n\\r\\n\`
        // 4. 响应体: JSON 字符串
        successResponse := "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\nAccess-Control-Allow-Origin: *\\r\\n\\r\\n" + 
                           \`{"ok":true, "code": 200, "data": {"username": "mock-user", "email": "mock@example.com", "level": 99}}\`
        
        // 调用 mockResponse 将伪造的响应返回给客户端
        mockResponse(successResponse)
    }
    // 场景2：Mock一个失败的响应 (例如：服务端错误)
    // 适用于测试前端在遇到服务器5xx错误时，是否能优雅地处理并给出提示。
    if str.Contains(url, "/api/submit/order") {
        yakit.Info("[MOCK] 拦截到订单提交请求，返回服务器错误: " + url)
        
        errorResponse := "HTTP/1.1 503 Service Unavailable\\r\\nContent-Type: application/json\\r\\nAccess-Control-Allow-Origin: *\\r\\n\\r\\n" +
                          \`{"ok":false, "message": "服务暂时不可用，请稍后再试"}\`
        
        mockResponse(errorResponse)
    }
    // 场景3：根据请求体内容进行复杂判断和Mock (例如：阻止危险操作)
    // 适用于测试前端对特定输入的处理，或防止测试时产生垃圾数据。
    if str.Contains(url, "/api/data/delete") && str.Contains(string(req), \`"is_production":true\`) {
        yakit.Info("[MOCK] 检测到危险的删除操作，已拦截并返回'禁止操作'响应: " + url)
        
        // 返回一个 403 Forbidden 响应
        forbiddenResponse := "HTTP/1.1 403 Forbidden\\r\\nContent-Type: application/json\\r\\nAccess-Control-Allow-Origin: *\\r\\n\\r\\n" +
                             \`{"ok":false, "message": "模拟环境禁止删除线上数据！"}\`
        mockResponse(forbiddenResponse)
    }
    // 如果以上 if 条件都没有命中，函数会默认结束，Yakit将正常处理该请求（即将其发往后端服务器）。
}`,
    isDefault: true,
  },
  {
    name: '[请求] hijackHTTPRequest 改 JSON 字段（金额/折扣演示）',
    temp: `/*
模版名称: [请求] hijackHTTPRequest 改 JSON 字段（金额/折扣演示）
关键词: hijackHTTPRequest, JSON 字段改写, 业务篡改, 金额, 折扣
适用场景: 演示前端把订单金额/折扣写死在 JS 校验，MITM 在出站前修改 JSON 字段（如金额变负、折扣放大）
参考文章: yak-project-public 031 (2025-10-17) MITM 热加载全流程解析 场景一
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackHTTPRequest 改 JSON 字段模板
// 流程: 命中目标路径 → JSON 解析 body → 改写指定字段 → forward 出站
// 不调用 drop()，未命中也走 forward(req) 保证后续插件能继续处理
TARGET_PATH = "/api/order/create"  /* 仅对该路径生效 */
FIELD_NAME = "amount"               /* 要改写的字段名 */
NEW_VALUE = -1                      /* 改写后的值，演示用负数 */

modifyJSONField = func(req) {
    body = poc.GetHTTPPacketBody(req)
    if len(body) == 0 {
        return req
    }
    params = json.loads(string(body))
    if params == nil {
        return req
    }
    if !(FIELD_NAME in params) {
        return req
    }
    params[FIELD_NAME] = NEW_VALUE
    newBody = json.dumps(params, json.withIndent(""))
    return poc.ReplaceHTTPPacketBody(req, newBody)
}

hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if !str.Contains(url, TARGET_PATH) {
        forward(req)
        return
    }
    newReq = modifyJSONField(req)
    forward(newReq)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hijack modify json field self test")

    targetReq = sprintf(\`POST %s HTTP/1.1
Host: shop.example.com
Content-Type: application/json

{"amount":100,"product_id":42}\`, TARGET_PATH)

    captured = {"req": []byte(""), "dropped": false}
    forward = func(b) { captured["req"] = b }
    drop = func() { captured["dropped"] = true }

    hijackHTTPRequest(false, "http://shop.example.com"+TARGET_PATH, []byte(targetReq), forward, drop)
    assert !captured["dropped"], "target should NOT be dropped"
    assert len(captured["req"]) > 0, "target should be forwarded with non-empty req"

    newBody = string(poc.GetHTTPPacketBody(captured["req"]))
    log.info("forwarded body: " + newBody)
    newParams = json.loads(newBody)
    assert int(newParams.amount) == NEW_VALUE, "amount should be rewritten"
    assert int(newParams.product_id) == 42, "other fields should remain"

    otherReq := []byte(\`GET /api/healthz HTTP/1.1
Host: shop.example.com

\`)
    captured["req"] = []byte("")
    hijackHTTPRequest(false, "http://shop.example.com/api/healthz", otherReq, forward, drop)
    assert string(captured["req"]) == string(otherReq), "non-target req should be forwarded unchanged"

    log.info("hijack modify json field self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[请求] hijackHTTPRequest 注入 X-Auth-Token / Cookie',
    temp: `/*
模版名称: [请求] hijackHTTPRequest 注入 X-Auth-Token / Cookie
关键词: hijackHTTPRequest, Authorization, X-Auth-Token, Cookie 注入, 全局认证
适用场景: 在 MITM 出站前自动给目标 host 的所有请求补一个 Authorization Bearer 或额外 Cookie，避免每个工具单独配置认证
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackHTTPRequest 注入认证头模板
// 对匹配 TARGET_HOST 的所有请求注入 Authorization 与额外 Cookie
TARGET_HOST = "api.example.com"          /* 仅对该 host 注入 */
INJECT_AUTH = "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature"
EXTRA_COOKIE = "session=mitm-injected"   /* 追加的 Cookie 键值 */

isTargetByUrl = func(url) {
    return str.Contains(url, TARGET_HOST)
}

injectAuth = func(req) {
    req = poc.ReplaceHTTPPacketHeader(req, "Authorization", INJECT_AUTH)
    return poc.AppendHTTPPacketCookie(req, str.SplitN(EXTRA_COOKIE, "=", 2)[0], str.SplitN(EXTRA_COOKIE, "=", 2)[1])
}

hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if !isTargetByUrl(url) {
        forward(req)
        return
    }
    forward(injectAuth(req))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hijack inject token header self test")

    targetReq := []byte(\`GET /v1/profile HTTP/1.1
Host: api.example.com
Cookie: lang=zh

\`)
    captured = {"req": []byte(""), "dropped": false}
    forward = func(b) { captured["req"] = b }
    drop = func() { captured["dropped"] = true }

    hijackHTTPRequest(false, "http://api.example.com/v1/profile", targetReq, forward, drop)
    assert !captured["dropped"], "target should NOT be dropped"

    auth = poc.GetHTTPPacketHeader(captured["req"], "Authorization")
    log.info("injected authorization: " + auth)
    assert auth == INJECT_AUTH, "Authorization header mismatch"

    cookie = poc.GetHTTPPacketCookie(captured["req"], "session")
    log.info("injected session cookie: " + cookie)
    assert cookie == "mitm-injected", "session cookie mismatch"

    langCookie = poc.GetHTTPPacketCookie(captured["req"], "lang")
    assert langCookie == "zh", "existing cookie should be preserved"

    otherReq := []byte(\`GET / HTTP/1.1
Host: other.example.com

\`)
    captured["req"] = []byte("")
    hijackHTTPRequest(false, "http://other.example.com/", otherReq, forward, drop)
    assert poc.GetHTTPPacketHeader(captured["req"], "Authorization") == "", "non-target should NOT be injected"

    log.info("hijack inject token header self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[请求] hijackHTTPRequest 黑名单 drop 静态资源/敏感 host',
    temp: `/*
模版名称: [请求] hijackHTTPRequest 黑名单 drop 静态资源/敏感 host
关键词: hijackHTTPRequest, drop, 黑名单, 静态资源, 噪音过滤, 广告统计屏蔽
适用场景: MITM 抓包时希望直接丢弃静态资源（.css/.js/.png 等）或第三方统计/广告 host，减少数据库噪音，避免影响业务排查
说明: yakit 的 MITM 过滤器只能"不入库"，drop() 才会真正阻断请求；本模板适用于希望浏览器都加载不到这些资源的场景
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackHTTPRequest 黑名单 drop 模板
// 命中黑名单 host 或文件后缀 → drop()，未命中 → forward
STATIC_SUFFIX = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".svg"]
BLACKLIST_HOST = ["googletagmanager.com", "google-analytics.com", "doubleclick.net", "baidu-stat", "umeng.com"]

matchStaticSuffix = func(url) {
    lower = str.ToLower(url)
    for suffix in STATIC_SUFFIX {
        if str.Contains(lower, suffix+"?") || str.HasSuffix(lower, suffix) {
            return true
        }
    }
    return false
}

matchBlacklistHost = func(url) {
    for h in BLACKLIST_HOST {
        if str.Contains(url, h) {
            return true
        }
    }
    return false
}

shouldDrop = func(url) {
    return matchStaticSuffix(url) || matchBlacklistHost(url)
}

hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if shouldDrop(url) {
        drop()
        return
    }
    forward(req)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hijack drop blacklist self test")

    mockReq := []byte("GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n")
    captured = {"forwarded_count": 0, "dropped_count": 0}
    forward = func(b) { captured["forwarded_count"] = captured["forwarded_count"] + 1 }
    drop = func() { captured["dropped_count"] = captured["dropped_count"] + 1 }

    droppedUrls = [
        "http://example.com/static/app.css",
        "http://example.com/assets/logo.png?v=2",
        "https://www.googletagmanager.com/gtag/js",
        "https://google-analytics.com/collect",
        "http://cdn.example.com/lib.woff2",
    ]
    for u in droppedUrls {
        hijackHTTPRequest(str.HasPrefix(u, "https://"), u, mockReq, forward, drop)
    }
    assert captured["dropped_count"] == len(droppedUrls), sprintf("expected %d drops, got %d", len(droppedUrls), captured["dropped_count"])
    assert captured["forwarded_count"] == 0, "no blacklisted url should be forwarded"

    captured["forwarded_count"] = 0
    captured["dropped_count"] = 0
    keptUrls = [
        "http://example.com/api/users",
        "http://example.com/page.html",
        "https://api.example.com/v1/data",
    ]
    for u in keptUrls {
        hijackHTTPRequest(str.HasPrefix(u, "https://"), u, mockReq, forward, drop)
    }
    assert captured["forwarded_count"] == len(keptUrls), "all business urls should be forwarded"
    assert captured["dropped_count"] == 0, "no business url should be dropped"

    log.info("hijack drop blacklist self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[响应] hijackHTTPResponseEx 删除阻断 JS (alert / location.href)',
    temp: `/*
模版名称: [响应] hijackHTTPResponseEx 删除阻断 JS (alert / location.href)
关键词: hijackHTTPResponseEx, JS 改写, alert 注释, location.href 屏蔽, 前端跳转拦截
适用场景: 测试时前端 JS 经常自动 alert/跳走/刷新打断调试，MITM 在响应入站前用正则把这些 JS 改成无害字符串，让浏览器可以停在调试页面
参考文章: yak-project-public 031 (2025-10-17) MITM 热加载全流程解析 场景二
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackHTTPResponseEx 删除阻断 JS 模板
// 仅对 Content-Type 含 javascript / html 的响应做改写
// 把 alert( / location.href= / location.replace( / window.close( 改成无副作用的 console.log
JS_REPLACEMENTS = [
    ["alert(", "console.log('ALERT_BYPASSED',"],
    ["location.href", "window.__bypassed_href"],
    ["location.replace(", "console.log('REPLACE_BYPASSED',"],
    ["window.close(", "console.log('CLOSE_BYPASSED',"],
]

needRewriteResponse = func(rsp) {
    ct = poc.GetHTTPPacketHeader(rsp, "Content-Type")
    lower = str.ToLower(ct)
    return str.Contains(lower, "javascript") || str.Contains(lower, "html") || str.Contains(lower, "text/x-script")
}

stripBlockingJS = func(rsp) {
    if !needRewriteResponse(rsp) {
        return rsp
    }
    body = string(poc.GetHTTPPacketBody(rsp))
    if body == "" {
        return rsp
    }
    for pair in JS_REPLACEMENTS {
        body = str.ReplaceAll(body, pair[0], pair[1])
    }
    return poc.ReplaceHTTPPacketBody(rsp, body)
}

hijackHTTPResponseEx = func(isHttps, url, req, rsp, forward, drop) {
    forward(stripBlockingJS(rsp))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hijack response strip js self test")

    jsBody = \`function init() { alert("admin only"); location.href = "/login"; }\`
    jsRsp := []byte("HTTP/1.1 200 OK\\r\\nContent-Type: application/javascript\\r\\n\\r\\n" + jsBody)

    captured = {"rsp": []byte(""), "dropped": false}
    forward = func(b) { captured["rsp"] = b }
    drop = func() { captured["dropped"] = true }

    hijackHTTPResponseEx(false, "http://target/app.js", []byte("GET /app.js"), jsRsp, forward, drop)
    newBody = string(poc.GetHTTPPacketBody(captured["rsp"]))
    log.info("rewritten js: " + newBody)
    assert !str.Contains(newBody, "alert("), "alert should be replaced"
    assert !str.Contains(newBody, "location.href ="), "location.href= should be replaced"
    assert str.Contains(newBody, "ALERT_BYPASSED"), "should contain bypass marker"
    assert str.Contains(newBody, "__bypassed_href"), "should contain bypassed href marker"

    htmlBody = \`<html><script>location.replace('/login'); window.close();</script></html>\`
    htmlRsp := []byte("HTTP/1.1 200 OK\\r\\nContent-Type: text/html; charset=utf-8\\r\\n\\r\\n" + htmlBody)
    hijackHTTPResponseEx(false, "http://target/index.html", []byte("GET /"), htmlRsp, forward, drop)
    htmlNew = string(poc.GetHTTPPacketBody(captured["rsp"]))
    log.info("rewritten html: " + htmlNew)
    assert str.Contains(htmlNew, "REPLACE_BYPASSED"), "html replace should be bypassed"
    assert str.Contains(htmlNew, "CLOSE_BYPASSED"), "html close should be bypassed"

    jsonBody = \`{"alert(":1,"location.href":"x"}\`
    jsonRsp := []byte("HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n" + jsonBody)
    hijackHTTPResponseEx(false, "http://target/api/data", []byte("GET /api/data"), jsonRsp, forward, drop)
    jsonNew = string(poc.GetHTTPPacketBody(captured["rsp"]))
    assert jsonNew == jsonBody, "json response should NOT be rewritten"

    log.info("hijack response strip js self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[响应] hijackHTTPResponseEx 宽松 CORS / 删 CSP / 去 HttpOnly',
    temp: `/*
模版名称: [响应] hijackHTTPResponseEx 宽松 CORS / 删 CSP / 去 HttpOnly
关键词: hijackHTTPResponseEx, CORS, CSP, X-Frame-Options, HttpOnly, Set-Cookie, 安全头改写
适用场景: 安全研究/调试时需要让浏览器跨域访问、可在 iframe 嵌入页面、JS 能读 Cookie，本模板把响应安全头改成宽松值方便测试
警告: 仅用于授权环境调试，不要在生产环境使用
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackHTTPResponseEx 改写安全相关响应头
//   1. Access-Control-Allow-Origin = *  并允许凭据
//   2. 删除 Content-Security-Policy / X-Frame-Options / X-Content-Type-Options
//   3. 把 Set-Cookie 中的 HttpOnly / Secure / SameSite=Strict 去掉
WEAK_CORS_HEADERS = [
    ["Access-Control-Allow-Origin", "*"],
    ["Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS"],
    ["Access-Control-Allow-Headers", "*"],
    ["Access-Control-Allow-Credentials", "true"],
]
HEADERS_TO_DROP = [
    "Content-Security-Policy",
    "Content-Security-Policy-Report-Only",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Strict-Transport-Security",
]

loosenCookies = func(rsp) {
    cookies = poc.GetHTTPPacketHeaders(rsp)["Set-Cookie"]
    if cookies == nil {
        return rsp
    }
    rsp = poc.DeleteHTTPPacketHeader(rsp, "Set-Cookie")
    cookieList = cookies
    if typeof(cookieList).String() == "string" {
        cookieList = [cookieList]
    }
    for c in cookieList {
        nc = c
        for attr in ["HttpOnly", "Secure", "SameSite=Strict", "SameSite=Lax"] {
            nc = str.ReplaceAll(nc, "; "+attr, "")
            nc = str.ReplaceAll(nc, ";"+attr, "")
        }
        rsp = poc.AppendHTTPPacketHeader(rsp, "Set-Cookie", nc)
    }
    return rsp
}

rewriteSecurityHeaders = func(rsp) {
    for pair in WEAK_CORS_HEADERS {
        rsp = poc.ReplaceHTTPPacketHeader(rsp, pair[0], pair[1])
    }
    for h in HEADERS_TO_DROP {
        rsp = poc.DeleteHTTPPacketHeader(rsp, h)
    }
    return loosenCookies(rsp)
}

hijackHTTPResponseEx = func(isHttps, url, req, rsp, forward, drop) {
    forward(rewriteSecurityHeaders(rsp))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start hijack response rewrite security headers self test")

    mockRsp := []byte(\`HTTP/1.1 200 OK
Content-Type: application/json
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
Access-Control-Allow-Origin: https://app.example.com
Set-Cookie: SESSION=abc123; Path=/; HttpOnly; Secure; SameSite=Strict

{"ok":true}\`)

    captured = {"rsp": []byte("")}
    forward = func(b) { captured["rsp"] = b }
    drop = func() { log.error("should not drop") }

    hijackHTTPResponseEx(false, "http://target/api", []byte("GET /api"), mockRsp, forward, drop)

    newRsp = captured["rsp"]
    cors = poc.GetHTTPPacketHeader(newRsp, "Access-Control-Allow-Origin")
    log.info("rewritten ACAO: " + cors)
    assert cors == "*", "ACAO should be wildcard"
    assert poc.GetHTTPPacketHeader(newRsp, "Access-Control-Allow-Credentials") == "true", "credentials should be true"

    assert poc.GetHTTPPacketHeader(newRsp, "Content-Security-Policy") == "", "CSP should be removed"
    assert poc.GetHTTPPacketHeader(newRsp, "X-Frame-Options") == "", "X-Frame-Options should be removed"
    assert poc.GetHTTPPacketHeader(newRsp, "Strict-Transport-Security") == "", "HSTS should be removed"

    cookie = poc.GetHTTPPacketHeader(newRsp, "Set-Cookie")
    log.info("rewritten cookie: " + cookie)
    assert str.Contains(cookie, "SESSION=abc123"), "cookie value should remain"
    assert !str.Contains(cookie, "HttpOnly"), "HttpOnly should be stripped"
    assert !str.Contains(cookie, "Secure"), "Secure should be stripped"
    assert !str.Contains(cookie, "SameSite=Strict"), "SameSite=Strict should be stripped"

    log.info("hijack response rewrite security headers self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[镜像] mirrorHTTPFlow 按状态码统计 + 5xx 告警',
    temp: `/*
模版名称: [镜像] mirrorHTTPFlow 按状态码统计 + 5xx 告警
关键词: mirrorHTTPFlow, 状态码统计, 5xx 告警, 实时监控
适用场景: 实时监控全量被代理流量按状态码分布；遇到 5xx/4xx 关键状态自动打 log，便于在大量流量中提前发现异常接口
说明: mirrorHTTPFlow 是只读旁路 hook，不会影响请求/响应；适合做日志、统计、告警，不能修改流量
*/

// ===== HOT PATCH TEMPLATE START =====
// mirrorHTTPFlow 按状态码统计 + 5xx 告警模板
// 累积统计放到模块级 statusStats map，遇到 5xx 立刻 log.error 输出 url
statusStats = {}
WARN_PREFIX = ["5"]                /* 这些前缀触发 warn */
ERROR_PREFIX = []                  /* 留空，本模板不直接触发 error */
KEY_THRESHOLD = 100                /* 单 host+status 累计达到该阈值时也告警一次 */

extractStatusCode = func(rsp) {
    if len(rsp) == 0 {
        return ""
    }
    code = poc.GetStatusCodeFromResponse(rsp)
    if code == 0 {
        return ""
    }
    return sprintf("%d", code)
}

prefixHit = func(code, prefixes) {
    for p in prefixes {
        if str.HasPrefix(code, p) {
            return true
        }
    }
    return false
}

mirrorHTTPFlow = func(isHttps, url, req, rsp, body) {
    code = extractStatusCode(rsp)
    if code == "" {
        return
    }
    key = code
    statusStats[key] = (statusStats[key] == nil ? 0 : statusStats[key]) + 1

    if prefixHit(code, WARN_PREFIX) {
        log.warn("5xx flow detected: " + code + " " + url)
    }
    if statusStats[key] == KEY_THRESHOLD {
        log.info(sprintf("status %s reached threshold %d", code, KEY_THRESHOLD))
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mirror color by status self test")

    mock = func(code) {
        return []byte(sprintf("HTTP/1.1 %d %s\\r\\nContent-Type: text/plain\\r\\n\\r\\nbody", code, "OK"))
    }
    req := []byte("GET / HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n")

    statusStats = {}

    mirrorHTTPFlow(false, "http://a/", req, mock(200), []byte("body"))
    mirrorHTTPFlow(false, "http://b/", req, mock(200), []byte("body"))
    mirrorHTTPFlow(false, "http://c/", req, mock(404), []byte("body"))
    mirrorHTTPFlow(false, "http://d/", req, mock(503), []byte("body"))
    mirrorHTTPFlow(false, "http://e/", req, mock(500), []byte("body"))

    log.info(sprintf("status stats: %v", statusStats))
    assert statusStats["200"] == 2, sprintf("200 count expected 2 got %v", statusStats["200"])
    assert statusStats["404"] == 1, "404 count expected 1"
    assert statusStats["503"] == 1, "503 count expected 1"
    assert statusStats["500"] == 1, "500 count expected 1"

    emptyRsp := []byte("")
    mirrorHTTPFlow(false, "http://a/", req, emptyRsp, []byte(""))
    assert statusStats["200"] == 2, "empty response should NOT bump stats"

    log.info("mirror color by status self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[镜像] mirrorFilteredHTTPFlow 流式提取手机号/邮箱/JWT',
    temp: `/*
模版名称: [镜像] mirrorFilteredHTTPFlow 流式提取手机号/邮箱/JWT
关键词: mirrorFilteredHTTPFlow, 敏感数据, 实时提取, 手机号, 邮箱, JWT
适用场景: 用 MITM 过滤器锁定到目标 host 后，对过滤后的流量做实时敏感数据提取，发现一笔即立刻 log；与 A1（历史回放分析版）互补
说明: mirrorFilteredHTTPFlow 在 mirrorHTTPFlow 基础上多了"经过 MITM 过滤器筛选"语义，更适合做高频"只关注目标"的旁路提取
*/

// ===== HOT PATCH TEMPLATE START =====
// mirrorFilteredHTTPFlow 敏感数据流式提取模板
// 正则集中维护，匹配后追加到全局 secrets map 并按类型 log
PHONE_RE = \`1[3-9]\\d{9}\`
EMAIL_RE = \`[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}\`
JWT_RE = \`eyJ[a-zA-Z0-9_\\-]+\\.eyJ[a-zA-Z0-9_\\-]+\\.[a-zA-Z0-9_\\-]+\`

secrets = {"phone": [], "email": [], "jwt": []}

addOnce = func(kind, value) {
    list = secrets[kind]
    for v in list {
        if v == value {
            return
        }
    }
    secrets[kind] = append(list, value)
    log.info(sprintf("found %s: %s", kind, value))
}

scanByRegex = func(kind, pattern, content) {
    matches = re.FindAll(content, pattern)
    for m in matches {
        addOnce(kind, m)
    }
}

mirrorFilteredHTTPFlow = func(isHttps, url, req, rsp, body) {
    combined = string(req) + "\\n" + string(rsp)
    scanByRegex("phone", PHONE_RE, combined)
    scanByRegex("email", EMAIL_RE, combined)
    scanByRegex("jwt", JWT_RE, combined)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mirror filtered extract secrets self test")

    secrets = {"phone": [], "email": [], "jwt": []}

    mockReq := []byte(\`POST /api/user/save HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturePart

phone=13812345678&email=admin@example.com\`)

    mockRsp := []byte(\`HTTP/1.1 200 OK
Content-Type: application/json

{"users":[{"phone":"13900008888","email":"u2@target.com"}],"token":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyIn0.anotherSignaturePart"}\`)

    mirrorFilteredHTTPFlow(false, "http://api.example.com/api/user/save", mockReq, mockRsp, poc.GetHTTPPacketBody(mockRsp))

    log.info(sprintf("collected secrets: %v", secrets))
    assert len(secrets["phone"]) == 2, sprintf("expected 2 phones got %d", len(secrets["phone"]))
    assert len(secrets["email"]) == 2, sprintf("expected 2 emails got %d", len(secrets["email"]))
    assert len(secrets["jwt"]) == 2, sprintf("expected 2 JWTs got %d", len(secrets["jwt"]))

    mirrorFilteredHTTPFlow(false, "http://api.example.com/api/user/save", mockReq, mockRsp, poc.GetHTTPPacketBody(mockRsp))
    assert len(secrets["phone"]) == 2, "dedup should keep phone count == 2"
    assert len(secrets["email"]) == 2, "dedup should keep email count == 2"

    log.info("mirror filtered extract secrets self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[镜像] mirrorNewWebsite 新域名自动指纹识别',
    temp: `/*
模版名称: [镜像] mirrorNewWebsite 新域名自动指纹识别
关键词: mirrorNewWebsite, 指纹识别, Server, X-Powered-By, CMS, 技术栈识别
适用场景: 在 MITM 抓取流量过程中，每发现一个新 schema+host 自动做轻量级离线指纹（基于 Server / X-Powered-By / Body 关键字），不发包，零开销
参考文章: yak-project-public 031 (2025-10-17) MITM 热加载全流程解析
*/

// ===== HOT PATCH TEMPLATE START =====
// mirrorNewWebsite 离线指纹模板
// 触发时机：每个新的 schema+host 仅触发一次（由 yakit 引擎去重）
// 工作流程：从响应 header 取 Server/X-Powered-By；从 body 用关键字命中常见技术栈
fingerprintRecords = {}
TECH_KEYWORDS = [
    ["WordPress", "wp-content"],
    ["jQuery", "jQuery"],
    ["Vue", "Vue.config"],
    ["React", "__REACT_DEVTOOLS_GLOBAL_HOOK__"],
    ["Bootstrap", "bootstrap.min.css"],
    ["Tomcat", "Apache Tomcat"],
    ["Spring Boot", "Whitelabel Error Page"],
    ["Nginx", "<center>nginx"],
    ["IIS", "Microsoft-IIS"],
]

extractServerInfo = func(rsp) {
    server = poc.GetHTTPPacketHeader(rsp, "Server")
    poweredBy = poc.GetHTTPPacketHeader(rsp, "X-Powered-By")
    return server, poweredBy
}

matchTechByText = func(text) {
    hits = []
    for item in TECH_KEYWORDS {
        if str.Contains(text, item[1]) {
            hits = append(hits, item[0])
        }
    }
    return hits
}

mirrorNewWebsite = func(isHttps, url, req, rsp, body) {
    server, poweredBy = extractServerInfo(rsp)
    techs = matchTechByText(string(rsp))
    record = {
        "url": url,
        "server": server,
        "poweredBy": poweredBy,
        "techs": techs,
    }
    fingerprintRecords[url] = record
    log.info(sprintf("new website fingerprint: url=%s server=%s poweredBy=%s techs=%v",
        url, server, poweredBy, techs))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mirror new website fingerprint self test")
    fingerprintRecords = {}

    wpRsp := []byte(\`HTTP/1.1 200 OK
Server: Apache/2.4
X-Powered-By: PHP/8.1
Content-Type: text/html

<html><head><link href="/wp-content/themes/x/style.css"></head><body>jQuery loaded</body></html>\`)
    mirrorNewWebsite(true, "https://wp.example.com", []byte("GET / HTTP/1.1\\r\\n\\r\\n"), wpRsp, poc.GetHTTPPacketBody(wpRsp))

    tomcatRsp := []byte(\`HTTP/1.1 500 Internal Server Error
Server: Apache Tomcat/9.0
Content-Type: text/html

<html>Whitelabel Error Page</html>\`)
    mirrorNewWebsite(false, "http://api.example.com", []byte("GET / HTTP/1.1\\r\\n\\r\\n"), tomcatRsp, poc.GetHTTPPacketBody(tomcatRsp))

    log.info(sprintf("fingerprint records: %v", fingerprintRecords))
    assert "https://wp.example.com" in fingerprintRecords, "wp record missing"
    wp = fingerprintRecords["https://wp.example.com"]
    assert wp.server == "Apache/2.4", "wp server mismatch"
    assert wp.poweredBy == "PHP/8.1", "wp poweredBy mismatch"
    assert "WordPress" in wp.techs, "WordPress tech should be detected"
    assert "jQuery" in wp.techs, "jQuery tech should be detected"

    tomcat = fingerprintRecords["http://api.example.com"]
    assert str.Contains(tomcat.server, "Tomcat"), "tomcat server header mismatch"
    assert "Tomcat" in tomcat.techs, "Tomcat tech should be detected"
    assert "Spring Boot" in tomcat.techs, "Spring Boot keyword should hit on Whitelabel page"

    log.info("mirror new website fingerprint self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[镜像] mirrorNewWebsitePath 新路径自动 nuclei 扫描',
    temp: `/*
模版名称: [镜像] mirrorNewWebsitePath 新路径自动 nuclei 扫描
关键词: mirrorNewWebsitePath, nuclei, 自动扫描, 新路径触发, 资产发现
适用场景: 边浏览边扫描，当 MITM 发现某网站出现新路径时，自动把该路径加入 nuclei 扫描队列；常用于结合渗透测试中"摸底+发现+扫描"自动化
说明: 实际扫描在 doScan() 中，默认使用 nuclei；自测时被替换为内存队列，不真正发包
*/

// ===== HOT PATCH TEMPLATE START =====
// mirrorNewWebsitePath 新路径触发扫描模板
// 设计思路：
//   1. shouldScan(url) 判定是否扫描（默认排除静态资源）
//   2. doScan(url) 真正触发扫描；自测时被替换为 mock
//   3. 收集已处理路径，避免短时间重复触发
EXCLUDE_SUFFIX = [".css", ".js", ".png", ".jpg", ".woff", ".woff2", ".ico", ".svg"]
pendingScans = []

shouldScan = func(url) {
    lower = str.ToLower(url)
    for suffix in EXCLUDE_SUFFIX {
        if str.HasSuffix(lower, suffix) {
            return false
        }
    }
    return true
}

doScan = func(url) {
    pendingScans = append(pendingScans, url)
    log.info("scheduled nuclei scan: " + url)
    // 生产用法（取消注释以启用真实扫描）：
    // res, err = nuclei.Scan(url, nuclei.timeout(10), nuclei.severity("low,medium,high,critical"))
    // if err != nil { log.error(sprintf("nuclei scan failed: %v", err)); return }
    // for r in res { log.warn(sprintf("nuclei hit: %v", r)) }
}

mirrorNewWebsitePath = func(isHttps, url, req, rsp, body) {
    if !shouldScan(url) {
        return
    }
    doScan(url)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mirror new path nuclei self test")
    pendingScans = []

    req := []byte("GET / HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n")
    rsp := []byte("HTTP/1.1 200 OK\\r\\n\\r\\n")

    targets = [
        "http://example.com/admin",
        "https://api.example.com/v1/users",
        "http://example.com/login",
    ]
    for u in targets {
        mirrorNewWebsitePath(str.HasPrefix(u, "https://"), u, req, rsp, []byte(""))
    }
    log.info(sprintf("pending scans: %v", pendingScans))
    assert len(pendingScans) == len(targets), sprintf("expected %d scans got %d", len(targets), len(pendingScans))

    pendingScans = []
    statics = [
        "http://example.com/static/app.css",
        "http://example.com/img/logo.png",
        "http://example.com/vendor/lib.js",
    ]
    for u in statics {
        mirrorNewWebsitePath(false, u, req, rsp, []byte(""))
    }
    assert len(pendingScans) == 0, sprintf("static assets should NOT be scanned, got %d", len(pendingScans))

    log.info("mirror new path nuclei self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[入库] hijackSaveHTTPFlow 敏感关键字染色 + tag',
    temp: `/*
模版名称: [入库] hijackSaveHTTPFlow 敏感关键字染色 + tag
关键词: hijackSaveHTTPFlow, AddTag, Red, 关键字染色, 敏感词, 流量分类入库
适用场景: 入库前根据请求/响应 body 命中的关键字给流量打 tag 并染色，便于在 yakit 历史中按 tag 检索定位
说明: flow.Request / flow.Response 是 str.Quote 后的字符串，需 Unquote/Quote 回去；染色通过 flow.Red() 等方法
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackSaveHTTPFlow 敏感关键字染色 + tag 模板
// 关键字 → 标签 + 染色 映射；命中后调用 flow.AddTag 与对应颜色方法
KEYWORDS = [
    {"key": "password", "tag": "credential", "color": "Red"},
    {"key": "passwd", "tag": "credential", "color": "Red"},
    {"key": "secret", "tag": "credential", "color": "Red"},
    {"key": "id_card", "tag": "pii", "color": "Orange"},
    {"key": "身份证", "tag": "pii", "color": "Orange"},
    {"key": "phone", "tag": "pii", "color": "Yellow"},
    {"key": "admin", "tag": "admin-related", "color": "Purple"},
    {"key": "debug=", "tag": "debug-flag", "color": "Cyan"},
]

applyColor = func(flow, color) {
    if color == "Red" { flow.Red() }
    if color == "Orange" { flow.Orange() }
    if color == "Yellow" { flow.Yellow() }
    if color == "Green" { flow.Green() }
    if color == "Blue" { flow.Blue() }
    if color == "Purple" { flow.Purple() }
    if color == "Cyan" { flow.Cyan() }
    if color == "Grey" { flow.Grey() }
}

scanAndTag = func(flow) {
    req = codec.StrconvUnquote(flow.Request)~
    rsp = codec.StrconvUnquote(flow.Response)~
    text = str.ToLower(string(req) + "\\n" + string(rsp))
    hits = []
    for item in KEYWORDS {
        if str.Contains(text, str.ToLower(item.key)) {
            hits = append(hits, item)
        }
    }
    for item in hits {
        flow.AddTag(item.tag)
        applyColor(flow, item.color)
    }
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    scanAndTag(flow)
    modify(flow)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start save tag sensitive keywords self test")

    req = \`POST /api/login HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded

username=admin&password=Passw0rd!\`

    rsp = \`HTTP/1.1 200 OK
Content-Type: application/json

{"token":"abc","secret":"top-secret","id_card":"110101199001011234"}\`

    // 用 map 模拟 *yakit.HTTPFlow，AddTag 与各颜色方法都 stub 出来观察调用
    tags = []
    colors = []
    flow = make(map[string]any)
    flow["Request"] = codec.StrconvQuote(req)
    flow["Response"] = codec.StrconvQuote(rsp)
    flow["AddTag"] = func(t...) {
        for one in t {
            tags = append(tags, one)
        }
    }
    flow["Red"] = func() { colors = append(colors, "Red") }
    flow["Orange"] = func() { colors = append(colors, "Orange") }
    flow["Yellow"] = func() { colors = append(colors, "Yellow") }
    flow["Green"] = func() { colors = append(colors, "Green") }
    flow["Blue"] = func() { colors = append(colors, "Blue") }
    flow["Purple"] = func() { colors = append(colors, "Purple") }
    flow["Cyan"] = func() { colors = append(colors, "Cyan") }
    flow["Grey"] = func() { colors = append(colors, "Grey") }

    saved = []
    modify = func(f) { saved = append(saved, f) }
    drop = func() { log.error("should not drop") }

    hijackSaveHTTPFlow(flow, modify, drop)

    log.info(sprintf("hit tags: %v", tags))
    log.info(sprintf("hit colors: %v", colors))
    assert len(saved) == 1, "modify must be called"
    assert "credential" in tags, "credential tag should be added (password+secret)"
    assert "pii" in tags, "pii tag should be added (id_card)"
    assert "admin-related" in tags, "admin tag should be added"
    assert "Red" in colors, "Red color should be applied (credential)"
    assert "Orange" in colors, "Orange color should be applied (id_card)"
    assert "Purple" in colors, "Purple color should be applied (admin)"

    log.info("save tag sensitive keywords self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[入库] hijackSaveHTTPFlow PII 脱敏入库',
    temp: `/*
模版名称: [入库] hijackSaveHTTPFlow PII 脱敏入库
关键词: hijackSaveHTTPFlow, PII, 脱敏, 手机号, 身份证, 邮箱, 银行卡, 合规演示
适用场景: 演示/合规场景下希望流量入库时不带原始 PII，又能保留接口结构供后续排查；本模板对 Response body 做手机号/身份证/邮箱/银行卡的中间位脱敏后保存
说明: 浏览器端拿到的仍是原文，本 Hook 仅改写"保存到数据库"那一份；与 23（明文存储）相反，本模板降低数据库敏感等级
*/

// ===== HOT PATCH TEMPLATE START =====
// hijackSaveHTTPFlow PII 脱敏模板
// 对 body 中的 PII 字段做中间星号脱敏：仅入库一份，浏览器不受影响
// 注意：规则顺序很重要，先处理长串再处理短串，避免长串中的子串被短规则误匹配
PII_RULES = [
    {"name": "id_card", "pattern": \`[1-9]\\d{16}[\\dXx]\`, "keep_head": 4, "keep_tail": 4},
    {"name": "bank_card", "pattern": \`[1-9]\\d{15,18}\`, "keep_head": 6, "keep_tail": 4},
    {"name": "phone", "pattern": \`1[3-9]\\d{9}\`, "keep_head": 3, "keep_tail": 4},
    {"name": "email", "pattern": \`[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}\`, "keep_head": 2, "keep_tail": -1},
]

maskValue = func(v, keepHead, keepTail) {
    if keepTail < 0 {
        // 邮箱：保留 head + @ 后所有
        atIdx = str.Index(v, "@")
        if atIdx <= 0 { return v }
        prefix = v[:atIdx]
        domain = v[atIdx:]
        if len(prefix) <= keepHead { return v }
        masked = prefix[:keepHead] + str.Repeat("*", len(prefix)-keepHead) + domain
        return masked
    }
    if len(v) <= keepHead+keepTail { return v }
    return v[:keepHead] + str.Repeat("*", len(v)-keepHead-keepTail) + v[len(v)-keepTail:]
}

redactText = func(text) {
    hits = {}
    for rule in PII_RULES {
        matches = re.FindAll(text, rule.pattern)
        seen = {}
        for m in matches {
            if seen[m] { continue }
            seen[m] = true
            masked = maskValue(m, rule.keep_head, rule.keep_tail)
            text = str.ReplaceAll(text, m, masked)
            hits[rule.name] = (hits[rule.name] == nil ? 0 : hits[rule.name]) + 1
        }
    }
    return text, hits
}

hijackSaveHTTPFlow = func(flow, modify, drop) {
    rsp = codec.StrconvUnquote(flow.Response)~
    body = string(poc.GetHTTPPacketBody(rsp))
    newBody, hits = redactText(body)
    if newBody != body {
        newRsp = poc.ReplaceHTTPPacketBody(rsp, newBody)
        flow.Response = codec.StrconvQuote(string(newRsp))
        flow.AddTag("pii-redacted")
    }
    modify(flow)
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start save pii redaction self test")

    rspText = \`HTTP/1.1 200 OK
Content-Type: application/json

{"users":[{"phone":"13812345678","id_card":"110101199001011234","email":"alice@example.com"}]}\`

    flow = make(map[string]any)
    flow["Request"] = codec.StrconvQuote("GET /api/users HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n")
    flow["Response"] = codec.StrconvQuote(rspText)
    tags = []
    flow["AddTag"] = func(t...) {
        for one in t { tags = append(tags, one) }
    }
    saved = []
    modify = func(f) { saved = append(saved, f) }
    drop = func() { log.error("should not drop") }

    hijackSaveHTTPFlow(flow, modify, drop)
    assert len(saved) == 1, "modify should be called once"

    redactedRsp = codec.StrconvUnquote(saved[0].Response)~
    redactedBody = string(poc.GetHTTPPacketBody(redactedRsp))
    log.info("redacted body: " + redactedBody)

    assert !str.Contains(redactedBody, "13812345678"), "phone must be redacted"
    assert !str.Contains(redactedBody, "110101199001011234"), "id_card must be redacted"
    assert !str.Contains(redactedBody, "alice@example.com"), "email must be redacted"
    assert str.Contains(redactedBody, "138****5678"), "phone should be masked with middle stars"
    assert str.Contains(redactedBody, "1101**********1234"), "id_card masked pattern mismatch"
    assert str.Contains(redactedBody, "al***@example.com"), "email masked pattern mismatch"
    assert "pii-redacted" in tags, "pii-redacted tag should be added"

    // 无 PII 的响应不应当被改写、也不应当加 tag
    flow2 = make(map[string]any)
    flow2["Request"] = codec.StrconvQuote("GET /api/healthz HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n")
    flow2["Response"] = codec.StrconvQuote("HTTP/1.1 200 OK\\r\\n\\r\\nOK")
    tags2 = []
    flow2["AddTag"] = func(t...) { for one in t { tags2 = append(tags2, one) } }
    saved2 = []
    hijackSaveHTTPFlow(flow2, func(f) { saved2 = append(saved2, f) }, drop)
    assert len(saved2) == 1, "non-pii flow should still be saved"
    bodyAfter = string(poc.GetHTTPPacketBody(codec.StrconvUnquote(saved2[0].Response)~))
    assert bodyAfter == "OK", "non-pii body should remain intact"
    assert len(tags2) == 0, "non-pii flow should NOT be tagged"

    log.info("save pii redaction self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[Mock] mockHTTPRequest 危险操作保护 (DELETE/PUT 强制 mock)',
    temp: `/*
模版名称: [Mock] mockHTTPRequest 危险操作保护 (DELETE/PUT 强制 mock)
关键词: mockHTTPRequest, 危险操作保护, DELETE, PUT, drop 数据, 演练环境
适用场景: 在演练/生产场景做 MITM 渗透时希望"看得到、操作得了"但不真的破坏；本模板把所有 DELETE/PUT 改为 mock 成功响应，确保不会真的把数据删了
参考文章: yak-project-public 024 (2025-12-05) Mock 重塑无污染客户端测试
*/

// ===== HOT PATCH TEMPLATE START =====
// mockHTTPRequest 危险操作保护模板
// DELETE / PUT 等修改型方法直接 mock 成功响应，原请求不发出
// 也兼顾 path 黑名单（如 /admin/users/delete 这种 POST 删除接口）
DANGEROUS_METHODS = ["DELETE", "PUT", "PATCH"]
DANGEROUS_PATH_KEYWORDS = ["/delete", "/destroy", "/wipe", "/drop", "/purge"]

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
        "msg": "[MITM-PROTECT] dangerous operation blocked",
        "method": method,
        "url": url,
    }, json.withIndent(""))
    return "HTTP/1.1 403 Forbidden\\r\\n" +
        "Content-Type: application/json\\r\\n" +
        "X-Mitm-Protect: 1\\r\\n" +
        "Content-Length: " + sprintf("%d", len(body)) + "\\r\\n\\r\\n" + body
}

mockHTTPRequest = func(isHttps, url, req, mockResponse) {
    method = poc.GetHTTPRequestMethod(req)
    if isDangerousByMethod(method) || isDangerousByPath(url) {
        log.warn(sprintf("dangerous operation blocked: %s %s", method, url))
        mockResponse(buildBlockedResponse(method, url))
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mock danger protect self test")

    captured = {"rsp": ""}
    mockResponse = func(rsp) { captured["rsp"] = rsp }

    delReq := []byte("DELETE /api/users/1 HTTP/1.1\\r\\nHost: target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://target/api/users/1", delReq, mockResponse)
    log.info("captured DELETE rsp: " + captured["rsp"])
    assert captured["rsp"] != "", "DELETE should be blocked"
    assert str.Contains(captured["rsp"], "X-Mitm-Protect: 1"), "should have protect header"
    assert str.Contains(captured["rsp"], "blocked"), "body should contain blocked"

    captured["rsp"] = ""
    putReq := []byte("PUT /api/items/9 HTTP/1.1\\r\\nHost: target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://target/api/items/9", putReq, mockResponse)
    assert captured["rsp"] != "", "PUT should be blocked"

    captured["rsp"] = ""
    pathDelReq := []byte("POST /admin/users/delete HTTP/1.1\\r\\nHost: target\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\"id\\":1}")
    mockHTTPRequest(false, "http://target/admin/users/delete", pathDelReq, mockResponse)
    assert captured["rsp"] != "", "POST /admin/users/delete should be blocked by path"

    captured["rsp"] = ""
    safeReq := []byte("GET /api/users HTTP/1.1\\r\\nHost: target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://target/api/users", safeReq, mockResponse)
    assert captured["rsp"] == "", "safe GET should NOT be mocked"

    captured["rsp"] = ""
    postReq := []byte("POST /api/users HTTP/1.1\\r\\nHost: target\\r\\n\\r\\n")
    mockHTTPRequest(false, "http://target/api/users", postReq, mockResponse)
    assert captured["rsp"] == "", "safe POST should NOT be mocked"

    log.info("mock danger protect self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[Mock] mockHTTPRequest 虚拟靶场 (SQLi/RCE/SSRF)',
    temp: `/*
模版名称: [Mock] mockHTTPRequest 虚拟靶场 (SQLi/RCE/SSRF)
关键词: mockHTTPRequest, 虚拟靶场, SQLi, RCE, SSRF, 离线练习, 模板调试
适用场景: 没有真实漏洞服务器时，用 mockHTTPRequest 在本地构造一个最小可用的 SQLi/RCE/SSRF 虚拟靶场，便于练习 PoC/Fuzz/插件
参考文章: yak-project-public 021 (2025-12-26) Mock 热加载进阶 从 WebFuzzer 到模板调试的全链路支持
说明: 实际无任何漏洞，仅在响应中模拟漏洞特征字符串；适合教学/演示/模板开发
*/

// ===== HOT PATCH TEMPLATE START =====
// mockHTTPRequest 虚拟靶场模板
// 三种漏洞路径: /vuln/sqli /vuln/rce /vuln/ssrf
// 命中即由本模板构造响应，不会真的发包
makeResponse = func(status, body) {
    return sprintf("HTTP/1.1 %d OK\\r\\nContent-Type: application/json\\r\\nX-Vuln-Mock: 1\\r\\nContent-Length: %d\\r\\n\\r\\n%s",
        status, len(body), body)
}

handleSQLi = func(url) {
    if str.Contains(url, "id=1' OR 1=1") || str.Contains(url, "1 OR 1=1") {
        body = json.dumps({
            "code": 0,
            "msg": "ok",
            "data": [
                {"id": 1, "username": "admin", "password": "P@ssw0rd"},
                {"id": 2, "username": "alice", "password": "Hello123"},
            ],
        }, json.withIndent(""))
        return makeResponse(200, body)
    }
    if str.Contains(url, "id=1'") || str.Contains(url, "id=1\\"") {
        body = json.dumps({
            "code": 500,
            "msg": "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server",
        }, json.withIndent(""))
        return makeResponse(500, body)
    }
    body = json.dumps({"code": 0, "msg": "ok", "data": [{"id": 1, "username": "admin"}]}, json.withIndent(""))
    return makeResponse(200, body)
}

handleRCE = func(url) {
    if str.Contains(url, "cmd=") {
        cmd = url[str.Index(url, "cmd=")+4:]
        if str.Contains(cmd, "&") {
            cmd = cmd[:str.Index(cmd, "&")]
        }
        if cmd == "ls" || cmd == "ls%20-la" {
            body = "drwxr-xr-x  3 root root 4096 Jan  1 12:00 .\\ndrwxr-xr-x  3 root root 4096 Jan  1 12:00 ..\\n-rw-r--r--  1 root root  220 Jan  1 12:00 flag.txt\\n"
            return makeResponse(200, body)
        }
        if str.Contains(cmd, "cat") && str.Contains(cmd, "flag") {
            return makeResponse(200, "flag{mock_rce_virtual_range}")
        }
        return makeResponse(200, "<unknown command> " + cmd)
    }
    return makeResponse(400, "missing cmd parameter")
}

handleSSRF = func(url) {
    if str.Contains(url, "target=http://127.0.0.1") || str.Contains(url, "target=http://localhost") {
        body = json.dumps({"code": 0, "msg": "internal data leaked", "data": "Apache Tomcat root /manager/html"}, json.withIndent(""))
        return makeResponse(200, body)
    }
    if str.Contains(url, "target=") {
        return makeResponse(200, \`{"code":0,"msg":"fetched external URL"}\`)
    }
    return makeResponse(400, "missing target parameter")
}

mockHTTPRequest = func(isHttps, url, req, mockResponse) {
    if str.Contains(url, "/vuln/sqli") {
        mockResponse(handleSQLi(url))
        return
    }
    if str.Contains(url, "/vuln/rce") {
        mockResponse(handleRCE(url))
        return
    }
    if str.Contains(url, "/vuln/ssrf") {
        mockResponse(handleSSRF(url))
        return
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit MITM 热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start mock vuln virtual range self test")

    captured = {"rsp": ""}
    mockResponse = func(rsp) { captured["rsp"] = rsp }
    req := []byte("GET / HTTP/1.1\\r\\nHost: target\\r\\n\\r\\n")

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/vuln/sqli?id=1", req, mockResponse)
    log.info("normal sqli rsp: " + captured["rsp"][:120])
    assert str.Contains(captured["rsp"], \`"admin"\`), "normal sqli should return user list"

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/vuln/sqli?id=1'", req, mockResponse)
    assert str.Contains(captured["rsp"], "SQL syntax"), "single quote should trigger SQL syntax error"
    assert str.Contains(captured["rsp"], "500 OK"), "should return 500"

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/vuln/sqli?id=1' OR 1=1--", req, mockResponse)
    assert str.Contains(captured["rsp"], "P@ssw0rd"), "OR 1=1 should leak all users"
    assert str.Contains(captured["rsp"], "alice"), "should leak multiple records"

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/vuln/rce?cmd=ls", req, mockResponse)
    assert str.Contains(captured["rsp"], "flag.txt"), "RCE ls should list flag.txt"

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/vuln/rce?cmd=cat%20flag.txt", req, mockResponse)
    assert str.Contains(captured["rsp"], "flag{mock_rce_virtual_range}"), "RCE cat flag should leak flag"

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/vuln/ssrf?target=http://127.0.0.1:8080", req, mockResponse)
    assert str.Contains(captured["rsp"], "internal data leaked"), "SSRF 127.0.0.1 should leak internal"

    captured["rsp"] = ""
    mockHTTPRequest(false, "http://target/api/healthz", req, mockResponse)
    assert captured["rsp"] == "", "non-vuln path should NOT be mocked"

    log.info("mock vuln virtual range self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
]

export const AnalyzeHotPatchTempDefault = [
  {
    name: '代码模板',
    temp: HotPatchDefaultContent,
    isDefault: true,
  },
  {
    name: '[分析] 敏感数据全量提取（手机号/JWT/Authorization）+ JSON 报告',
    temp: `/*
模版名称: [分析] 敏感数据全量提取（手机号/JWT/Authorization）+ JSON 报告
关键词: analyzeHTTPFlow, onAnalyzeHTTPFlowFinish, 手机号, Token, Authorization, JSON 报告, sync.NewMutex
适用场景: 对历史流量做批量敏感数据扫描，输出汇总 JSON 报告到 yakit 临时目录；命中后自动给流量染色
参考文章: yak-project-public 030 (2025-10-24) 流量分析热加载实战技巧 案例一
*/

// ===== HOT PATCH TEMPLATE START =====
// 全量提取敏感数据并输出 JSON 报告
// 关键点:
//   1. analyzeHTTPFlow 是并发调用，对全局收集 slice 必须加锁
//   2. 必须用 flow.GetResponse() / flow.GetRequest() 拿到反转义后的原文
//   3. 在 onAnalyzeHTTPFlowFinish 阶段 Close 文件句柄
mu = sync.NewMutex()
phones = []
tokens = []
reportPath = ""
reportFile = nil

ensureReportFile = func() {
    if reportFile != nil { return }
    path = yakit.GetHomeTempDir()
    reportPath = str.PathJoin(path, sprintf("analyze-phones-tokens-%d.json", time.Now().Unix()))
    f, err = file.OpenFile(reportPath, file.O_CREATE|file.O_RDWR|file.O_TRUNC, 0o666)
    if err != nil {
        log.error(sprintf("open report file failed: %v", err))
        return
    }
    reportFile = f
}

extractFromFlow = func(flow, extract) {
    mu.Lock()
    defer mu.Unlock()

    resp = flow.GetResponse()
    req = flow.GetRequest()

    phoneMatches = re.FindAll(resp, \`1[3-9]\\d{9}\`)
    if len(phoneMatches) > 0 {
        flow.Red()
        for m in phoneMatches {
            phones = append(phones, m)
            extract("phone-leak", flow, m)
        }
    }

    tokenMatches = re.FindAll(req, \`(?i)Authorization:\\s*Bearer\\s+[A-Za-z0-9._\\-]+\`)
    if len(tokenMatches) > 0 {
        flow.Orange()
        for m in tokenMatches {
            tokens = append(tokens, m)
            extract("token-leak", flow, m)
        }
    }
}

analyzeHTTPFlow = func(flow, extract) {
    extractFromFlow(flow, extract)
}

onAnalyzeHTTPFlowFinish = func(totalCount, matchedCount) {
    ensureReportFile()
    result = {
        "total_flows": totalCount,
        "matched_flows": matchedCount,
        "phones": phones,
        "tokens": tokens,
    }
    raw = json.dumps(result, json.withIndent("  "))
    if reportFile != nil {
        reportFile.Write(raw)
        reportFile.Close()
        reportFile = nil
    }
    log.info(sprintf("analyze finished: total=%d matched=%d phones=%d tokens=%d report=%s",
        totalCount, matchedCount, len(phones), len(tokens), reportPath))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 历史分析热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start extract phones tokens self test")

    phones = []
    tokens = []
    reportFile = nil
    reportPath = ""

    extractCalls = []
    extract = func(ruleName, flow, content...) {
        for c in content {
            extractCalls = append(extractCalls, ruleName + ":" + c)
        }
    }

    colors = []
    tags = []
    makeFlow = func(req, rsp) {
        f = make(map[string]any)
        f["Request"] = codec.StrconvQuote(req)
        f["Response"] = codec.StrconvQuote(rsp)
        f["GetRequest"] = func() { return req }
        f["GetResponse"] = func() { return rsp }
        f["Red"] = func() { colors = append(colors, "Red") }
        f["Orange"] = func() { colors = append(colors, "Orange") }
        f["AddTag"] = func(t...) { for one in t { tags = append(tags, one) } }
        return f
    }

    f1 = makeFlow(
        "GET /api/users HTTP/1.1\\r\\nHost: a\\r\\nAuthorization: Bearer eyJabc.eyJdef.signaturePart\\r\\n\\r\\n",
        "HTTP/1.1 200 OK\\r\\n\\r\\nphones: 13812345678 and 13900008888",
    )
    f2 = makeFlow(
        "GET /api/healthz HTTP/1.1\\r\\nHost: a\\r\\n\\r\\n",
        "HTTP/1.1 200 OK\\r\\n\\r\\nOK",
    )

    analyzeHTTPFlow(f1, extract)
    analyzeHTTPFlow(f2, extract)

    log.info(sprintf("phones=%v tokens=%v", phones, tokens))
    log.info(sprintf("extract calls=%v", extractCalls))
    assert len(phones) == 2, sprintf("expected 2 phones, got %d", len(phones))
    assert len(tokens) == 1, sprintf("expected 1 token, got %d", len(tokens))
    assert "Red" in colors, "phone hit flow should be Red"
    assert "Orange" in colors, "token hit flow should be Orange"
    assert len(extractCalls) == 3, sprintf("extract should be called 3 times, got %d", len(extractCalls))

    onAnalyzeHTTPFlowFinish(2, 3)
    log.info("report path: " + reportPath)
    assert reportPath != "", "report path must be set"
    raw = string(file.ReadFile(reportPath)~)
    assert str.Contains(raw, \`"total_flows": 2\`), "report should contain total_flows"
    assert str.Contains(raw, "13812345678"), "report should contain phone number"
    assert str.Contains(raw, "Bearer eyJabc.eyJdef.signaturePart"), "report should contain token"

    file.Remove(reportPath)
    log.info("extract phones tokens self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[分析] 主机访问次数统计',
    temp: `/*
模版名称: [分析] 主机访问次数统计
关键词: analyzeHTTPFlow, onAnalyzeHTTPFlowFinish, host 统计, 5xx 标红, 流量分布
适用场景: 对历史流量按 host 维度做次数统计；同时把状态码 >= 500 的流量染红 + 上报 extract，结束时打印 host 排名
参考文章: yak-project-public 030 (2025-10-24) 流量分析热加载实战技巧 案例二
*/

// ===== HOT PATCH TEMPLATE START =====
// 按 host 统计访问次数 + 5xx 标红模板
// 输出: 每个 host 的访问次数 (yakit.Info / log.info)
mu = sync.NewMutex()
hostStats = {}

bumpHost = func(host) {
    mu.Lock()
    defer mu.Unlock()
    hostStats[host] = (hostStats[host] == nil ? 0 : hostStats[host]) + 1
}

analyzeHTTPFlow = func(flow, extract) {
    host = flow.Host
    if host == "" {
        return
    }
    bumpHost(host)
    if flow.StatusCode >= 500 {
        flow.Red()
        extract("server-error", flow, sprintf("status=%d", flow.StatusCode))
    }
}

onAnalyzeHTTPFlowFinish = func(totalCount, matchedCount) {
    log.info("=== host access stats ===")
    for host, cnt in hostStats {
        log.info(sprintf("host %s: %d", host, cnt))
    }
    log.info(sprintf("analyze finished total=%d matched=%d", totalCount, matchedCount))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 历史分析热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start host stats self test")

    hostStats = {}
    extractCalls = []
    extract = func(ruleName, flow, content...) {
        for c in content {
            extractCalls = append(extractCalls, ruleName + ":" + c)
        }
    }

    colors = []
    makeFlow = func(host, status) {
        f = make(map[string]any)
        f["Host"] = host
        f["StatusCode"] = status
        f["Url"] = "http://" + host + "/x"
        f["Red"] = func() { colors = append(colors, "Red") }
        f["GetRequest"] = func() { return "GET / HTTP/1.1\\r\\nHost: " + host + "\\r\\n\\r\\n" }
        f["GetResponse"] = func() { return "" }
        return f
    }

    flows = [
        makeFlow("a.com", 200),
        makeFlow("a.com", 404),
        makeFlow("b.com", 500),
        makeFlow("b.com", 503),
        makeFlow("c.com", 200),
    ]
    for f in flows {
        analyzeHTTPFlow(f, extract)
    }

    log.info(sprintf("hostStats=%v", hostStats))
    assert hostStats["a.com"] == 2, sprintf("a.com expected 2 got %v", hostStats["a.com"])
    assert hostStats["b.com"] == 2, sprintf("b.com expected 2 got %v", hostStats["b.com"])
    assert hostStats["c.com"] == 1, sprintf("c.com expected 1 got %v", hostStats["c.com"])

    redCount = 0
    for c in colors { if c == "Red" { redCount = redCount + 1 } }
    assert redCount == 2, sprintf("expected 2 red, got %d", redCount)
    assert len(extractCalls) == 2, sprintf("expected 2 extract calls, got %d", len(extractCalls))

    onAnalyzeHTTPFlowFinish(5, 2)

    log.info("host stats self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[分析] 自动分类（登录/上传/后台）+ tag + 染色',
    temp: `/*
模版名称: [分析] 自动分类（登录/上传/后台）+ tag + 染色
关键词: analyzeHTTPFlow, AddTag, Blue, Purple, Green, 登录上传后台分类, 行为可视化
适用场景: 对历史流量做快速业务分类，根据请求 URL/Body 自动给"登录/上传/后台/注销"等行为打 tag + 颜色，便于后续按 tag 检索定位
参考文章: yak-project-public 030 (2025-10-24) 流量分析热加载实战技巧 案例三
*/

// ===== HOT PATCH TEMPLATE START =====
// 自动分类 + AddTag + 染色模板
// 规则列表：每条 {keyword, tag, color}，命中第一条规则后停止（一条流量只标一种类型）
CLASSIFY_RULES = [
    {"keyword": "/admin", "tag": "admin-area", "color": "Blue"},
    {"keyword": "upload", "tag": "upload-api", "color": "Purple"},
    {"keyword": "login", "tag": "login-flow", "color": "Green"},
    {"keyword": "logout", "tag": "logout-flow", "color": "Grey"},
    {"keyword": "register", "tag": "register-flow", "color": "Cyan"},
]

applyColor = func(flow, color) {
    if color == "Red" { flow.Red() }
    if color == "Orange" { flow.Orange() }
    if color == "Yellow" { flow.Yellow() }
    if color == "Green" { flow.Green() }
    if color == "Blue" { flow.Blue() }
    if color == "Purple" { flow.Purple() }
    if color == "Cyan" { flow.Cyan() }
    if color == "Grey" { flow.Grey() }
}

mu = sync.NewMutex()

analyzeHTTPFlow = func(flow, extract) {
    mu.Lock()
    defer mu.Unlock()

    req = flow.GetRequest()
    lower = str.ToLower(req)
    for rule in CLASSIFY_RULES {
        if str.Contains(lower, str.ToLower(rule.keyword)) {
            flow.AddTag(rule.tag)
            applyColor(flow, rule.color)
            extract(rule.tag, flow)
            return
        }
    }
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 历史分析热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start classify by path self test")

    allTags = []
    allColors = []
    extractCalls = []
    extract = func(ruleName, flow, content...) {
        extractCalls = append(extractCalls, ruleName)
    }

    makeFlow = func(req) {
        f = make(map[string]any)
        f["GetRequest"] = func() { return req }
        f["GetResponse"] = func() { return "" }
        f["AddTag"] = func(t...) { for one in t { allTags = append(allTags, one) } }
        f["Red"] = func() { allColors = append(allColors, "Red") }
        f["Orange"] = func() { allColors = append(allColors, "Orange") }
        f["Yellow"] = func() { allColors = append(allColors, "Yellow") }
        f["Green"] = func() { allColors = append(allColors, "Green") }
        f["Blue"] = func() { allColors = append(allColors, "Blue") }
        f["Purple"] = func() { allColors = append(allColors, "Purple") }
        f["Cyan"] = func() { allColors = append(allColors, "Cyan") }
        f["Grey"] = func() { allColors = append(allColors, "Grey") }
        return f
    }

    flows = [
        makeFlow("GET /admin/dashboard HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n"),
        makeFlow("POST /api/upload-file HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n"),
        makeFlow("POST /user/login HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n"),
        makeFlow("POST /user/logout HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n"),
        makeFlow("POST /user/register HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n"),
        makeFlow("GET /api/users HTTP/1.1\\r\\nHost: x\\r\\n\\r\\n"),  /* 不命中 */
    ]
    for f in flows {
        analyzeHTTPFlow(f, extract)
    }

    log.info(sprintf("tags=%v", allTags))
    log.info(sprintf("colors=%v", allColors))
    log.info(sprintf("extract calls=%v", extractCalls))

    assert len(allTags) == 5, sprintf("expected 5 tags, got %d", len(allTags))
    assert "admin-area" in allTags, "admin-area tag missing"
    assert "upload-api" in allTags, "upload-api tag missing"
    assert "login-flow" in allTags, "login-flow tag missing"
    assert "logout-flow" in allTags, "logout-flow tag missing"
    assert "register-flow" in allTags, "register-flow tag missing"
    assert "Blue" in allColors, "Blue color missing for admin"
    assert "Purple" in allColors, "Purple color missing for upload"
    assert "Green" in allColors, "Green color missing for login"
    assert len(extractCalls) == 5, sprintf("expected 5 extract calls, got %d", len(extractCalls))

    log.info("classify by path self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
  {
    name: '[分析] 异常状态码报告（4xx/5xx 饼图 + 表格）',
    temp: `/*
模版名称: [分析] 异常状态码报告（4xx/5xx 饼图 + 表格）
关键词: analyzeHTTPFlow, onAnalyzeHTTPFlowFinish, report.New, 饼图, 表格, 异常状态码, Markdown 报告
适用场景: 对历史流量做异常状态码（>= 400）统计，结束时生成包含 Markdown 描述、饼图、表格的完整报告（自动写入 yakit 数据库->报告页）
参考文章: yak-project-public 030 (2025-10-24) 流量分析热加载实战技巧 案例四
说明: makeReport() 是可替换工厂；自测时替换成 mock 工厂以避免污染用户数据库
*/

// ===== HOT PATCH TEMPLATE START =====
// 异常状态码生成报告模板
// 流程:
//   1. analyzeHTTPFlow 累积 abnormalFlows (status >= 400) 与 extract 计数
//   2. onAnalyzeHTTPFlowFinish 生成 markdown / pie / table，最后 Save()
// 关键点: makeReport 是抽离的工厂，便于自测替换
mu = sync.NewMutex()
abnormalFlows = []

makeReport = func() {
    r = report.New()
    r.From("http-anomaly-detector")
    r.Title("HTTP 异常流量分析报告")
    return r
}

analyzeHTTPFlow = func(flow, extract) {
    mu.Lock()
    defer mu.Unlock()
    code = flow.StatusCode
    if code >= 400 {
        abnormalFlows = append(abnormalFlows, [flow.Url, code, flow.Method])
        extract("abnormal-flow", flow, sprintf("status=%d", code))
    }
}

onAnalyzeHTTPFlowFinish = func(totalCount, matchedCount) {
    r = makeReport()
    abnormalPercent = 0.0
    if totalCount > 0 {
        abnormalPercent = float(matchedCount) / float(totalCount) * 100.0
    }
    r.Markdown(sprintf(\`# 异常流量检测报告

- 总流量数: %v
- 异常流量数: %v
- 异常比例: %.2f%%
\`, totalCount, matchedCount, abnormalPercent))

    normalCount = totalCount - matchedCount
    if normalCount < 0 { normalCount = 0 }
    r.PieGraph(
        {"name": "正常流量", "value": normalCount, "color": "#43ab42"},
        {"name": "异常流量", "value": matchedCount, "color": "#da4943"},
    )
    r.Markdown(\`# 异常流量具体信息\`)
    r.Table(["URL", "StatusCode", "Method"], abnormalFlows...)
    r.Save()
    log.info(sprintf("abnormal report generated total=%d matched=%d", totalCount, matchedCount))
}

/*
========== 模板自测块（YAK_MAIN 守卫）==========
说明:
  - 用 \`yak xxx.yak\` 命令行运行时，YAK_MAIN = true，会调用 runSelfTest() 做 mock 自测
  - 当本模板被复制到 yakit 历史分析热加载窗口使用时，YAK_MAIN = false，下方测试代码不会执行
  - 修改模板后用 \`yak xxx.yak\` 一键自测，安全调试不影响 yakit 实际使用
*/

func runSelfTest() {
    log.info("start abnormal status report self test")

    abnormalFlows = []

    extractCalls = []
    extract = func(ruleName, flow, content...) {
        for c in content {
            extractCalls = append(extractCalls, ruleName + ":" + c)
        }
    }

    makeFlow = func(url, method, status) {
        f = make(map[string]any)
        f["Url"] = url
        f["Method"] = method
        f["StatusCode"] = status
        f["Host"] = "x"
        f["GetRequest"] = func() { return "GET / HTTP/1.1\\r\\n\\r\\n" }
        f["GetResponse"] = func() { return "" }
        return f
    }

    flows = [
        makeFlow("http://a/api/x", "GET", 200),
        makeFlow("http://a/api/y", "POST", 404),
        makeFlow("http://a/api/z", "PUT", 500),
        makeFlow("http://b/api/x", "GET", 503),
        makeFlow("http://b/api/y", "DELETE", 401),
    ]
    for f in flows {
        analyzeHTTPFlow(f, extract)
    }
    log.info(sprintf("abnormalFlows=%v", abnormalFlows))
    assert len(abnormalFlows) == 4, sprintf("expected 4 abnormal got %d", len(abnormalFlows))
    assert len(extractCalls) == 4, sprintf("expected 4 extract calls got %d", len(extractCalls))

    // 替换 makeReport 为 mock，避免向 yakit 数据库写入真报告
    captured = {"markdown": [], "pie": [], "table_headers": [], "table_rows": [], "saved": false}
    makeReport = func() {
        mock = make(map[string]any)
        mock["Markdown"] = func(s) { captured["markdown"] = append(captured["markdown"], s) }
        mock["PieGraph"] = func(items...) {
            for it in items { captured["pie"] = append(captured["pie"], it) }
        }
        mock["Table"] = func(headers, rows...) {
            captured["table_headers"] = headers
            for r in rows { captured["table_rows"] = append(captured["table_rows"], r) }
        }
        mock["Save"] = func() { captured["saved"] = true }
        return mock
    }

    onAnalyzeHTTPFlowFinish(5, 4)
    log.info(sprintf("captured markdown count=%d", len(captured["markdown"])))
    log.info(sprintf("captured pie items=%d table rows=%d", len(captured["pie"]), len(captured["table_rows"])))

    assert len(captured["markdown"]) == 2, sprintf("expected 2 markdown sections got %d", len(captured["markdown"]))
    assert str.Contains(captured["markdown"][0], "异常比例: 80.00%"), "first markdown should contain abnormal percent 80%"
    assert len(captured["pie"]) == 2, "pie should have 2 segments"
    assert captured["pie"][0].value == 1, "normal count should be 1 (totalCount - matchedCount)"
    assert captured["pie"][1].value == 4, "abnormal count should be 4"
    assert captured["table_headers"][0] == "URL", "first table header should be URL"
    assert len(captured["table_rows"]) == 4, sprintf("expected 4 table rows got %d", len(captured["table_rows"]))
    assert captured["saved"], "Save() must be called"

    log.info("abnormal status report self test passed")
}

if YAK_MAIN {
    runSelfTest()
}
// ===== HOT PATCH TEMPLATE END =====
`,
    isDefault: true,
  },
]
