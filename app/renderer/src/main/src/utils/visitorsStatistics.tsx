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

const visitorsStatisticsOperation = () => {
    return new Promise(async (resolve, reject) => {
        NetWorkApi<API.TouristRequest, API.ActionSucceeded>({
            url: "tourist",
            method: "post",
            data: {
                macCode: MachineID
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
export const visitorsStatisticsFun = async (type?: "close") => {
    return new Promise(async (resolve, reject) => {
        if (!isCommunityEdition()) resolve(true)
        if (type === "close" && MachineID.length === 0) resolve(true)
        try {
            if (MachineID.length === 0) {
                await getMachineIDOperation()
            }
            visitorsStatisticsOperation()
            resolve(true)
        } catch (error) {}
    })
}
