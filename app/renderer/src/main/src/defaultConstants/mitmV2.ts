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

export const ManualHijackListStatusMap: (t: (text: string) => string) => Record<string, string> = (t) => {
    return {
        "hijacking request": t("MITMV2ManualEditor.hijackRequest"),
        "hijacking response": t("MITMV2ManualEditor.hijackResponseAction"),
        "wait hijack": t("MITMV2ManualEditor.waitingForHijack"),
        "hijacking ws": t("MITMV2ManualEditor.wsHijack")
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
