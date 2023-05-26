import {AutoComplete} from "antd"
import React, {useEffect, useImperativeHandle, useState} from "react"
import {CacheDataHistoryProps, YakitAutoCompleteProps} from "./YakitAutoCompleteType"
import styles from "./YakitAutoComplete.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"

/**
 * 更新说明
 * 1.增加缓存记忆功能
 */

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments AutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 * @param {string} cacheHistoryDataKey 用来缓存/获取历史数据的setRemoteValue/getRemoteValue,默认缓存 options 和 defaultValue
 * @param {number} cacheHistoryListLength 缓存的历史记录list长度
 */
export const YakitAutoComplete: React.FC<YakitAutoCompleteProps> = React.forwardRef((props, ref) => {
    const {size, className, cacheHistoryDataKey, cacheHistoryListLength = 10, ...restProps} = props
    const [show, setShow] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [cacheHistoryData, setCacheHistoryData] = useState<CacheDataHistoryProps>({
        options: [],
        defaultValue: ""
    })
    useEffect(() => {
        onGetRemoteValues(true)
    }, [])
    useImperativeHandle(
        ref,
        () => ({
            onSetRemoteValues: (value: string) => {
                const newValue = value || restProps.value
                onSetRemoteValues(newValue)
            },
            onGetRemoteValues: () => {
                return cacheHistoryData
            }
        }),
        [cacheHistoryData, restProps.value, loading]
    )
    /**@description 缓存 cacheHistoryDataKey 对应的数据 */
    const onSetRemoteValues = useMemoizedFn((newValue: string) => {
        if (!cacheHistoryDataKey) return
        const index = cacheHistoryData.options.findIndex((l) => l.value === newValue)
        let cacheHistory: CacheDataHistoryProps = {
            options: [],
            defaultValue: ""
        }
        if (index === -1) {
            const newHistoryList = newValue
                ? [{value: newValue, label: newValue}, ...cacheHistoryData.options].filter(
                      (_, index) => index < cacheHistoryListLength
                  )
                : cacheHistoryData.options
            cacheHistory = {
                options: newHistoryList,
                defaultValue: newValue
            }
        } else {
            cacheHistory = {
                options: cacheHistoryData.options,
                defaultValue: newValue
            }
        }
        setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheHistory))
            .then(() => {
                onGetRemoteValues()
            })
            .catch((e) => {
                yakitNotify("error", "YakitAutoComplete:保存数据出错" + e)
            })
    })
    /**@description 获取 cacheHistoryDataKey 对应的数据 */
    const onGetRemoteValues = useMemoizedFn((init?: boolean) => {
        if (!cacheHistoryDataKey) return
        if (init) setLoading(true)
        getRemoteValue(cacheHistoryDataKey)
            .then((data) => {
                try {
                    if (!data) return
                    const newData = JSON.parse(data)
                    let cacheData: CacheDataHistoryProps = {
                        options: [],
                        defaultValue: ""
                    }
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
                    setCacheHistoryData({...cacheData})
                } catch (error) {
                    yakitNotify("error", "YakitAutoComplete:转换数据出错" + error)
                }
            })
            .catch((e) => {
                yakitNotify("error", "YakitAutoComplete:获取数据出错" + e)
            })
            .finally(() => setLoading(false))
    })
    return (
        <div
            className={classNames(styles["yakit-auto-complete-wrapper"], {
                [styles["yakit-auto-complete-wrapper-large"]]: size === "large",
                [styles["yakit-auto-complete-wrapper-small"]]: size === "small",
                [styles["yakit-auto-complete-disabled"]]: !!props.disabled
            })}
        >
            {loading ? (
                <></>
            ) : (
                <AutoComplete
                    options={cacheHistoryData.options}
                    defaultValue={cacheHistoryData.defaultValue}
                    {...restProps}
                    size='middle'
                    dropdownClassName={classNames(
                        styles["yakit-auto-complete-popup"],
                        {
                            [styles["yakit-auto-complete-popup-y"]]: show
                        },
                        props.dropdownClassName
                    )}
                    onDropdownVisibleChange={(open) => {
                        setShow(open)
                        if (props.onDropdownVisibleChange) props.onDropdownVisibleChange(open)
                    }}
                />
            )}
        </div>
    )
})
