import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"

export interface YakitOptionTypeProps {
    value: string
    label: string
}

export interface CacheDataHistoryProps {
    options: YakitOptionTypeProps[]
    defaultValue: string
}

/**
 * 获取 cacheHistoryDataKey 对应的数据
 * @param {string} cacheHistoryDataKey
 * @returns {CacheDataHistoryProps} 对应的数据
 */
export const onGetRemoteValuesBase: (cacheHistoryDataKey: string) => Promise<CacheDataHistoryProps> = (
    cacheHistoryDataKey
) => {
    return new Promise((resolve, reject) => {
        getRemoteValue(cacheHistoryDataKey)
            .then((data) => {
                try {
                    let cacheData: CacheDataHistoryProps = {
                        options: [],
                        defaultValue: ""
                    }
                    if (!data) {
                        resolve(cacheData)
                        return
                    }
                    const newData = JSON.parse(data)

                    if (Object.prototype.toString.call(newData) === "[object Object]") {
                        cacheData = newData.options
                            ? newData
                            : {
                                  options: [],
                                  defaultValue: ""
                              }
                    } else {
                        // 兼容以前 key 保存的数据
                        cacheData.defaultValue = newData
                    }
                    resolve(cacheData)
                } catch (error) {
                    yakitNotify("error", `${cacheHistoryDataKey}缓存字段转换数据出错:` + error)
                    reject(error)
                }
            })
            .catch((error) => {
                yakitNotify("error", `${cacheHistoryDataKey}缓存字段转换数据出错:` + error)
                reject(error)
            })
    })
}
export interface SetRemoteValuesBaseProps {
    cacheHistoryDataKey: string
    newValue: string
    cacheHistoryListLength?: number
}
/**
 * 缓存 cacheHistoryDataKey 对应的数据
 * @param  {SetRemoteValuesBaseProps} params
 * @returns
 */
export const onSetRemoteValuesBase: (params: SetRemoteValuesBaseProps) => Promise<null> = (params) => {
    return new Promise((resolve, reject) => {
        const {cacheHistoryDataKey, newValue, cacheHistoryListLength = 10} = params
        onGetRemoteValuesBase(cacheHistoryDataKey).then((oldCacheHistoryData) => {
            const index = oldCacheHistoryData.options.findIndex((l) => l.value === newValue)
            let cacheHistory: CacheDataHistoryProps = {
                options: [],
                defaultValue: ""
            }
            if (index === -1) {
                const newHistoryList = newValue
                    ? [{value: newValue, label: newValue}, ...oldCacheHistoryData.options].filter(
                          (_, index) => index < cacheHistoryListLength
                      )
                    : oldCacheHistoryData.options
                cacheHistory = {
                    options: newHistoryList,
                    defaultValue: newValue
                }
            } else {
                cacheHistory = {
                    options: oldCacheHistoryData.options,
                    defaultValue: newValue
                }
            }
            setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheHistory))
                .then(() => {
                    resolve(null)
                })
                .catch((e) => {
                    yakitNotify("error", `${cacheHistoryDataKey}缓存字段保存数据出错:` + e)
                    reject(e)
                })
        })
    })
}
