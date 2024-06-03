import {QueryPortsRequest} from "@/pages/assetViewer/PortAssetPage"
import {PortAsset} from "@/pages/assetViewer/models"
import {QueryGeneralResponse, genDefaultPagination} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {Paging} from "@/utils/yakQueryHTTPFlow"

const {ipcRenderer} = window.require("electron")

export const defQueryPortsRequest: QueryPortsRequest = {
    Hosts: "",
    Ports: "",
    State: "open",
    Service: "",
    Title: "",
    TitleEffective: false,
    Keywords: "",
    ComplexSelect: "",
    RuntimeId: "",
    Pagination: {
        Limit:  20,
        Page: 1,
        OrderBy: "id",
        Order: "desc"
    }
}
/**
 * @description QueryPorts 获取端口资产表数据（基础版）
 */
export const apiQueryPortsBase: (params: QueryPortsRequest) => Promise<QueryGeneralResponse<PortAsset>> = (params) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`QueryPorts`, params)
            .then(resolve)
            .catch((e: any) => {
                yakitNotify("error", "获取端口列表出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description QueryPorts 获取升序的增量数据
 */
export const apiQueryPortsIncrementOrderAsc: (params: QueryPortsRequest) => Promise<QueryGeneralResponse<PortAsset>> = (
    params
) => {
    // 升序取增量数据
    // {
    //     "Pagination": {
    //       "Page": 1,
    //       "Limit": 2,
    //       "OrderBy": "id",
    //       "Order": "asc"
    //     },
    //     "RuntimeId": "7ae54faf-89f4-4303-8d91-54db8c7ce1ef",
    //     "AfterId":20
    //   }
    const newParams = {...params, BeforeId: undefined}
    return apiQueryPortsBase(newParams)
}
/**
 * @description QueryPorts 获取降序的增量数据
 */
export const apiQueryPortsIncrementOrderDesc: (
    params: QueryPortsRequest
) => Promise<QueryGeneralResponse<PortAsset>> = (params) => {
    // 降序取增量数据
    // {
    //     "Pagination": {
    //       "Page": 1,
    //       "Limit": 2,
    //       "OrderBy": "id",
    //       "Order": "desc"
    //     },
    //     "RuntimeId": "7ae54faf-89f4-4303-8d91-54db8c7ce1ef",
    //     "BeforeId":20
    //   }
    const newParams = {...params, AfterId: undefined}
    return apiQueryPortsBase(newParams)
}
