/** 在v1,v2版本同时存在时，需要传版本号 */
export type MitmEventProps = {
    cleanMitmLogEvent: string
    cancleMitmFilterEvent: string
    cancleMitmAllFilterEvent?: string
    onGetMITMShieldDataEvent: string
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
}
