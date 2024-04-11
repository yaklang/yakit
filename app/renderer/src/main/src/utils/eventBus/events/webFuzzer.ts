export type WebFuzzerEventProps = {
    /**设置【配置】tab中得高级配置显示 */
    onSetAdvancedConfigConfigureShow?: string
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
    /**设置【规则】tab中得高级配置显示 */
    onSetAdvancedConfigRuleShow?: string
    /** 切换【配置】/【规则】包裹层的type */
    onSwitchTypeWebFuzzerPage: string
}
