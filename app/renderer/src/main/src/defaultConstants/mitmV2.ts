import { MITMHackerPageInfoProps } from "@/store/pageInfo";

export enum ManualHijackListAction {
    Add = "add",
    Delete = "delete",
    Update = "update",
    Reload = "reload",
    /**前端默认值与后端无关 */
    Empty = "empty"
}
export enum ManualHijackListStatus {
    HijackRequest = "hijack-request",
    HijackResponse = "hijack-response"
}

/**mitm v2 版本页面数据中心默认数据 */
export const defaultMITMHackerPageInfo: MITMHackerPageInfoProps = {
    immediatelyLaunchedInfo: {
        host: "",
        port: "",
        enableInitialPlugin: false
    }
}