import React from "react"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema"
import {failed} from "../../utils/notification"

const {ipcRenderer} = window.require("electron")

export const queryYakScriptList = (
    pluginType: string,
    onResult: (i: YakScript[], total?: number) => any,
    onFinally?: () => any,
    limit?: number,
    page?: number,
    keyword?: string,
    extraParam?: QueryYakScriptRequest,
    onFailed?: (e: any) => any,
    tag?: string[]
) => {
    if (limit !== undefined && limit <= 0) {
        limit = 200
    }
    ipcRenderer
        .invoke("QueryYakScript", {
            Type: pluginType,
            Tag: tag,
            ...(extraParam || {}),
            Keyword: keyword,
            Pagination: genDefaultPagination(limit, page)
        } as QueryYakScriptRequest)
        .then((rsp: QueryYakScriptsResponse) => {
            onResult(rsp.Data, rsp.Total)
        })
        .catch((e) => {
            failed(`Query Yak Plugin failed: ${e}`)
            if (onFailed) {
                onFailed(e)
            }
        })
        .finally(onFinally)
}
