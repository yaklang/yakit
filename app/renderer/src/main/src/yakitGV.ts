/** 本地文件缓存数据-键值变量 */
export enum LocalGV {
    /** @name 用户协议(需用户同意才能使用软件) */
    UserProtocolAgreed = "user-protocol-agreed",
    /** @name 获取缓存数据里引擎的启动模式("local"|"admin"|"remote") */
    YaklangEngineMode = "yaklang-engine-mode",
    /** @name 获取缓存数据里引擎启动配置 */
    YaklangEnginePort = "yaklang-engine-port",
    /** @name 获取缓存数据里引擎启动配置(管理员权限) */
    YaklangEngineAdminPort = "yaklang-engine-admin-port",
    /** @name 关闭窗口的二次确认 */
    WindowsCloseFlag = "windows-close-flag",

    /** @name 远程引擎的认证信息本地缓存 */
    YaklangRemoteEngineCredential = "yaklang-remote-engine-credential",

    /** @name 是否自启最新版本检测 */
    NoAutobootLatestVersionCheck = "no-autoboot-latest-version-check",

    /** @name 未安装引擎提示框内的用户协议是否勾选 */
    IsCheckedUserAgreement = "is-checked-user-agreement"
}

/** 引擎数据库缓存数据-键值变量 */
export enum RemoteGV {
    /** @name 私有域地址 */
    HttpSetting = "httpSetting",
    /** @name 全局反连地址 */
    GlobalBridgeAddr = "yak-bridge-addr",
    /** @name 全局反连密钥 */
    GlobalBridgeSecret = "yak-bridge-secret",
    /** @name 是否复用全局DNS-Log配置 */
    GlobalDNSLogBridgeInherit = "yakit-DNSLOG_INHERIT_BRIDGE",
    /** @name 全局DNS-Log地址 */
    GlobalDNSLogAddr = "yak-dnslog-addr",
    /** @name 全局DNS-Log密钥 */
    GlobalDNSLogSecret = "yak-dnslog-secret",
    /** @name 登录账户Token(enterprise) */
    TokenOnlineEnterprise = "token-online-enterprise",
    /** @name 登录账户Token */
    TokenOnline = "token-online",
    /** @name 连接的项目数据库 */
    LinkDatabase = "link-database",
    /** @name 全局状态的查询间隔时间 */
    GlobalStateTimeInterval = "global-state-time-interval",
    /** @name 全局Chrome启动路径 */
    GlobalChromePath = "global-chrome-path",
    /** @name 软件内菜单展示模式 */
    PatternMenu = "PatternMenu",
    /** @name 是否展示引擎控制台  */
    ShowBaseConsole = "SHOW_BASE_CONSOLE",

    /** @name 菜单是否为用户自行导入的json数据 */
    IsImportJSONMenu = "is-import-json-menu",
    /** @name 用户删除的系统内定菜单 */
    UserDeleteMenu = "user-delete-menu",

    /** @name chat-cs聊天记录 */
    ChatCSStorage = "chat-cs-storage",
    /** @name 是否已了解chat-cs功能 */
    KnowChatCS = "know-chat-cs",
    /** @name webFuzzer序列的缓存字段 */
    FuzzerSequenceCache = "fuzzer_sequence_cache"
}

/** 项目逻辑全局变量 */
export enum CodeGV {
    /** @name 官网地址 */
    HomeWebsite = "https://www.yaklang.com",
    /** @name 远程连接配置信息文件路径 */
    RemoteLinkPath = "$HOME/yakit-projects/auth/yakit-remote.json",
    /** @name 历史版本下载页面 */
    HistoricalVersion = "https://github.com/yaklang/yakit/releases",
    /** @name public版本菜单模式 */
    PublicMenuModeValue = "public"
}
