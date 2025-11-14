/** 本地文件缓存数据-键值变量 */
export enum LocalGVS {
    /** @name 用户协议(需用户同意才能使用软件) */
    UserProtocolAgreed = "new-user-protocol-agreed",
    /** @name 获取缓存数据里引擎的启动模式("local"|"remote") */
    YaklangEngineMode = "yaklang-engine-mode",
    /** @name 未安装引擎提示框内的用户协议是否勾选 */
    IsCheckedUserAgreement = "is-checked-user-agreement",
    /** @name 缓存-远程连接的信息 */
    YaklangRemoteEngineCredential = "yaklang-remote-engine-credential",
}
