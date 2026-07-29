import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { isCommunityEdition } from '@/utils/envfile'
import { yakitHost } from '@/services/electronBridge'
let MachineID: string = ''

/** 获取机器码 */
const getMachineIDOperation = () => {
  return new Promise(async (resolve, reject) => {
    yakitHost
      .getMachineID({})
      .then((obj: { MachineID: string }) => {
        MachineID = obj.MachineID
        resolve(true)
      })
      .catch((e) => {
        reject()
      })
  })
}

const visitorsStatisticsOperation = (token?: string, form?: string) => {
  return new Promise(async (resolve, reject) => {
    NetWorkApi<API.TouristRequest, API.ActionSucceeded>({
      url: 'tourist',
      method: 'post',
      data: {
        macCode: MachineID,
        token: token,
        form: form,
      },
    })
      .then((data) => {})
      .catch((err) => {})
      .finally(() => {
        resolve(true)
      })
  })
}

/** 游客信息统计 */
export const visitorsStatisticsFun = async (token?: string, form?: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (MachineID.length === 0) {
        await getMachineIDOperation()
      }
      visitorsStatisticsOperation(token, form)
      resolve(true)
    } catch (error) {
      resolve(false)
    }
  })
}
