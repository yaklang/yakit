import {ChromeLauncherParams} from "@/pages/mitm/MITMChromeLauncher"
import {MITMAdvancedFilter, MITMFilterData, MITMFilterSchema} from "@/pages/mitm/MITMServerStartForm/MITMFilters"
import {v4 as uuidv4} from "uuid"

export const chromeLauncherParamsArr: ChromeLauncherParams[] = [
    {
        id: uuidv4(),
        parameterName: "--no-system-proxy-config-service",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用系统代理配置服务",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--proxy-bypass-list",
        variableValues: "<-loopback>",
        variableType: "input",
        disabled: false,
        desc: "为代理设置回避列表，不代理回环地址",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--ignore-certificate-errors",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "忽略 SSL 证书错误",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--test-type",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "表示这是一个测试实例",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-sandbox",
        variableValues: "",
        variableType: "bool",
        disabled: true,
        desc: "https://stackoverflow.com/questions/64788142/nodejs-error-connect-econnrefused-127-0-0-1port-chrome-remote-interface",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--ignore-urlfetcher-cert-requests",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "忽略 URL fetcher 的证书请求",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-webrtc",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用 WebRTC",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-component-extensions-with-background-pages",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用带有背景页的组件扩展",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-extensions",
        variableValues: "",
        variableType: "bool",
        disabled: true,
        desc: "禁用所有扩展",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-notifications",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用通知",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--force-webrtc-ip-handling-policy",
        variableValues: "default_public_interface_only",
        variableType: "input",
        disabled: false,
        desc: "强制 WebRTC IP 处理策略仅使用默认的公共接口",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-ipc-flooding-protection",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用 IPC 洪水攻击保护",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-xss-auditor",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用 XSS 审查器",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-bundled-ppapi-flash",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用捆绑的 PPAPI Flash 版本",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-plugins-discovery",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁止插件发现",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-default-apps",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用默认应用",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-prerender-local-predictor",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用本地预加载页面的预测功能",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-sync",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用同步功能",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-breakpad",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用 Breakpad 崩溃报告",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-crash-reporter",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用崩溃报告器",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disk-cache-size",
        variableValues: "0",
        variableType: "input",
        disabled: false,
        desc: "设置磁盘缓存大小为 0",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-settings-window",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用设置窗口",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-speech-api",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用语音API",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-file-system",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用文件系统API",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-presentation-api",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用演示API",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-permissions-api",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用权限API",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-new-zip-unpacker",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用新 ZIP 解压功能",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-media-session-api",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用媒体会话API",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-experiments",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁止实验",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-events",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "不发送事件",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-first-run",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "启动时跳过首次运行向导",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-default-browser-check",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "启动时不检查默认浏览器",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-pings",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用 ping 跟踪",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--no-service-autorun",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "不自动运行服务",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--media-cache-size",
        variableValues: "0",
        variableType: "input",
        disabled: false,
        desc: "设置媒体缓存大小为0",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--use-fake-device-for-media-stream",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "使用虚拟设备来捕获媒体流",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--dbus-stub",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "使用 DBus 存根",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-background-networking",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "禁用后台网络活动",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-component-update",
        variableValues: "",
        variableType: "bool",
        disabled: false,
        desc: "不要更新 chrome://components/ 中列出的浏览器“组件”",
        default: true
    },
    {
        id: uuidv4(),
        parameterName: "--disable-features",
        variableValues: "ChromeWhatsNewUI,HttpsUpgrades,OptimizationHints",
        variableType: "input",
        disabled: false,
        desc: "禁用特定的功能。",
        default: true
    }
]

export const defaultMITMAdvancedFilter: MITMAdvancedFilter = {
    Field: "ExcludeHostnames",
    MatcherType: "regexp",
    Group: [""]
}

export const defaultMITMBaseFilter: MITMFilterSchema = {
    includeHostname: [],
    excludeHostname: [],
    includeSuffix: [],
    excludeSuffix: [],
    excludeMethod: [],
    excludeContentTypes: [],
    excludeUri: [],
    includeUri: []
}

export const defaultMITMFilterData: MITMFilterData = {
    IncludeHostnames: [],
    ExcludeHostnames: [],
    IncludeSuffix: [],
    ExcludeSuffix: [],
    IncludeUri: [],
    ExcludeUri: [],
    ExcludeMethods: [],
    ExcludeMIME: []
}

export const MITMHotPatchTempDefault = [
    {
        name: "加解密模板",
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
        isDefault: true
    }
]
