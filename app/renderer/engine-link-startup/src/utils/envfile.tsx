export enum PRODUCT_RELEASE_EDITION {
    Yakit = 0,
    /**@name 企业版 */
    EnpriTrace = 1,
    /**@name 便携版/简易版 */
    EnpriTraceAgent = 2,
    /**@name IRify扫描(IRify独立于企业版社区版之外,其自身拥有企业版) */
    IRify = 4,
    /**@name IRify扫描-企业版 */
    IRifyEnpriTrace = 5,
    /**@name memfit (AIAgent独立于企业版社区版之外) */
    MEMFIT = 6
}

export const getReleaseEditionName = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return "EnpriTrace"
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return "EnpriTraceAgent"
        case PRODUCT_RELEASE_EDITION.IRify:
            return "IRify"
        case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
            return "IRify-EnpriTrace"
        case PRODUCT_RELEASE_EDITION.MEMFIT:
            return "Memfit AI"
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

/** CE */
export const isCommunityEdition = () => {
    return (
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit ||
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.IRify ||
        GetReleaseEdition() === PRODUCT_RELEASE_EDITION.MEMFIT
    )
}
/** 非CE */
export const isEnterpriseEdition = () => {
    return !isCommunityEdition() && !isCommunityIRify() && !isCommunityMemfit()
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

/** CE Memfit AIAgent  */
export const isCommunityMemfit = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.MEMFIT
}

export const GetReleaseEdition = () => {
    switch (fetchEnv()) {
        case "enterprise":
            return PRODUCT_RELEASE_EDITION.EnpriTrace
        case "simple-enterprise":
            return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
        case "irify":
            return PRODUCT_RELEASE_EDITION.IRify
        case "irify-enterprise":
            return PRODUCT_RELEASE_EDITION.IRifyEnpriTrace
        case "memfit":
            return PRODUCT_RELEASE_EDITION.MEMFIT
        default:
            return PRODUCT_RELEASE_EDITION.Yakit
    }
}

export const fetchEnv = () => {
    try {
        return import.meta.env.VITE_PLATFORM
    } catch (e) {
        return ""
    }
}

export const GetConnectPort = () => {
    switch (fetchEnv()) {
        case "enterprise":
            return 9012
        case "simple-enterprise":
            return 9013
        case "irify":
            return 9014
        case "irify-enterprise":
            return 9015
        case "memfit":
            return 9016
        default:
            return 9011
    }
}

export type SoftwareVersion = "yakit" | "irify" | "memfit"
/** 获取软件是什么版本(yakit|irify|memfit) */
export const FetchSoftwareVersion: () => SoftwareVersion = () => {
    switch (fetchEnv()) {
        case "irify":
        case "irify-enterprise":
            return "irify"
        // case "memfit":
        //     return "memfit"
        default:
            return "yakit"
    }
}
