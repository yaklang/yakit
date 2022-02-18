import React from "react";
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema";
import {failed} from "../../utils/notification";

const {ipcRenderer} = window.require("electron");

export const queryYakScriptList = (
    pluginType: string,
    onResult: (i: YakScript[], total?: number) => any,
    onFinally?: () => any,
    limit?: number,
    page?: number,
    keyword?: string,
    extraParam?: QueryYakScriptRequest
) => {
    if (limit !== undefined && limit <= 0) {
        limit = 200
    }
    ipcRenderer.invoke("QueryYakScript", {
        Type: pluginType, Pagination: genDefaultPagination(limit, page),
        Keyword: keyword, ...(extraParam || {})
    } as QueryYakScriptRequest).then((rsp: QueryYakScriptsResponse) => {
        onResult(rsp.Data, rsp.Total)
    }).catch(e => {
        failed(`Query Yak Plugin failed: ${e}`)
    }).finally(onFinally)
};