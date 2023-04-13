export enum PRODUCT_RELEASE_EDITION {
    Yakit = 0,
    EnpriTrace = 1,
    EnpriTraceAgent = 2,
    BreachTrace = 3,
}

/**
 *  版本变量
 *  @readonly
 *  @enum {number} IS_NEW_UI 新UI
 */
export enum EDITION_STATUS {
    IS_NEW_UI = 2
}

export const shouldOverrideMenuItem = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return true
        default:
            return false
    }
}

export const isEnpriTraceAgent = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.EnpriTraceAgent
}

export const isBreachTrace = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.BreachTrace
}

export const isYakit = () => {
    return GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit
}

export const shouldVerifyLicense = () => {
    if (GetReleaseEdition() === PRODUCT_RELEASE_EDITION.Yakit) {
        return false
    }
    return true
}

export const shouldVerifyEnpriTraceLogin = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
            return true
    }
    return false
}

export const GetReleaseEdition = () => {
    switch (process.env?.REACT_APP_PLATFORM) {
        case "enterprise":
        case "enpritrace":
            return PRODUCT_RELEASE_EDITION.EnpriTrace
        case "simple-enterprise":
        case "etraceagent":
            return PRODUCT_RELEASE_EDITION.EnpriTraceAgent
        case "breachtrace":
            return PRODUCT_RELEASE_EDITION.BreachTrace
        case "newUI":
            return EDITION_STATUS.IS_NEW_UI
        default:
            return PRODUCT_RELEASE_EDITION.Yakit
    }
}
export const fetchEnv = () => {
    return process.env?.REACT_APP_PLATFORM
}

/** 是否展示开发者工具 */
export const showDevTool = () => {
    const devTool = process.env?.REACT_APP_DEVTOOL || ""
    return devTool && devTool === "true"
}
