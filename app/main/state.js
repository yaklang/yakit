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
 */
const Global_YAK_SETTING = {
    status: false,
    defaultYakGRPCAddr: "127.0.0.1:8087",
    password: "",
    caPem: "",
    isExist: false
}

module.exports = {
    USER_INFO,
    HttpSetting,
    Global_YAK_SETTING
}
