import {RequestYakURLResponse} from "../yakURLTree/data"
const {ipcRenderer} = window.require("electron")

/**
 * @name 漏洞树获取
 */
export const grpcFetchHoleTree: (path: string, search: string) => Promise<RequestYakURLResponse> = (path, search) => {
    return new Promise(async (resolve, reject) => {
        // ssadb path为/时 展示最近编译
        const params = {
            Method: "GET",
            Url: {
                Schema: "ssarisk",
                Path: path,
                Query: [
                    {
                        Key: "search",
                        Value: search
                    }
                ]
            }
        }
        try {
            const res: RequestYakURLResponse = await ipcRenderer.invoke("RequestYakURL", params)
            // console.log("RequestYakURLResponse---", params, res)
            resolve(res)
        } catch (error) {
            reject(error)
        }
    })
}
