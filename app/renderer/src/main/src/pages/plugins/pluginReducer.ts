import {API} from "@/services/swagger/resposeType"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "./online/PluginsOnlineType"

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

export const pluginOnlineReducer = (state: YakitPluginListOnlineResponse, action: OnlinePluginAppAction) => {
    const {response, list = [], item} = action.payload
    switch (action.type) {
        case "add":
            if (response?.pagemeta.page === 1) {
                return {
                    data:
                        response?.data.map((ele) => ({
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
                        ...list?.map((ele) => ({
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
                return {
                    ...state
                }
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
                return {
                    ...state
                }
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
            return {
                ...state
            }
        default:
            return state
    }
}
