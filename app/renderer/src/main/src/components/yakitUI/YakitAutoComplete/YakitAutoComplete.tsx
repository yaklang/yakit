import {AutoComplete} from "antd"
import React, {useEffect, useImperativeHandle, useState} from "react"
import {YakitAutoCompleteCacheDataHistoryProps, YakitAutoCompleteProps} from "./YakitAutoCompleteType"
import styles from "./YakitAutoComplete.module.scss"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"
import {onGetRemoteValuesBase, onSetRemoteValuesBase} from "../utils"

export const defYakitAutoCompleteRef = {
    onGetRemoteValues: () => {},
    onSetRemoteValues: (s: string) => {}
}

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments AutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 * @param {string} cacheHistoryDataKey 用来缓存/获取历史数据的setRemoteValue/getRemoteValue,默认缓存 options 和 defaultValue
 * @param {number} cacheHistoryListLength 缓存的历史记录list长度
 */
export const YakitAutoComplete: React.FC<YakitAutoCompleteProps> = React.forwardRef((props, ref) => {
    const {
        size,
        className,
        cacheHistoryDataKey,
        cacheHistoryListLength = 10,
        isCacheDefaultValue = true,
        ref: forwardRef,
        ...restProps
    } = props
    const [show, setShow] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [cacheHistoryData, setCacheHistoryData] = useState<YakitAutoCompleteCacheDataHistoryProps>({
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
        onSetRemoteValuesBase({cacheHistoryDataKey, newValue, isCacheDefaultValue}).then((value) => {
            setCacheHistoryData({
                defaultValue: value.defaultValue || "",
                options: value.options
            })
        })
    })
    /**@description 获取 cacheHistoryDataKey 对应的数据 */
    const onGetRemoteValues = useMemoizedFn((init?: boolean) => {
        if (!cacheHistoryDataKey) return
        if (init) setLoading(true)
        onGetRemoteValuesBase(cacheHistoryDataKey)
            .then((cacheData) => {
                const value = cacheData.defaultValue ? cacheData.defaultValue : ""
                let newOption = cacheData.options || props.options || []
                //非form表单时,设置value
                if (isCacheDefaultValue) {
                    if (props.onChange) props.onChange(value, newOption)
                }
                setCacheHistoryData({defaultValue: value, options: newOption})
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
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
