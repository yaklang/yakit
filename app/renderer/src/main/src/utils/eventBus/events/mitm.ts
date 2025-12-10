/** 在v1,v2版本同时存在时，需要传版本号 */
export type MitmEventProps = {
    cleanMitmLogEvent: string
    cancleMitmFilterEvent: string
    cancleMitmAllFilterEvent?: string
    onGetMITMShieldDataEvent: string
    onMitmNoResetRefreshEvent: string
    onMitmResetRefreshEvent: string
    /** 重新刷新获过检测过滤器白名单文案 */
    onRefFilterWhiteListEvent?: string
    /** 重新刷新获取规则检测是否开启替换规则 */
    onRefreshRuleEvent?: string
    onChangeAddrAndEnableInitialPlugin: string

    onClearMITMHackPlugin: string
    onHasParamsJumpHistory: string
    onHistoryTagToMitm: string
    onHistorySourceTypeToMitm: string
    onMitmClearFromPlugin?: string
    onMitmSearchInputVal: string
    onMITMLogProcessQuery: string
    onMitmCurProcess: string
    /**该信号不用传版本号，是mitm页面通知流量分析页面 */
    onRefreshCurrentRules?: string

    /**Tun劫持服务启动时，关闭页面或关闭MITM需同时执行Tun服务关闭及其列表清空 */ 
    onCloseTunHijackConfirmModal: "mitm" | "page"
    /**Tun劫持服务已通知关闭及清空 */ 
    onCloseTunHijackCallback: "mitm" | "page"
    /**关闭MITM时先行校验其是否启动Tun劫持服务如若没有启动则正常关闭，否则需先关闭服务及列表清空 */
    onCloseTunHijackByPage?: string
}
