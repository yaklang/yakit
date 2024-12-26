export const defMenuDataString = [
    {
        label: "手工渗透",
        menuName: "手工渗透",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "httpHacker", label: "MITM 交互式劫持", menuName: "MITM 交互式劫持", pluginId: 0, pluginName: ""},
            {route: "httpFuzzer", label: "Web Fuzzer", menuName: "Web Fuzzer", pluginId: 0, pluginName: ""},
            {
                route: "websocket-fuzzer",
                label: "Websocket Fuzzer",
                menuName: "Websocket Fuzzer",
                pluginId: 0,
                pluginName: ""
            },
            {
                route: "plugin-op",
                label: "凭证越权检测",
                menuName: "凭证越权检测",
                pluginId: 11325,
                pluginName: "凭证越权检测"
            },
            {
                route: "plugin-op",
                label: "注销功能有效性检测",
                menuName: "注销功能有效性检测",
                pluginId: 11321,
                pluginName: "注销功能有效性检测"
            },
            {
                route: "plugin-op",
                label: "JWT伪造检测",
                menuName: "JWT伪造检测",
                pluginId: 11310,
                pluginName: "JWT伪造检测"
            },
            {
                route: "plugin-op",
                label: "验证码回显绕过检测",
                menuName: "验证码回显绕过检测",
                pluginId: 11311,
                pluginName: "验证码回显绕过检测"
            },
            {
                route: "plugin-op",
                label: "常见信息泄露检测",
                menuName: "常见信息泄露检测",
                pluginId: 11316,
                pluginName: "常见信息泄露检测"
            },
            {
                route: "plugin-op",
                label: "敏感信息遍历检测",
                menuName: "敏感信息遍历检测",
                pluginId: 11319,
                pluginName: "敏感信息遍历检测"
            },
            {
                route: "plugin-op",
                label: "会话固定漏洞检测",
                menuName: "会话固定漏洞检测",
                pluginId: 11320,
                pluginName: "会话固定漏洞检测"
            },
            {
                route: "plugin-op",
                label: "验证码可复用检测",
                menuName: "验证码可复用检测",
                pluginId: 11322,
                pluginName: "验证码可复用检测"
            },
            {
                route: "plugin-op",
                label: "验证码可绕过检测",
                menuName: "验证码可绕过检测",
                pluginId: 11323,
                pluginName: "验证码可绕过检测"
            },
            {
                route: "plugin-op",
                label: "js中接口未授权",
                menuName: "js中接口未授权",
                pluginId: 11324,
                pluginName: "js中接口未授权"
            }
        ]
    },
    {
        label: "安全工具",
        menuName: "安全工具",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "brute", label: "弱口令检测", menuName: "弱口令检测", pluginId: 0, pluginName: ""},
            {route: "scan-port", label: "端口/指纹扫描", menuName: "端口/指纹扫描", pluginId: 0, pluginName: ""},
            {route: "space-engine", label: "空间引擎", menuName: "空间引擎", pluginId: 0, pluginName: ""},
            {route: "plugin-op", label: "基础爬虫", menuName: "基础爬虫", pluginId: 11328, pluginName: "基础爬虫"},
            {
                route: "plugin-op",
                label: "子域名收集",
                menuName: "子域名收集",
                pluginId: 11330,
                pluginName: "子域名收集"
            },
            {
                route: "plugin-op",
                label: "目录扫描",
                menuName: "综合目录扫描与爆破",
                pluginId: 11329,
                pluginName: "综合目录扫描与爆破"
            }
        ]
    },
    {
        label: "逻辑漏洞自动检测",
        menuName: "专项漏洞检测",
        pluginId: 0,
        pluginName: "",
        children: [{route: "poc", label: "专项漏洞检测", menuName: "专项漏洞检测", pluginId: 0, pluginName: ""}]
    },
    {
        label: "数据库",
        menuName: "数据库",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "db-reports-results", label: "报告", menuName: "报告", pluginId: 0, pluginName: ""},
            {route: "db-ports", label: "端口", menuName: "端口", pluginId: 0, pluginName: ""},
            {route: "db-risks", label: "漏洞", menuName: "漏洞", pluginId: 0, pluginName: ""},
            {route: "db-domains", label: "域名", menuName: "域名", pluginId: 0, pluginName: ""},
            {route: "db-http-request", label: "History", menuName: "History", pluginId: 0, pluginName: ""},
            {route: "cve", label: "CVE 管理", menuName: "CVE 管理", pluginId: 0, pluginName: ""}
        ]
    }
]
