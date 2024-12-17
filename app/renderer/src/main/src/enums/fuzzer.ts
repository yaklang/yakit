export enum FuzzerRemoteGV {
    /** @name webFuzzer页面以及每个页面的数据缓存字段 */
    FuzzerCache = "fuzzer-list-cache",
    /** @name webFuzzer序列的缓存历史缓存记录 */
    FuzzerSequenceCacheHistoryList = "fuzzer_sequence_cache-history-list",
    /** @name webFuzzer序列的缓存字段 */
    FuzzerSequenceCache = "fuzzer_sequence_cache",
    WEB_FUZZ_PROXY = "WEB_FUZZ_PROXY",
    WEB_FUZZ_DNS_Server_Config = "WEB_FUZZ_DNS_Server_Config",
    WEB_FUZZ_DNS_Hosts_Config = "WEB_FUZZ_DNS_Hosts_Config",
    /** @name WebFuzzer编辑器美化 */
    WebFuzzerEditorBeautify = "webFuzzer_editor_beautify",
    /** @name WebFuzzer编辑器美化&渲染 */
    WebFuzzerOneResEditorBeautifyRender = "webFuzzer_one_res_editor_beautify_render",
    /**@name WebFuzzer高级配置内容的显/隐 */
    WebFuzzerAdvancedConfigShow = "web_fuzzer_advanced_config_show",
    /**@name WebFuzzer最大响应数量限制 */
    FuzzerResMaxNumLimit = "new_fuzzer_res_max_limit",
    FuzzerRepeatTimes = "Fuzzer_Repeat_Times",
    FuzzerConcurrent = "Fuzzer_Concurrent",
    FuzzerMinDelaySeconds = "Fuzzer_MinDelaySeconds",
    FuzzerMaxDelaySeconds = "Fuzzer_MaxDelaySeconds",
}
