export type WebFuzzerEventProps = {
    onRefWebFuzzer?: string
    /**设置fuzzer tab高级配置显示/隐藏对应得tab样式 */
    onGetFuzzerAdvancedConfigShow: string
    onImportYamlPopEditorContent: string
    onImportYamlEditorChange: string
    onFuzzerSequenceImportUpdateMenu: string
    onGetExportFuzzer: string
    onGetExportFuzzerCallBack: string
    onOpenMatchingAndExtractionCard: string
    onOpenFuzzerModal: string
    onRunChatcsAIByFuzzer: string
    /**设置tab【配置】/【规则】中得高级配置显示/隐藏 */
    onSetAdvancedConfigShow: string
    /** 发送到HTTPFuzzerPage 切换【配置】/【规则】tab 得选中type */
    onSwitchTypeWebFuzzerPage: string
    /**
     * 1.发送到WebFuzzerPage
     * 2.序列包裹层点击tab切换到【配置】/【规则】
     * */
    sequenceSendSwitchTypeToFuzzer: string
    /**发送到MainOperatorContent层中切换【序列】/(【规则】/配置) */
    sendSwitchSequenceToMainOperatorContent: string
    /**VariableList组件从数据中心刷新最新的展开项 */
    onRefVariableActiveKey?: string
    /**打开匹配器和提取器Modal */
    openMatcherAndExtraction: string

    /** 全局刷新器返回数据-发送请求里丢弃包的数量 */
    onGetDiscardPackageCount: string
}
