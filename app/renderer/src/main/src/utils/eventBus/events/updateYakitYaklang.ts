export type UpdateYakitYaklangEventProps = {
    /** 菜单栏上的更新yakit或yaklang */
    activeUpdateYakitOrYaklang: string
    /** yakit下载完成后的通信 */
    downloadedYakitFlag?: string
    /** 启动并创建引擎进程 */
    startAndCreateEngineProcess?: boolean
    /** 下载指定版本yaklang */
    downYaklangSpecifyVersion: string
    /** 校验引擎下载最新引擎失败或取消 */
    checkEngineDownloadLatestVersionCancel?: string
    /** 系统检测校验引擎是否是官方发布 下载最新引擎 */
    useOfficialEngineByDownload?: string
    /** 系统检测校验引擎是否是官方发布 使用内置引擎 */
    useOfficialEngineByDownloadByBuiltIn?: string
}
