import {ipcRenderer} from "electron";
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "../invoker/schema";
import {failed} from "../../utils/notification";

export const queryYakScriptList = (
    pluginType: string,
    onResult: (i: YakScript[], total?: number) => any,
    onFinally?: () => any,
    limit?: number,
) => {
    if (limit !== undefined && limit <= 0) {
        limit = 200
    }
    ipcRenderer.invoke("QueryYakScript", {
        Type: pluginType, Pagination: genDefaultPagination(limit),
    } as QueryYakScriptRequest).then((rsp: QueryYakScriptsResponse) => {
        onResult(rsp.Data, rsp.Total)
    }).catch(e => {
        failed(`Query Yak Plugin failed: ${e}`)
    }).finally(onFinally)
}