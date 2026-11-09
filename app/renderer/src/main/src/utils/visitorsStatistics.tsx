import { NetWorkApi } from '@/services/fetch'
import type { API } from '@/services/swagger/resposeType'
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
export const visitorsStatisticsFun = async (
  token?: string,
  form?: string,
  canSend?: () => boolean | Promise<boolean>,
) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (MachineID.length === 0) {
        await getMachineIDOperation()
      }
      // 企业心跳在机器码加载后复核资格；社区版未传守卫时保留原有发送语义。
      if (canSend && !(await canSend())) {
        resolve(false)
        return
      }
      const request = visitorsStatisticsOperation(token, form)
      if (canSend) await request
      resolve(true)
    } catch (error) {
      resolve(false)
    }
  })
}
