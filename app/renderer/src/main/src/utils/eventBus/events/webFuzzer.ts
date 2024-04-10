export type WebFuzzerEventProps = {
    onSetFuzzerAdvancedConfigShow?: string
    onRefWebFuzzer?: string
    onGetFuzzerAdvancedConfigShow: string
    onImportYamlPopEditorContent: string
    onImportYamlEditorChange: string
    onFuzzerSequenceImportUpdateMenu: string
    onGetExportFuzzer: string
    onGetExportFuzzerCallBack: string
    onOpenMatchingAndExtractionCard: string
    onOpenFuzzerModal: string
    /**切换 Fuzzer 规则和配置 用来显示高级配置的内容 */
    onFuzzerAdvancedConfigShowType: string
    /**fuzzer 切换规则对应得高级配置显示内容 */
    onSetAdvancedConfigRuleShow: string
    /**切换【序列】包裹层的type */
    onSwitchTypeFuzzerSequenceWrapper: string
    /** 切换【配置】/【规则】包裹层的type */
    onSwitchTypeWebFuzzerPage: string
}
