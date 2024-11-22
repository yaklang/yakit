export type MitmEventProps = {
    cleanMitmLogEvent?: string
    cancleMitmFilterEvent: string
    onGetMITMShieldDataEvent: string
    /** 是否配置过过滤器白名单文案 */
    onSetFilterWhiteListEvent: string
    /** 是否开启替换规则 */
    onOpenRepRuleEvent: string
    onChangeAddrAndEnableInitialPlugin: string
    onClearMITMHackPlugin?: string
    onHasParamsJumpHistory: string
    onHistoryTagToMitm: string
    onHistorySourceTypeToMitm: string
    onMitmClearFromPlugin?: string
    onMitmSearchInputVal: string
    onMITMLogProcessQuery: string
    onMitmCurProcess: string
}
