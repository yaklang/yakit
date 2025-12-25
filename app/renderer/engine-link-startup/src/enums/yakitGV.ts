/** 本地文件缓存数据-键值变量 */
export enum LocalGVS {
    /** @name 获取缓存数据里引擎的启动模式("local"|"remote") */
    YaklangEngineMode = "yaklang-engine-mode",
    /** @name 未安装引擎提示框内的用户协议是否勾选 */
    IsCheckedUserAgreement = "is-checked-user-agreement",
    /** @name 缓存-远程连接的信息 */
    YaklangRemoteEngineCredential = "yaklang-remote-engine-credential",
    /** @name 是否自启最新版本检测 */
    NoAutobootLatestVersionCheck = "no-autoboot-latest-version-check",
    /** @name 本地安装软件版本号 */
    LocalAppVersion = "local_app_version",
    /** @name 是否yak版本检测 */
    NoYakVersionCheck = "no-yak-version-check"
}
