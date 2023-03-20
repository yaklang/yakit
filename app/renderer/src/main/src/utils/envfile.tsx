export enum ENTERPRISE_STATUS {
    IS_ENTERPRISE_STATUS = 1
}

// 是否为企业-简易版 
export let isSimpleEnterprise:boolean = false

/**
 *  版本变量
 *  @readonly
 *  @enum {number} IS_NEW_UI 新UI
 */
export enum EDITION_STATUS {
    IS_NEW_UI = 2
}

export const getJuageEnvFile = () => {
    switch (process.env?.REACT_APP_PLATFORM) {
        case "enterprise":
            return ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS
        case "simple-enterprise":
            isSimpleEnterprise = true
            return ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS
        case "newUI":
            return EDITION_STATUS.IS_NEW_UI
        default:
            return 0
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
