import {API} from "@/services/swagger/resposeType"

export interface YakitPluginOnlineDetail extends API.PluginsDetail {
    /**1.2k */
    starsCountString?: string
    /**1.2K */
    downloadedTotalString?: string
}

export interface YakitPluginListOnlineResponse extends Omit<API.PluginsListResponse, "data"> {
    data: YakitPluginOnlineDetail[]
}
