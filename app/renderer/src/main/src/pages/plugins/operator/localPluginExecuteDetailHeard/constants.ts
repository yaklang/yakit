import {PluginExecuteExtraFormValue} from "./LocalPluginExecuteDetailHeardType"

export const defPluginExecuteFormValue: PluginExecuteExtraFormValue = {
    IsHttps: false,
    IsRawHTTPRequest: false,
    RawHTTPRequest: Buffer.from("", "utf-8"),
    Method: "GET",
    Path: [],
    GetParams: [],
    Headers: [],
    Cookie: [],
    Body: Buffer.from("", "utf-8"),
    PostParams: [],
    MultipartParams: [],
    MultipartFileParams: [],
    IsHttpFlowId: false,
    HTTPFlowId: [],
    requestType: "original",
    rawHTTPRequest:''
}
