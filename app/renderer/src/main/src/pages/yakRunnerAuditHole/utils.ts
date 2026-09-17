import { requestYakURL } from '@/pages/yakURLTree/grpc'
import type { RequestYakURLResponse } from '../yakURLTree/data'
/**
 * @name 漏洞树获取
 */
export const grpcFetchHoleTree: (path: string, search: string) => Promise<RequestYakURLResponse> = (path, search) => {
  return new Promise(async (resolve, reject) => {
    // ssadb path为/时 展示最近编译
    const params = {
      Method: 'GET',
      Url: {
        Schema: 'ssarisk',
        Path: path,
        Query: [
          {
            Key: 'search',
            Value: search,
          },
          {
            Key: 'type',
            Value: 'risk',
          },
        ],
      },
    }
    try {
      const res: RequestYakURLResponse = await requestYakURL(params)
      // console.log("RequestYakURLResponse---", params, res)
      resolve(res)
    } catch (error) {
      reject(error)
    }
  })
}
