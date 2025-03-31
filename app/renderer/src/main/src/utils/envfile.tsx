import {info} from "@/utils/notification"
import {setRemoteValue} from "@/utils/kv"
import {RemoteGV} from "@/yakitGV"
import {RemotePrivateDomainGV} from "@/enums/privateDomain"

export enum PRODUCT_RELEASE_EDITION {
    Yakit = 0,
    /**@name 企业版 */
    EnpriTrace = 1,
    /**@name 便携版/简易版 */
    EnpriTraceAgent = 2,
    BreachTrace = 3,
    /**@name IRify扫描(IRify独立于企业版社区版之外,其自身拥有企业版) */
    IRify = 4,
    /**@name IRify扫描-企业版 */
    IRifyEnpriTrace = 5
}

export const getReleaseEditionName = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return "网络资产信息探测工具"
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return "EnpriTraceAgent"
        case PRODUCT_RELEASE_EDITION.BreachTrace:
            return "BAS"
        case PRODUCT_RELEASE_EDITION.IRify:
            return "IRify"
        case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
            return "IRify-EnpriTrace"
        default:
            return "Yakit"
    }
}
/** EE */
export const isEnpriTrace = () => {
    return (
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTrace ||
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
    )
}
/** SE  */
export const isEnpriTraceAgent = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTraceAgent
}

export const isBreachTrace = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.BreachTrace
}
/** CE */
export const isCommunityEdition = () => {
    return (
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit || GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify
    )
}
/** 非CE */
export const isEnterpriseEdition = () => {
    return !isCommunityEdition() && !isCommunityIRify()
}

/** CE IRify Scan  */
export const isCommunityIRify = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify
}

/** EE IRify Scan  */
export const isEnpriTraceIRify = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
}

/** IRify 独立于Yakit企业版社区版之外，其自身拥有企业版  */
export const isIRify = () => {
    return (
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify ||
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
    )
}

export const isEnterpriseOrSimpleEdition = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
        case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
            return true
        default:
            return false
    }
}

export const GetReleaseEdition = () => {
    switch (fetchEnv()) {
        case "enterprise":
        case "enpritrace":
            return PRODUCT_RELEASE_EDITION.EnpriTrace
        case "simple-enterprise":
        case "etraceagent":
            return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
        case "irify":
            return PRODUCT_RELEASE_EDITION.IRify
        case "irify-enterprise":
            return PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
        case "breachtrace":
            return PRODUCT_RELEASE_EDITION.BreachTrace
        default:
            return PRODUCT_RELEASE_EDITION.Yakit
    }
}

export const fetchEnv = () => {
    try {
        return process.env["REACT_APP_PLATFORM"]
    } catch (e) {
        return ""
    }
}

/*
 * 在导入的时候，就马上设置，不用等到组件加载
 * */
const {ipcRenderer} = window.require("electron")
ipcRenderer.invoke("set-release-edition-raw", fetchEnv() || "").then(() => {
    if (isEnpriTraceAgent()) {
        info(`设置 ${getReleaseEditionName()} 发行版成功`)
    }
})

/** 是否展示开发者工具 */
export const showDevTool = () => {
    const devTool = process.env?.REACT_APP_DEVTOOL || ""
    return devTool && devTool === "true"
}

export const globalUserLogout = () => {
    if (isCommunityEdition()) {
        return setRemoteValue(RemoteGV.TokenOnline, "")
    } else {
        return setRemoteValue(RemoteGV.TokenOnlineEnterprise, "")
    }
}

export const globalUserLogin = (token: any) => {
    if (isCommunityEdition()) {
        return setRemoteValue(RemoteGV.TokenOnline, token)
    } else {
        return setRemoteValue(RemoteGV.TokenOnlineEnterprise, token)
    }
}

export const getRemoteHttpSettingGV = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.Yakit:
            return RemotePrivateDomainGV.ceHttpSetting
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return RemotePrivateDomainGV.eeHttpSetting
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return RemotePrivateDomainGV.seHttpSetting
        case PRODUCT_RELEASE_EDITION.IRify:
            return RemotePrivateDomainGV.ceIRifyHttpSetting
        case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
            return RemotePrivateDomainGV.eeIRifyHttpSetting
        case PRODUCT_RELEASE_EDITION.BreachTrace:
            return RemotePrivateDomainGV.basHttpSetting
    }
}

export const getRemoteConfigBaseUrlGV = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.Yakit:
            return RemotePrivateDomainGV.ceConfigBaseUrl
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return RemotePrivateDomainGV.eeConfigBaseUrl
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return RemotePrivateDomainGV.seConfigBaseUrl
        case PRODUCT_RELEASE_EDITION.IRify:
            return RemotePrivateDomainGV.ceIRifyConfigBaseUrl
        case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
            return RemotePrivateDomainGV.eeIRifyConfigBaseUrl
        case PRODUCT_RELEASE_EDITION.BreachTrace:
            return RemotePrivateDomainGV.basConfigBaseUrl
    }
}
