/** 本地文件缓存数据-键值变量 */
export enum LocalGV {
    /** @name 用户协议(需用户同意才能使用软件) */
    UserProtocolAgreed = "user-protocol-agreed",
    /** @name 获取缓存数据里引擎的启动模式("local"|"admin"|"remote") */
    YaklangEngineMode = "yaklang-engine-mode",
    /** @name 获取缓存数据里引擎启动配置 */
    YaklangEnginePort = "yaklang-engine-port",
    /** @name 关闭窗口的二次确认 */
    WindowsCloseFlag = "windows-close-flag"
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
    TokenOnline = "token-online"
}

/** 项目逻辑全局变量 */
export enum CodeGV {
    /** @name 官网地址 */
    HomeWebsite = "https://www.yaklang.com",
    /** @name 远程连接配置信息文件路径 */
    RemoteLinkPath = "$HOME/yakit-projects/auth/yakit-remote.json"
}
