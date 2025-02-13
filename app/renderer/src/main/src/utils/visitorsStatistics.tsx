import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {isCommunityEdition} from "@/utils/envfile"
const {ipcRenderer} = window.require("electron")
let MachineID: string = ""

/** 获取机器码 */
const getMachineIDOperation = () => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetMachineID", {})
            .then((obj: {MachineID: string}) => {
                MachineID = obj.MachineID
                resolve(true)
            })
            .catch((e) => {
                reject()
            })
    })
}

const visitorsStatisticsOperation = (token?: string) => {
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.TouristRequest, API.ActionSucceeded>({
            url: "tourist",
            method: "post",
            data: {
                macCode: MachineID,
                token: token
            }
        })
            .then((data) => {})
            .catch((err) => {})
            .finally(() => {
                resolve(true)
            })
    })
}

/** 游客信息统计 */
export const visitorsStatisticsFun = async (token?: string) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (MachineID.length === 0) {
                await getMachineIDOperation()
            }
            visitorsStatisticsOperation(token)
            resolve(true)
        } catch (error) {resolve(false)}
    })
}
