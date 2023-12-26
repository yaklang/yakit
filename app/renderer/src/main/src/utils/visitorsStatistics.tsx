import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {failed} from "./notification"
import {isCommunityEdition} from "@/utils/envfile"
const {ipcRenderer} = window.require("electron")
let MachineID: string = ""

/** 获取机器码 */
const getMachineIDOperation = () => {
    return new Promise(async (resolve, reject) => {
        ipcRenderer
            .invoke("GetMachineID", {})
            .then((obj: {MachineID: string}) => {
                console.log("getMachineIDOperation", obj.MachineID)
                MachineID = obj.MachineID
                resolve(true)
            })
            .catch((e) => {
                failed(`获取机器码失败: ${e}`)
                reject()
            })
    })
}

const visitorsStatisticsOperation = () => {
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.TouristRequest, API.ActionSucceeded>({
            url: "tourist",
            method: "post",
            data: {
                macCode: MachineID
            }
        })
            .then((data) => {
                console.log("data", data)

                if (data.ok) {
                }
            })
            .catch((err) => {
                failed(`游客信息统计失败:${err}`)
            })
            .finally(() => {
                resolve(true)
            })
    })
}

/** 游客信息统计 */
export const visitorsStatisticsFun = async () => {
    return new Promise(async (resolve, reject) => {
        if (!isCommunityEdition()) resolve(true)
        if (MachineID.length > 0) {
            await visitorsStatisticsOperation()
            resolve(true)
        } else {
            try {
                await getMachineIDOperation()
                await visitorsStatisticsOperation()
                resolve(true)
            } catch (error) {}
        }
    })
}
