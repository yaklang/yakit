import {ChromeLauncherParams} from "@/pages/mitm/MITMChromeLauncher"
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
