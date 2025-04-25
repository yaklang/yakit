import {SingleManualHijackControlMessage} from "@/pages/mitm/MITMManual/utils"
import {MITMHackerPageInfoProps} from "@/store/pageInfo"

export enum ManualHijackListAction {
    Hijack_List_Add = "add",
    Hijack_List_Delete = "delete",
    Hijack_List_Update = "update",
    /**重置手动劫持表格数据 */
    Hijack_List_Reload = "reload"
}

export enum ManualHijackListStatus {
    Hijacking_Request = "hijacking request",
    Hijacking_Response = "hijacking response",
    WaitHijack = "wait hijack",
    Hijack_WS = "hijacking ws"
}

export enum ManualHijackType {
    /**手动劫持 */
    Manual = "manual",
    /**自动放行 */
    Log = "log",
    /**被动日志 */
    Passive = "passive",
    /**条件劫持 */
    HijackFilter = "hijackFilter"
}

export enum PackageType {
    Request = "request",
    Response = "response",
    WS = "ws"
}

export const ManualHijackListStatusMap: Record<string, string> = {
    "hijacking request": "劫持请求",
    "hijacking response": "劫持响应",
    "wait hijack": "等待劫持",
    "hijacking ws": "WS 劫持"
}

/**mitm v2 版本页面数据中心默认数据 */
export const defaultMITMHackerPageInfo: MITMHackerPageInfoProps = {
    immediatelyLaunchedInfo: {
        host: "",
        port: "",
        enableInitialPlugin: false
    }
}

export const defaultSingleManualHijack: SingleManualHijackControlMessage = {
    TaskID: "",
    Request: new Uint8Array(),
    Response: new Uint8Array(),
    HijackResponse: false,
    CancelHijackResponse: false,
    Drop: false,
    Forward: false,
    Tags: [],
    Payload: new Uint8Array()
}
