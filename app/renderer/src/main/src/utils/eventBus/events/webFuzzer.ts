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
    /**设置【规则】tab中得高级配置显示/隐藏 */
    onSetAdvancedConfigRuleShow?: string
    /** 发送到HTTPFuzzerPage 切换【配置】/【规则】tab 得选中type */
    onSwitchTypeWebFuzzerPage: string
    /**
     * 1.发送到WebFuzzerPage
     * 2.序列包裹层点击tab切换到【配置】/【规则】
     * */
    sequenceSendSwitchTypeToFuzzer: string
    /**发送到MainOperatorContent层中切换【序列】/(【规则】/配置) */
    sendSwitchSequenceToMainOperatorContent: string
}
