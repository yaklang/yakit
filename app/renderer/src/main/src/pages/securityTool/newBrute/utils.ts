import {yakitNotify} from "@/utils/notification"
import {DataNode} from "antd/lib/tree"
import {BruteExecuteExtraFormValue} from "./NewBruteType"

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

export const defaultBruteExecuteExtraFormValue: BruteExecuteExtraFormValue = {
    Concurrent: 50,
    DelayMax: 5,
    DelayMin: 1,
    OkToStop: true,
    PasswordFile: "",
    Passwords: [],
    PasswordsDict: [],
    ReplaceDefaultPasswordDict: false,
    PluginScriptName: "",
    Prefix: "",
    TargetFile: "",
    TargetTaskConcurrent: 1,
    Targets: "",
    Type: "",
    UsernameFile: "",
    Usernames: [],
    UsernamesDict: [],
    ReplaceDefaultUsernameDict: false,
}
