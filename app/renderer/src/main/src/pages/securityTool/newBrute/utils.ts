import {yakitNotify} from "@/utils/notification"
import {DataNode} from "antd/lib/tree"
import {BruteExecuteExtraFormValue, StartBruteParams} from "./NewBruteType"
import {PayloadGroupNodeProps} from "@/pages/payloadManager/newPayload"
import cloneDeep from "lodash/cloneDeep"
import {defaultBruteExecuteExtraFormValue} from "@/defaultConstants/NewBrute"

const {ipcRenderer} = window.require("electron")
export interface Tree {
    Name: string
    Data: string
    Children: Tree[]
}
export interface GetAvailableBruteTypesResponse {
    /**@deprecated 新版弱口令后，该字段废弃 */
    Types: string[]
    TypesWithChild: Tree[]
}
/**
 * @description 获取弱口令的类型
 */
export const apiGetAvailableBruteTypes: () => Promise<DataNode[]> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAvailableBruteTypes", {})
            .then((res: GetAvailableBruteTypesResponse) => {
                const tree: DataNode[] = res.TypesWithChild.map((ele) => ({
                    key: ele.Data || `temporary-id-${ele.Name}`,
                    title: ele.Name,
                    children:
                        ele.Children && ele.Children.length > 0
                            ? ele.Children.map((ele) => ({key: ele.Data, title: ele.Name}))
                            : []
                }))
                resolve(tree)
            })
            .catch((e: any) => {
                yakitNotify("error", "获取弱口令的类型出错:" + e)
                reject(e)
            })
    })
}

/**
 * @description GetAllPayloadGroup
 */
export const apiGetAllPayloadGroup: () => Promise<PayloadGroupNodeProps[]> = () => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("GetAllPayloadGroup", {})
            .then((res: {Nodes: PayloadGroupNodeProps[]}) => {
                resolve(res.Nodes || [])
            })
            .catch((e: any) => {
                yakitNotify("error", "获取弱口令的类型出错:" + e)
                reject(e)
            })
    })
}

export interface CodecResponse {
    Result: string
    RawResult: string
}

/**
 * @description 处理字典内容
 */
export const apiPayloadByType: (value: string) => Promise<string> = (value) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("Codec", {Type: "fuzz", Text: `{{x(${value})}}`})
            .then((res: CodecResponse) => {
                resolve(res?.Result || "")
            })
            .catch((err) => {
                yakitNotify("error", `获取字典内容失败：${err.details}`)
            })
    })
}
/**
 * @name StartBrute 接口参数转换(前端数据转接口参数)
 * @description StartBrute
 */
export const convertStartBruteParams = (params: BruteExecuteExtraFormValue): StartBruteParams => {
    const {usernames = "", passwords = "", Targets = ""} = params
    const usernamesArr = !!usernames ? usernames.split(/,|\r?\n/) : []
    const passwordsArr = !!passwords ? passwords.split(/,|\r?\n/) : []
    const newParams = cloneDeep(params)
    delete newParams.usernames
    delete newParams.passwords
    delete newParams.replaceDefaultUsernameDict
    delete newParams.replaceDefaultPasswordDict
    const data: StartBruteParams = {
        ...newParams,
        ReplaceDefaultUsernameDict: !!!params.replaceDefaultUsernameDict,
        ReplaceDefaultPasswordDict: !!!params.replaceDefaultPasswordDict,
        Usernames: usernamesArr.concat(params.UsernamesDict || []),
        Passwords: passwordsArr.concat(params.PasswordsDict || []),
        Targets: Targets.split(/,|\r?\n/).join("\n")
    }
    delete data.UsernamesDict
    delete data.PasswordsDict
    return data
}

/**
 * @name StartBrute 接口参数转换(接口参数转前端数据)
 * @description StartBrute
 */
export const startBruteParamsConvertToFormValue = (params: StartBruteParams): BruteExecuteExtraFormValue => {
    const data: BruteExecuteExtraFormValue = {
        ...defaultBruteExecuteExtraFormValue,
        ...params,
        replaceDefaultUsernameDict: !!!params.ReplaceDefaultUsernameDict,
        replaceDefaultPasswordDict: !!!params.ReplaceDefaultPasswordDict,
        usernames: (params.Usernames?.length || 0) > 0 ? params.Usernames?.join(",") : "",
        passwords: (params.Passwords?.length || 0) > 0 ? params.Passwords?.join(",") : ""
    }
    return data
}

/**
 * @description StartBrute 弱口令检测
 */
export const apiStartBrute: (params: StartBruteParams, token: string) => Promise<null> = (params, token) => {
    return new Promise((resolve, reject) => {
        let executeParams: StartBruteParams = {
            ...params
        }
        ipcRenderer
            .invoke("StartBrute", executeParams, token)
            .then(() => {
                yakitNotify("info", `启动成功,任务ID: ${token}`)
                resolve(null)
            })
            .catch((error) => {
                yakitNotify("error", "弱口令检测执行出错:" + error)
                reject(error)
            })
    })
}

/**
 * @description 取消 StartBrute
 */
export const apiCancelStartBrute: (token: string) => Promise<null> = (token) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke(`cancel-StartBrute`, token)
            .then(() => {
                resolve(null)
            })
            .catch((e: any) => {
                yakitNotify("error", "取消弱口令检测执行出错:" + e)
                reject(e)
            })
    })
}
