export enum LocalGVS {
    /** @name 用户协议(需用户同意才能使用软件) */
    UserProtocolAgreed = "new-user-protocol-agreed",

    /** @name 缓存-本地连接的端口号-ce版 */
    YaklangEnginePort = "yaklang-engine-port",
    /** @name 缓存-本地连接的端口号-ee版 */
    EEYaklangEnginePort = "ee-yaklang-engine-port",
    /** @name 缓存-本地连接的端口号-se版 */
    SEYaklangEnginePort = "se-yaklang-engine-port",
    /** @name 缓存-本地连接的端口号-irify版 */
    IRIFYYaklangEnginePort = "irify-yaklang-engine-port",
    /** @name 缓存-本地连接的端口号-irifyee版 */
    IRIFYEEYaklangEnginePort = "irifyee-yaklang-engine-port",

    /** @name 缓存-远程连接的信息 */
    YaklangRemoteEngineCredential = "yaklang-remote-engine-credential",

    /** @name 是否自启最新版本检测 */
    NoAutobootLatestVersionCheck = "no-autoboot-latest-version-check",

    /** @name 退出登陆是否删除账号的私密插件 */
    IsDeletePrivatePluginsOnLogout = "is-delete-private-plugins-on-logout",

    /** @name 软件是否白屏崩溃过,在渲染端只会设置为false,在主进程触发崩溃时设置为true */
    RenderCrashScreen = "render-crash-screen"
}
