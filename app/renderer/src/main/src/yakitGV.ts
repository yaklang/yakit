/** 本地文件缓存数据-键值变量 */
export enum LocalGV {
    /** @name 获取缓存数据里引擎的启动模式("local"|"remote") */
    YaklangEngineMode = "yaklang-engine-mode",
    /** @name 获取缓存数据里引擎启动配置 */
    YaklangEnginePort = "yaklang-engine-port",
    /** @name 关闭窗口的二次确认 */
    WindowsCloseFlag = "windows-close-flag",

    /** @name 是否自启最新版本检测 */
    NoAutobootLatestVersionCheck = "no-autoboot-latest-version-check",

    /** @name 未安装引擎提示框内的用户协议是否勾选 */
    IsCheckedUserAgreement = "is-checked-user-agreement",

    /** @name 重要更新的前瞻提示框-本地缓存值 */
    UpdateForwardAnnouncement = "update-forward-announcement",
    /** @name 判断前瞻提示框是否显示的界定值(代码里进行调整控制) */
    JudgeUpdateForwardAnnouncement = "v1.2.9-sp1"
}

/** 引擎数据库缓存数据-键值变量 */
export enum RemoteGV {
    /** @name 全局反连地址 */
    GlobalBridgeAddr = "yak-bridge-addr",
    /** @name 全局反连密钥 */
    GlobalBridgeSecret = "yak-bridge-secret",
    /** @name 是否复用全局DNS-Log配置 */
    GlobalDNSLogBridgeInherit = "yakit-DNSLOG_INHERIT_BRIDGE",
    /** @name 全局DNS-Log只看a记录 */
    GlobalDNSLogOnlyARecord = "dnslog-onlyARecord",
    /** @name 全局DNS-Log地址 */
    GlobalDNSLogAddr = "yak-dnslog-addr",
    /** @name 全局DNS-Log密钥 */
    GlobalDNSLogSecret = "yak-dnslog-secret",
    /** @name 登录账户Token(enterprise) */
    TokenOnlineEnterprise = "token-online-enterprise",
    /** @name 登录账户Token */
    TokenOnline = "token-online",
    /** @name 连接的项目数据库 */
    LinkDatabase = "link-database",
    /** @name 全局状态的查询间隔时间 */
    GlobalStateTimeInterval = "global-state-time-interval",
    /** @name 全局Chrome启动路径 */
    GlobalChromePath = "global-chrome-path",
    /** @name 软件内菜单展示模式 */
    PatternMenu = "PatternMenu",
    /** @name 是否展示引擎控制台  */
    ShowBaseConsole = "SHOW_BASE_CONSOLE",

    /** @name 菜单是否为用户自行导入的json数据 */
    IsImportJSONMenu = "is-import-json-menu",
    /** @name 用户删除的系统内定菜单 */
    UserDeleteMenu = "user-delete-menu",

    /** @name chat-cs聊天记录 */
    ChatCSStorage = "chat-cs-storage",
    
    /** @name history页面左侧tabs */
    HistoryLeftTabs = "new_history_left_tabs",
    /** @name 临时项目记录是否记住不给提示 */
    TemporaryProjectNoPrompt = "temporary_project_no_prompt",
    /** @name 插件组删除是否记住不给提示 */
    PluginGroupDelNoPrompt = "plugin_group_del_no_prompt",
    /** @name 插件列表插件组删除是否记住不给提示 */
    PluginListGroupDelNoPrompt = "plugin_list_group_del_no_prompt",
    /** @name mitm劫持左侧tabs */
    NewMitmHijackedLeftTabs = "new_mitm_hijacked_left_tabs",
    /** @name mitm idel 左侧tabs */
    MitmIdleLeftTabs = "mitm_idle_left_tabs",
    /** @name history编辑器响应美化&渲染 */
    HistoryResponseEditorBeautify = "history_response_editor_beautify",
    /** @name history编辑器请求美化&渲染 */
    HistoryRequestEditorBeautify = "history_request_editor_beautify",
    /**@name 专项漏洞关键词搜索缓存 */
    PocPluginKeywords = "poc-plugin-keywords",
    /**@name 代码扫描关键词搜索缓存 */
    CodeScanKeywords = "code-scan-keywords",
    /**@name MITM 用户数据是否保存 */
    MITMUserDataSave = "mitm_user_data_save",
    /**@name MITM热加载代码保存 */
    MITMHotPatchCodeSave = "mitm_hot_patch_code_save",
    /**@name fuzzer序列页面中,页面配置内容的显/隐 */
    FuzzerSequenceSettingShow = "fuzzer_sequence_setting_show",
    /**@name 漏洞风险导出字段缓存 */
    RiskExportFields = "risk-export-fields",
    /**@name RiskPage页面中,高级查询内容的显/隐 */
    RiskQueryShow = "risk-query-show",
    /**@name Home开始扫描 */
    HomeStartScanning = "home_start_scanning",
    /**@name xterm全局配置(字体样式、字体大小) */
    YakitXtermSetting = "yakit_xterm_setting",
    /**@name 端口监听器缓存的监听主机 */
    ReverseShellReceiverHostList = "reverse-shell-receiver-host-list",
    /**@name YakitDraggerContent组件限制文件大小 */
    YakitDraggerContentFileLimit = "yakit_dragger_content_file_limit",
    /**@name mitm禁用初始页 */
    MITMDisableCACertPage = "mitm_disable_CACertPage",
    /**@name 缓存一级菜单选择的tab的key值 */
    SelectFirstMenuTabKey = "select-first-menu-tab-key",
    /**@name 缓存谷歌免配置更多参数 */
    ChromeLauncherParams = "chrome-launcher-params",
    /**@name 批量执行左侧tabs */
    PluginBatchExecTabs = "plugin-batch-exec-tabs",
    /**@name 基础爬虫左侧tabs */
    SinglePluginExecTabs = "single-plugin-exec-tabs",
    /**@name 启用webSocket压缩 */
    MITMDisableWebsocketCompression = "mitm_disable_Websocket_Compression",
    /**@name 漏洞管理页面中,高级查询内容的显/隐 */
    AuditHoleShow = "audit-hole-show",
}

/** 项目逻辑全局变量 */
export enum CodeGV {
    /** @name 远程连接配置信息文件路径 */
    RemoteLinkPath = "$HOME/yakit-projects/auth/yakit-remote.json",
    /** @name public版本菜单模式 */
    PublicMenuModeValue = "public",
    /** @name 菜单状态缓存 */
    MenuExpand = "menu-expand"
}

/**YakitAutoComplate + YakitSelect缓存下拉和默认值变量 */
export enum CacheDropDownGV {
    /** @name mitm 劫持代理监听主机 */
    MITMDefaultHostHistoryList = "mitm_default_host_history",
    /** @name CVETable 设置代理 */
    CVEProxyList = "cev_proxy_list",
    
    /** @name 配置插件源 -》设置代理 */
    ConfigProxy = "config_proxy",
    /** @name MITM 保存用户数据地址 */
    MITMSaveUserDataDir = "mitm_save_user_data_dir",
    /** @name MITM webFuzzer 代理 */
    WebFuzzerProxyList = "web_fuzzer_proxy_list",
    /** @name WebFuzzer 插入文件 */
    WebFuzzerInsertFileFuzzTag = "web_fuzzer_insert_file_fuzz_tag"
}
