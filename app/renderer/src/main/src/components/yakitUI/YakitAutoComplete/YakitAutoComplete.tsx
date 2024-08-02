import {AutoComplete} from "antd"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {YakitAutoCompleteCacheDataHistoryProps, YakitAutoCompleteProps} from "./YakitAutoCompleteType"
import styles from "./YakitAutoComplete.module.scss"
import classNames from "classnames"
import {useInViewport, useMemoizedFn} from "ahooks"
import {YakitOptionTypeProps, onGetRemoteValuesBase, onSetRemoteValuesBase} from "../utils"
import {OutlineXIcon} from "@/assets/icon/outline"

export const defYakitAutoCompleteRef = {
    onGetRemoteValues: () => ({options: [], defaultValue: ""}),
    onSetRemoteValues: (s: string) => {}
}

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments YakitAutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
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
        // ref: autoRef = null,
        initValue = "",
        wrapperStyle,
        ...restProps
    } = props
    const autoCompleteRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(autoCompleteRef)
    const [mouseEnterItem, setMouseEnterItem] = useState<string>("")
    const [show, setShow] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [cacheHistoryData, setCacheHistoryData] = useState<YakitAutoCompleteCacheDataHistoryProps>({
        options: [],
        defaultValue: ""
    })
    useEffect(() => {
        inViewport && onGetRemoteValues(true)
    }, [initValue, inViewport])
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
                let value = cacheData.defaultValue ? cacheData.defaultValue : ""
                let newOption = cacheData.options || props.options || []
                // 当缓存不存在的时候，若有初始默认值
                if (cacheData.firstUse && initValue) {
                    value = initValue
                    newOption = [{value: initValue, label: initValue}]
                    // 主要是删缓存需要
                    onSetRemoteValues(initValue)
                } else {
                    setCacheHistoryData({defaultValue: value, options: newOption})
                }
                //非form表单时,设置value
                // 在表单使用时，如果该值为true，这设置值的优先级高于组件外部直接使用form.setfeildvalue设置(场景：初始化)
                if (isCacheDefaultValue) {
                    if (props.onChange) props.onChange(value, newOption)
                }
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })

    const delCatchOptionItem = (e: React.MouseEvent<Element, MouseEvent>, item: YakitOptionTypeProps) => {
        e.stopPropagation()
        if (cacheHistoryDataKey) {
            onSetRemoteValuesBase({
                cacheHistoryDataKey,
                newValue: "",
                isCacheDefaultValue,
                delCacheValue: item.value
            }).then((value) => {
                setCacheHistoryData({
                    defaultValue: value.defaultValue,
                    options: value.options
                })
            })
        }
    }

    const renderItem = (item: YakitOptionTypeProps) => {
        const copyItem = {...item}
        copyItem.label = (
            <div
                className={styles["yakit-option-item"]}
                onMouseEnter={(e) => {
                    setMouseEnterItem(item.value)
                }}
                onMouseLeave={() => {
                    setMouseEnterItem("")
                }}
            >
                {copyItem.label}
                <OutlineXIcon
                    style={{display: mouseEnterItem === item.value && item.value !== props.value ? "block" : "none"}}
                    className={styles["option-item-close"]}
                    onClick={(e) => delCatchOptionItem(e, item)}
                />
            </div>
        )
        return copyItem
    }

    const options = useMemo(() => {
        if (cacheHistoryData.options.length) {
            return cacheHistoryData.options.map((item) => renderItem(item))
        } else {
            return restProps.options
        }
    }, [cacheHistoryData, restProps])

    return (
        <div
            ref={autoCompleteRef}
            className={classNames(styles["yakit-auto-complete-wrapper"], {
                [styles["yakit-auto-complete-wrapper-large"]]: size === "large",
                [styles["yakit-auto-complete-wrapper-small"]]: size === "small",
                [styles["yakit-auto-complete-disabled"]]: !!props.disabled
            })}
            style={{...wrapperStyle||{}}}
        >
            {loading ? (
                <></>
            ) : (
                <AutoComplete
                    defaultValue={cacheHistoryData.defaultValue}
                    {...restProps}
                    options={options}
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
