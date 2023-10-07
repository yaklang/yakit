import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "./online/PluginsOnlineType"
import {QueryYakScriptsResponse, YakScript} from "../invoker/schema"

// ----------------------- 线上
// 初始 state
export const initialOnlineState: YakitPluginListOnlineResponse = {
    data: [],
    pagemeta: {
        limit: 20,
        page: 0,
        total: 0,
        total_page: 1
    }
}

type OnlinePluginType = "add" | "update" | "remove" | "unLikeAndLike" | "download"

// 定义 action 的类型
export interface OnlinePluginAppAction {
    type: OnlinePluginType
    payload: {
        response?: YakitPluginListOnlineResponse
        list?: YakitPluginOnlineDetail[]
        item?: YakitPluginOnlineDetail
    }
}

/**大于1000，变为k，例如:1290转为1.2k */
const thousandthConversion = (n: number): string => {
    const number = n
    let shortString = ""
    if (number > 10000000) {
        shortString = "9999K+"
    } else if (number > 1000) {
        shortString = `${Math.floor(number / 100) / 10}k`
    } else {
        shortString = `${number}`
    }
    return shortString
}

export const pluginOnlineReducer = (
    state: YakitPluginListOnlineResponse,
    action: OnlinePluginAppAction
): YakitPluginListOnlineResponse => {
    const {response, list = [], item} = action.payload
    switch (action.type) {
        case "add":
            if (response?.pagemeta.page === 1) {
                return {
                    data:
                        (response?.data || []).map((ele) => ({
                            ...ele,
                            starsCountString: thousandthConversion(ele.stars),
                            commentCountString: thousandthConversion(ele.comment_num),
                            downloadedTotalString: thousandthConversion(ele.downloaded_total)
                        })) || [],
                    pagemeta: response?.pagemeta || {
                        limit: 20,
                        page: 1,
                        total: 0,
                        total_page: 1
                    }
                }
            } else {
                return {
                    data: [
                        ...state.data,
                        ...(response?.data || []).map((ele) => ({
                            ...ele,
                            starsCountString: thousandthConversion(ele.stars),
                            commentCountString: thousandthConversion(ele.comment_num),
                            downloadedTotalString: thousandthConversion(ele.downloaded_total)
                        }))
                    ],
                    pagemeta: response?.pagemeta || {
                        limit: 20,
                        page: 1,
                        total: 0,
                        total_page: 1
                    }
                }
            }
        case "update":
            if (item) {
                const index = state.data.findIndex((ele) => ele.uuid === item.uuid)
                if (index !== -1) {
                    state.data[index] = {
                        ...item
                    }
                }
                return {
                    ...state,
                    data: [...state.data]
                }
            } else {
                return state
            }

        case "remove":
            if (item) {
                return {
                    ...state,
                    data: state.data.filter((ele) => ele.id !== item.id)
                }
            } else {
                return state
            }
        case "unLikeAndLike":
            const indexLike = state.data.findIndex((ele) => ele.uuid === item?.uuid)
            if (item && indexLike !== -1) {
                let newLikeItem = state.data[indexLike]
                if (newLikeItem.is_stars) {
                    newLikeItem.is_stars = false
                    newLikeItem.stars = newLikeItem.stars - 1
                    newLikeItem.starsCountString = thousandthConversion(newLikeItem.stars)
                } else {
                    newLikeItem.is_stars = true
                    newLikeItem.stars = newLikeItem.stars + 1
                    newLikeItem.starsCountString = thousandthConversion(newLikeItem.stars)
                }
                state.data[indexLike] = {
                    ...newLikeItem
                }
                return {
                    ...state,
                    data: [...state.data]
                }
            } else {
                return state
            }
        case "download":
            const indexDownload = state.data.findIndex((ele) => ele.uuid === item?.uuid)
            if (item && indexDownload !== -1) {
                let newDownloadItem = state.data[indexDownload]
                newDownloadItem.downloaded_total = newDownloadItem.downloaded_total + 1
                newDownloadItem.downloadedTotalString = thousandthConversion(newDownloadItem.downloaded_total)
                state.data[indexDownload] = {
                    ...newDownloadItem
                }
                return {
                    ...state,
                    data: [...state.data]
                }
            }
            return state
        default:
            return state
    }
}

// -----------------------

// ----------------------- 本地
export const initialLocalState: QueryYakScriptsResponse = {
    Data: [],
    Pagination: {
        Limit: 10,
        Page: 0,
        OrderBy: "",
        Order: ""
    },
    Total: 0
}

type LocalPluginType = "add" | "update" | "remove"

// 定义 action 的类型
export interface LocalPluginAppAction {
    type: LocalPluginType
    payload: {
        response?: QueryYakScriptsResponse
        list?: YakScript[]
        item?: YakScript
    }
}

export const pluginLocalReducer = (
    state: QueryYakScriptsResponse,
    action: LocalPluginAppAction
): QueryYakScriptsResponse => {
    const {response, list = [], item} = action.payload
    switch (action.type) {
        case "add":
            if (response?.Pagination.Page === 1) {
                return {
                    Data: response?.Data || [],
                    Pagination: response?.Pagination || {
                        Limit: 20,
                        Page: 1,
                        OrderBy: "",
                        Order: ""
                    },
                    Total: response?.Total
                }
            } else {
                return {
                    Data: [...state.Data, ...(response?.Data || [])],
                    Pagination: response?.Pagination || {
                        Limit: 20,
                        Page: 1,
                        OrderBy: "",
                        Order: ""
                    },
                    Total: response?.Total || 0
                }
            }
        case "update":
            if (item) {
                const index = state.Data.findIndex((ele) => ele.ScriptName === item.ScriptName)
                if (index !== -1) {
                    state.Data[index] = {
                        ...item
                    }
                }
                return {
                    ...state,
                    Data: [...state.Data]
                }
            } else {
                return state
            }

        case "remove":
            if (item) {
                return {
                    ...state,
                    Data: state.Data.filter((ele) => ele.ScriptName !== item.ScriptName)
                }
            } else {
                return state
            }
        default:
            return state
    }
}

// -----------------------
