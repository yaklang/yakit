export const defMenuDataString = [
    {
        label: "逻辑漏洞检测",
        menuName: "逻辑漏洞检测",
        pluginId: 0,
        pluginName: "",
        children: [
            {route: "httpFuzzer", label: "Web Fuzzer", menuName: "Web Fuzzer", pluginId: 0, pluginName: ""},
            {route: "db-http-request", label: "History", menuName: "History", pluginId: 0, pluginName: ""},
            {route: "plugin-op", label: "基础爬虫", menuName: "基础爬虫", pluginId: 6269, pluginName: "基础爬虫"},
            {
                route: "mitm-hijack",
                label: "MITM 交互式劫持",
                menuName: "MITM 交互式劫持",
                pluginId: 0,
                pluginName: ""
            }
        ]
    },
    {
        label: "插件",
        menuName: "插件",
        pluginId: 0,
        pluginName: "",
        children: [{route: "plugin-hub", label: "插件仓库", menuName: "插件仓库", pluginId: 0, pluginName: ""}]
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
            {route: "db-http-request", label: "History", menuName: "History", pluginId: 0, pluginName: ""}
        ]
    }
]
