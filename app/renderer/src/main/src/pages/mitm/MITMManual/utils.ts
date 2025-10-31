import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {defaultSingleManualHijack} from "@/defaultConstants/mitmV2"
import i18n from "@/i18n/i18n"
import {yakitNotify} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

export interface SingleManualHijackControlMessage {
    TaskID: string
    Request?: Uint8Array
    Response?: Uint8Array
    HijackResponse?: boolean
    CancelHijackResponse?: boolean
    Drop?: boolean
    Forward?: boolean
    SendPacket?: boolean
    Tags?: string[]
    UpdateTags?: boolean
    Payload?: Uint8Array
}
/**手动劫持操作 */
const grpcMITMManualHijackMessage: APIFunc<SingleManualHijackControlMessage, null> = (params) => {
    return new Promise((resolve, reject) => {
        const url = `mitmV2-manual-hijack-message`
        ipcRenderer.invoke(url, params).then(resolve).catch(reject)
    })
}

export interface MITMSetColorRequest {
    TaskID: string
    Tags: string[]
}

/**设置颜色 */
export const grpcMITMSetColor: APIFunc<MITMSetColorRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage({
            ...params,
            UpdateTags: true
        })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify("error", "grpcMITMSetColor " + (i18n.language === "zh" ? "失败：" : "failed:") + e)
                reject(e)
            })
    })
}
export interface MITMV2HijackedCurrentResponseRequest {
    TaskID: string
    SendPacket: boolean
    Request?: Uint8Array
    Response?: Uint8Array
    Payload?: Uint8Array
}
/**发送劫持请当前请求的消息，可以劫持当前响应的请求 */
export const grpcMITMV2HijackedCurrentResponse: APIFunc<MITMV2HijackedCurrentResponseRequest, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage({
            ...params,
            HijackResponse: true
        })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        "grpcMITMV2HijackedCurrentResponse " + (i18n.language === "zh" ? "失败：" : "failed:") + e
                    )
                reject(e)
            })
    })
}
export interface MITMV2CancelHijackedCurrentResponseRequest extends MITMV2HijackedCurrentResponseRequest {}
/** 取消 劫持该Request对应得响应 */
export const grpcMITMV2CancelHijackedCurrentResponse: APIFunc<MITMV2CancelHijackedCurrentResponseRequest, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage({
            ...params,
            CancelHijackResponse: true
        })
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        "grpcMITMV2CancelHijackedCurrentResponse " + (i18n.language === "zh" ? "失败：" : "failed:") + e
                    )
                reject(e)
            })
    })
}

export interface MITMV2DropRequest {
    TaskID: string
    Drop: boolean
}
/**丢弃 Request或者Response 后端自己根据status区分 */
export const grpcMITMV2Drop: APIFunc<MITMV2DropRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify("error", "grpcMITMV2Drop " + (i18n.language === "zh" ? "失败：" : "failed:") + e)
                reject(e)
            })
    })
}
export interface MITMV2ForwardRequest {
    TaskID: string
    Forward: boolean
}
/**转发 Request或者Response 后端自己根据status区分*/
export const grpcMITMV2Forward: APIFunc<MITMV2ForwardRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify("error", "grpcMITMV2Forward " + (i18n.language === "zh" ? "失败：" : "failed:") + e)
                reject(e)
            })
    })
}
export interface MITMV2SubmitRequestDataRequest {
    TaskID: string
    Request: Uint8Array
}
/**提交Request数据 */
export const grpcMITMV2SubmitRequestData: APIFunc<MITMV2SubmitRequestDataRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage({...params, SendPacket: true})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        "grpcMITMV2SubmitRequestData " + (i18n.language === "zh" ? "失败：" : "failed:") + e
                    )
                reject(e)
            })
    })
}

export interface MITMV2SubmitRequestDataResponseRequest {
    TaskID: string
    Response: Uint8Array
}
/**提交Response数据 */
export const grpcMITMV2SubmitResponseData: APIFunc<MITMV2SubmitRequestDataResponseRequest, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage({...params, SendPacket: true})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        "grpcMITMV2SubmitResponseData " + (i18n.language === "zh" ? "失败：" : "failed:") + e
                    )
                reject(e)
            })
    })
}

export interface MITMV2SubmitPayloadDataRequest {
    TaskID: string
    Payload: Uint8Array
}
/**提交WS数据 */
export const grpcMITMV2SubmitPayloadData: APIFunc<MITMV2SubmitPayloadDataRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage({...params, SendPacket: true})
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        "grpcMITMV2SubmitPayloadData " + (i18n.language === "zh" ? "失败：" : "failed:") + e
                    )
                reject(e)
            })
    })
}

/**刷新重置手动劫持列表 */
export const grpcMITMV2RecoverManualHijack: APINoRequestFunc<null> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("mitmV2-recover-manual-hijack")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError)
                    yakitNotify(
                        "error",
                        "grpcMITMV2RecoverManualHijack " + (i18n.language === "zh" ? "失败：" : "failed:") + e
                    )
                reject(e)
            })
    })
}
