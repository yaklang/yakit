import {MITMConsts} from "@/pages/mitm/MITMConsts"
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
    /** @name 私有域地址 */
    HttpSetting = "httpSetting",
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

    /** @name webFuzzer页面以及每个页面的数据缓存字段 */
    FuzzerCache = "fuzzer-list-cache",
    /** @name webFuzzer序列的缓存字段 */
    FuzzerSequenceCache = "fuzzer_sequence_cache",
    /** @name history页面左侧tabs */
    HistoryLeftTabs = "new_history_left_tabs",
    /** @name 临时项目记录是否记住不给提示 */
    TemporaryProjectNoPrompt = "temporary_project_no_prompt",
    /** @name 插件组删除是否记住不给提示 */
    PluginGroupDelNoPrompt = "plugin_group_del_no_prompt",
    /** @name mitm劫持左侧tabs */
    MitmHijackedLeftTabs = "mitm_hijacked_left_tabs",
    /** @name history编辑器响应美化&渲染 */
    HistoryResponseEditorBeautify = "history_response_editor_beautify",
    /** @name history编辑器请求美化&渲染 */
    HistoryRequestEditorBeautify = "history_request_editor_beautify",
    /** @name WebFuzzer编辑器美化 */
    WebFuzzerEditorBeautify = "webFuzzer_editor_beautify",
    /** @name WebFuzzer编辑器美化&渲染 */
    WebFuzzerOneResEditorBeautifyRender = "webFuzzer_one_res_editor_beautify_render",
    /**@name 专项漏洞关键词搜索缓存 */
    PocPluginKeywords = "poc-plugin-keywords",
    /**@name MITM 用户数据是否保存 */
    MITMUserDataSave = "mitm_user_data_save",
    /**@name WebFuzzer高级配置内容的显/隐 */
    WebFuzzerAdvancedConfigShow = "web_fuzzer_advanced_config_show",
    /**@name MITM热加载代码保存 */
    MITMHotPatchCodeSave = "mitm_hot_patch_code_save",
    /**@name fuzzer序列页面中,页面配置内容的显/隐 */
    FuzzerSequenceSettingShow = "fuzzer_sequence_setting_show",
    /**@name WebFuzzer最大响应数量限制 */
    FuzzerResMaxNumLimit="fuzzer_res_max_limit",
    /**@name Histroy编码缓存 */
    HistoryResCodeKey="history_res_code_key",
    /**@name WebFuzzer编码缓存 */
    webFuzzerEditorCodeKey="webfuzzer_editor_code_key",
    /**@name WebFuzzer一个编辑器编码缓存 */
    webFuzzerOneResEditorCodeKey="webfuzzer_one_res_editor_code_key"
}

/** 项目逻辑全局变量 */
export enum CodeGV {
    /** @name 官网地址 */
    HomeWebsite = "https://www.yaklang.com",
    /** @name 远程连接配置信息文件路径 */
    RemoteLinkPath = "$HOME/yakit-projects/auth/yakit-remote.json",
    /** @name 历史版本下载页面 */
    HistoricalVersion = "https://github.com/yaklang/yakit/releases",
    /** @name public版本菜单模式 */
    PublicMenuModeValue = "public",
    /** @name 菜单状态缓存 */
    MenuExpand = "menu-expand",
    /** @name 插件参数-帮助文档地址 */
    PluginParamsHelp = "https://yaklang.com/products/Plugin-repository/plugins/plugin_create"
}

/**YakitAutoComplate + YakitSelect缓存下拉和默认值变量 */
export enum CacheDropDownGV {
    /** @name mitm 劫持代理监听主机 */
    MITMDefaultHostHistoryList = "mitm_default_host_history",
    /** @name CVETable 设置代理 */
    CVEProxyList = "cev_proxy_list",
    /** @name 私有域地址 */
    ConfigBaseUrl = "config_base_url",
    /** @name 配置插件源 -》设置代理 */
    ConfigProxy = "config_proxy",
    /** @name MITM 保存用户数据地址 */
    MITMSaveUserDataDir = "mitm_save_user_data_dir",
    /** @name MITM webFuzzer 代理 */
    WebFuzzerProxyList = "web_fuzzer_proxy_list",
    /** @name WebFuzzer 插入文件 */
    WebFuzzerInsertFileFuzzTag = "web_fuzzer_insert_file_fuzz_tag"
}
