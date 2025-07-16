export const defMenuDataString = [
    {
        label: "安全工具",
        menuName: "安全工具",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "httpFuzzer", label: "Web Fuzzer", menuName: "Web Fuzzer", pluginId: 0, pluginName: ""},
            {
                route: "mitm-hijack",
                label: "MITM 交互式劫持 v2",
                menuName: "MITM 交互式劫持 v2",
                pluginId: 0,
                pluginName: ""
            },
            {route: "db-http-request", label: "History", menuName: "History", pluginId: 0, pluginName: ""},
            {route: "plugin-op", label: "基础爬虫", menuName: "基础爬虫", pluginId: 6269, pluginName: "基础爬虫"},
            {
                route: "plugin-op",
                label: "目录扫描",
                menuName: "综合目录扫描与爆破",
                pluginId: 6912,
                pluginName: "综合目录扫描与爆破"
            },
            {route: "brute", label: "弱口令检测", menuName: "弱口令检测", pluginId: 0, pluginName: ""},
            {route: "space-engine", label: "空间引擎", menuName: "空间引擎", pluginId: 0, pluginName: ""},
            {route: "scan-port", label: "端口/指纹扫描", menuName: "端口/指纹扫描", pluginId: 0, pluginName: ""},
            {route: "plugin-op", label: "子域名收集", menuName: "子域名收集", pluginId: 0, pluginName: "子域名收集"}
        ]
    },
    {
        label: "逻辑漏洞检测",
        menuName: "逻辑漏洞检测",
        pluginId: 0,
        pluginName: "",
        children: [{route: "poc", label: "逻辑漏洞检测", menuName: "逻辑漏洞检测", pluginId: 0, pluginName: ""}]
    },
    {
        label: "插件",
        menuName: "插件",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "plugin-hub", label: "插件仓库", menuName: "插件仓库", pluginId: 0, pluginName: ""},
            {route: "batch-executor-page-ex", label: "批量执行", menuName: "批量执行", pluginId: 0, pluginName: ""}
        ]
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
            {route: "fingerprint-manage", label: "指纹库", menuName: "指纹库", pluginId: 0, pluginName: ""},
            {route: "cve", label: "CVE 管理", menuName: "CVE 管理", pluginId: 0, pluginName: ""}
        ]
    },
    {
        label: "手工渗透",
        menuName: "手工渗透",
        pluginId: 0,
        pluginName: "",
        children: [
            {
                route: "mitm-hijack",
                label: "MITM 交互式劫持 v2",
                menuName: "MITM 交互式劫持 v2",
                pluginId: 0,
                pluginName: ""
            },
            {route: "httpFuzzer", label: "Web Fuzzer", menuName: "Web Fuzzer", pluginId: 0, pluginName: ""},
            {
                route: "websocket-fuzzer",
                label: "Websocket Fuzzer",
                menuName: "Websocket Fuzzer",
                pluginId: 0,
                pluginName: ""
            }
        ]
    },
    {
        label: "反连",
        menuName: "反连",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "shellReceiver", label: "端口监听器", menuName: "端口监听器", pluginId: 0, pluginName: ""},
            {route: "ReverseServer_New", label: "反连服务器", menuName: "反连服务器", pluginId: 0, pluginName: ""},
            {route: "dnslog", label: "DNSLog", menuName: "DNSLog", pluginId: 0, pluginName: ""},
            {route: "icmp-sizelog", label: "ICMP-SizeLog", menuName: "ICMP-SizeLog", pluginId: 0, pluginName: ""},
            {route: "tcp-portlog", label: "TCP-PortLog", menuName: "TCP-PortLog", pluginId: 0, pluginName: ""},
            {
                route: "PayloadGenerater_New",
                label: "Yso-Java Hack",
                menuName: "Yso-Java Hack",
                pluginId: 0,
                pluginName: ""
            }
        ]
    },
    {
        label: "数据处理",
        menuName: "数据处理",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "codec", label: "Codec", menuName: "Codec", pluginId: 0, pluginName: ""},
            {route: "dataCompare", label: "数据对比", menuName: "数据对比", pluginId: 0, pluginName: ""}
        ]
    }
]
