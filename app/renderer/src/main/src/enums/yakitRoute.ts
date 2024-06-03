/** 渲染端所有页面枚举 */
export enum YakitRoute {
    /** 首页 */
    NewHome = "new-home",
    /** 手动渗透 */
    HTTPHacker = "httpHacker",
    HTTPFuzzer = "httpFuzzer",
    WebsocketFuzzer = "websocket-fuzzer",
    Codec = "codec",
    DataCompare = "dataCompare",
    /** 基础工具 */
    Mod_ScanPort = "scan-port",
    PoC = "poc",
    Plugin_OP = "plugin-op",
    Mod_Brute = "brute",
    /** 插件 */
    Plugin_Store = "plugin-store",
    Plugin_Owner = "plugin-owner",
    Plugin_Local = "plugin-local",
    Plugin_Groups = "plugin-groups",
    BatchExecutorPage = "batch-executor-page-ex",
    /** 反连 */
    DNSLog = "dnslog",
    ICMPSizeLog = "icmp-sizelog",
    TCPPortLog = "tcp-portlog",
    PayloadGenerater_New = "PayloadGenerater_New",
    ReverseServer_New = "ReverseServer_New",
    ShellReceiver = "shellReceiver",
    /** 数据库 */
    DB_HTTPHistory = "db-http-request",
    DB_Report = "db-reports-results",
    DB_Risk = "db-risks",
    DB_Ports = "db-ports",
    DB_Domain = "db-domains",
    DB_CVE = "cve",
    /** 独立功能页面 */
    // Yak-Runner页面
    YakScript = "yakScript",
    // Payload页面
    PayloadManager = "payload-manager",
    // 私有版用户管理
    AccountAdminPage = "account-admin-page",
    RoleAdminPage = "role-admin-page",
    HoleCollectPage = "hole-collect-page",
    LicenseAdminPage = "license-admin-page",
    // 公开版用户管理
    TrustListPage = "trust-list-admin-page",
    PlugInAdminPage = "plug-in-admin-page",
    // 远程管理
    ControlAdminPage = "control-admin-page",
    // 插件批量页面中未完成页面的点击弹出页面
    BatchExecutorRecover = "batch-executor-recover",
    // http-history页面右键菜单"数据包扫描"生成页面
    PacketScanPage = "packet-scan-page",
    // 新建插件页面
    AddYakitScript = "add-yakit-script",
    // 编辑插件页面
    ModifyYakitScript = "modify-yakit-script",
    /** 简易版专属 */
    SimpleDetect = "simple-detect",
    // 录屏管理器
    ScreenRecorderPage = "screen-recorder-page",
    // 全局功能-试验性功能-BAS实验室
    DB_ChaosMaker = "db-chaosmaker",
    // 调试插件的功能
    Beta_DebugPlugin = "beta-debug-plugin",
    // 调试插件编辑器
    Beta_DebugTrafficAnalize = "**beta-debug-traffic-analize",
    // 调试插件编辑器
    Beta_DebugMonacoEditor = "beta-debug-monaco-editor",
    // 靶场调试
    Beta_VulinboxManager = "beta-vulinbox-manager",
    // 网络调试
    Beta_DiagnoseNetwork = "beta-diagnose-network",
    // 配置全局
    Beta_ConfigNetwork = "beta-config-network",
    // 插件管理
    Plugin_Audit = "plugin-audit",
    // WebShell 管理
    Beta_WebShellManager = "beta-webshell-manager",
    Beta_WebShellOpt = "beta-webshell-opt",
    // 数据统计
    Data_Statistics = "data_statistics",
    /**空间引擎 */
    Space_Engine = "space-engine"
}
