// user info
const USER_INFO = {
    isLogin: false,
    platform: null,
    githubName: null,
    githubHeadImg: null,
    wechatName: null,
    wechatHeadImg: null,
    companyName:null,
    companyHeadImg:null,
    qqName: null,
    qqHeadImg: null,
    role: null,
    token: null,
    user_id: 0,
    showStatusSearch:false,
}
const HttpSetting = {
    httpBaseURL: "https://www.yaklang.com"
}

/**
 * yak引擎状态和配置参数
 * @property {Boolean} status 引擎是否启动
 * @property {String} defaultYakGRPCAddr 引擎启动地址(本地或者远端)
 * @property {String} password 暂时位置属性
 * @property {String} caPem 远端引擎证书密钥
 */
const GLOBAL_YAK_SETTING = {
    status: false,
    sudo: false,
    defaultYakGRPCAddr: "127.0.0.1:8087",
    password: "",
    caPem: ""
}

module.exports = {
    USER_INFO,
    HttpSetting,
    GLOBAL_YAK_SETTING
}
