export type UpdateYakitYaklangEventProps = {
    /** 菜单栏上的更新yakit或yaklang */
    activeUpdateYakitOrYaklang: string
    /** yakit下载完成后的通信 */
    downloadedYakitFlag?: string
    /** 启动并创建引擎进程 */
    startAndCreateEngineProcess?: boolean
    /** 下载指定版本yaklang */
    downYaklangSpecifyVersion: string
}
