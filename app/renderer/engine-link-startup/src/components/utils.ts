import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"

export interface YakitOptionTypeProps {
    value: string
    label: string | React.ReactElement
}

export interface CacheDataHistoryProps {
    options: YakitOptionTypeProps[]
    defaultValue: string
    firstUse?: boolean
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
                        resolve({...cacheData, firstUse: true})
                        return
                    }
                    const newData = JSON.parse(data)

                    if (Object.prototype.toString.call(newData) === "[object Object]") {
                        cacheData = newData.options
                            ? {
                                  options: newData.options.map((i) => {
                                      if (typeof i === "string") {
                                          return {value: i, label: i}
                                      } else {
                                          return i
                                      }
                                  }),
                                  defaultValue: Array.isArray(newData.defaultValue)
                                      ? newData.defaultValue.join(",")
                                      : newData.defaultValue
                              }
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
    /**是否缓存默认值 */
    isCacheDefaultValue?: boolean
    /**删除缓存选项 */
    delCacheValue?: string
}
/**
 * 缓存 cacheHistoryDataKey 对应的数据
 * @param  {SetRemoteValuesBaseProps} params
 * @returns
 */
export const onSetRemoteValuesBase: (params: SetRemoteValuesBaseProps) => Promise<CacheDataHistoryProps> = (params) => {
    return new Promise((resolve, reject) => {
        const {
            cacheHistoryDataKey,
            newValue,
            cacheHistoryListLength = 10,
            isCacheDefaultValue = true,
            delCacheValue
        } = params
        onGetRemoteValuesBase(cacheHistoryDataKey).then((oldCacheHistoryData) => {
            let cacheHistory: CacheDataHistoryProps = {
                options: [],
                defaultValue: ""
            }
            let cacheData = {
                options: cacheHistory.options,
                defaultValue: isCacheDefaultValue ? cacheHistory.defaultValue : ""
            }

            oldCacheHistoryData.options.forEach((i, index, arr) => {
                if (typeof i === "string") {
                    arr[index] = {value: i, label: i}
                }
            })

            if (delCacheValue === undefined) {
                const index = oldCacheHistoryData.options.findIndex((l) => l.value === newValue)
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
                cacheData = {
                    options: cacheHistory.options,
                    defaultValue: isCacheDefaultValue ? cacheHistory.defaultValue : ""
                }
            } else {
                // 删除缓存
                const newHistoryList = oldCacheHistoryData.options.filter((item) => item.value !== delCacheValue)
                cacheData = {
                    options: newHistoryList,
                    defaultValue: isCacheDefaultValue ? oldCacheHistoryData.defaultValue : ""
                }
                cacheHistory = {
                    options: newHistoryList,
                    defaultValue: oldCacheHistoryData.defaultValue
                }
            }
            setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheData))
                .then(() => {
                    resolve(cacheHistory)
                })
                .catch((e) => {
                    yakitNotify("error", `${cacheHistoryDataKey}缓存字段保存数据出错:` + e)
                    reject(e)
                })
        })
    })
}
