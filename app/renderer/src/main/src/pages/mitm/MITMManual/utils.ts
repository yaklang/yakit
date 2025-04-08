import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {defaultSingleManualHijack} from "@/defaultConstants/mitmV2"
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
    Tags?: string[]
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
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMSetColor 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMV2HijackedCurrentResponseV2Request {
    TaskID: string
    HijackResponse: boolean
}
/**发送劫持请当前请求的消息，可以劫持当前响应的请求 */
export const grpcMITMV2HijackedCurrentResponse: APIFunc<MITMV2HijackedCurrentResponseV2Request, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMV2HijackedCurrentResponse 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMV2CancelHijackedCurrentResponseRequest {
    TaskID: string
    CancelHijackResponse: boolean
}
/** 取消 劫持该Request对应得响应 */
export const grpcMITMV2CancelHijackedCurrentResponse: APIFunc<MITMV2CancelHijackedCurrentResponseRequest, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMV2CancelHijackedCurrentResponse 失败:" + e)
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
                if (!hiddenError) yakitNotify("error", "grpcMITMV2Drop 失败:" + e)
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
                if (!hiddenError) yakitNotify("error", "grpcMITMV2Forward 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMV2SubmitRequestDataRequest {
    TaskID: string
    Request: Uint8Array
}
/**提交数据 */
export const grpcMITMV2SubmitRequestData: APIFunc<MITMV2SubmitRequestDataRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "MITMV2SubmitRequestData 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMV2SubmitRequestDataResponseRequest {
    TaskID: string
    Response: Uint8Array
}
export const grpcMITMV2SubmitResponseData: APIFunc<MITMV2SubmitRequestDataResponseRequest, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        grpcMITMManualHijackMessage(params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "MITMV2SubmitRequestData 失败:" + e)
                reject(e)
            })
    })
}

export const grpcMITMV2RecoverManualHijack: APINoRequestFunc<null> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("mitmV2-recover-manual-hijack")
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMV2RecoverManualHijack 失败:" + e)
                reject(e)
            })
    })
}
