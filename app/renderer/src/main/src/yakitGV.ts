/** 本地文件缓存数据-键值变量 */
export enum LocalGV {
    /** @name 用户协议(需用户同意才能使用软件) */
    UserProtocolAgreed = "user-protocol-agreed",
    /** @name 获取缓存数据里本地引擎是否以管理员权限启动 */
    YaklangEngineSudo = "yaklang-engine-sudo",
    /** @name 获取缓存数据里本地引擎启动的端口号 */
    YaklangEnginePort = "yaklang-engine-port",
    /** @name 全局反连地址 */
    GlobalBridgeAddr = "yak-bridge-addr",
    /** @name 全局反连密钥 */
    GlobalBridgeSecret = "yak-bridge-secret",
    /** @name 是否复用全局DNS-Log配置 */
    GlobalDNSLogBridgeInherit = "yakit-DNSLOG_INHERIT_BRIDGE",
    /** @name 全局DNS-Log地址 */
    GlobalDNSLogAddr = "yak-dnslog-addr",
    /** @name 全局DNS-Log密钥 */
    GlobalDNSLogSecret = "yak-dnslog-secret"
}

/** 引擎数据库缓存数据-键值变量 */
export enum RemoteGV {
    /** @name 获取私有域地址 */
    HttpSetting = "httpSetting"
}

/** 项目逻辑全局变量 */
export enum CodeGV {
    /** @name 官网地址 */
    HomeWebsite = "https://www.yaklang.com",
    /** @name 远程连接配置信息文件路径 */
    RemoteLinkPath = "$HOME/yakit-projects/auth/yakit-remote.json"
}
