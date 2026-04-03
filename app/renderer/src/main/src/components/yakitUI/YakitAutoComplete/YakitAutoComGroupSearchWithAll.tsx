import {AutoComplete} from "antd"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    YakitAutoCompleteCacheDataHistoryProps,
    YakitAutoCompleteProps,
    YakitAutoCompleteRefProps
} from "./YakitAutoCompleteType"
import styles from "./YakitAutoComplete.module.scss"
import classNames from "classnames"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {YakitOptionTypeProps, onGetRemoteValuesBase, onSetRemoteValuesBase} from "../utils"
import {OutlineXIcon} from "@/assets/icon/outline"

export const defYakitAutoCompleteRef = {
    onGetRemoteValues: () => ({options: [], defaultValue: ""}),
    onSetRemoteValues: (s: string) => {}
}

const GROUP_EMPTY_VALUE = "__yakit_ac_group_empty__"

const YakitAutoCompleteOptionLabel = React.memo<{
    item: YakitOptionTypeProps
    deletable: boolean
    selectedValue: YakitAutoCompleteProps["value"]
    onDelete: (e: React.MouseEvent<Element, MouseEvent>, item: YakitOptionTypeProps) => void
}>(({item, deletable, selectedValue, onDelete}) => {
    const [hovered, setHovered] = useState(false)
    const showClose = deletable && hovered && item.value !== selectedValue
    return (
        <div
            className={styles["yakit-option-item"]}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={styles["yakit-option-item-label"]}>{item.label}</div>
            {deletable ? (
                <OutlineXIcon
                    style={{display: showClose ? "block" : "none"}}
                    className={styles["option-item-close"]}
                    onClick={(e) => onDelete(e, item)}
                />
            ) : null}
        </div>
    )
})

function optionMatchesInput(
    input: string,
    opt: YakitOptionTypeProps,
    filterOption: YakitAutoCompleteProps["filterOption"]
): boolean {
    const t = input.trim()
    if (!t) return false
    if (filterOption === false) return false
    if (typeof filterOption === "function") {
        return filterOption(input, opt as any)
    }
    if (opt.value && typeof opt.value === "string") {
        if (opt.value.toUpperCase().indexOf(t.toUpperCase()) !== -1) return true
    }
    if (opt.label && typeof opt.label === "string") {
        if (opt.label.toUpperCase().indexOf(t.toUpperCase()) !== -1) return true
    }
    return false
}

/**
 * @description YakitAutoCompleteProps 的属性
 * @augments YakitAutoCompleteProps 继承antd的 AutoCompleteProps 默认属性
 * @param {"small" | "middle" | "large" } size  默认middle
 * @param {string} cacheHistoryDataKey 用来缓存/获取历史数据的setRemoteValue/getRemoteValue,默认缓存 options 和 defaultValue
 * @param {number} cacheHistoryListLength 缓存的历史记录list长度
 */
export const YakitAutoComGroupSearchWithAll = React.forwardRef<YakitAutoCompleteRefProps, YakitAutoCompleteProps>(
    (props, ref) => {
        const {
            size,
            className,
            cacheHistoryDataKey,
            cacheHistoryListLength = 10,
            isCacheDefaultValue = true,
            initValue = "",
            wrapperStyle,
            isInit = true,
            groupSearchWithAll = false,
            searchResultGroupLabel = "搜索结果",
            searchResultEmptyLabel = "无",
            allOptionsGroupLabel = "全部",
            filterOption: filterOptionProp,
            onSearch: onSearchFromProp,
            ...restProps
        } = props
        const autoCompleteRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(autoCompleteRef)
        const [show, setShow] = useState<boolean>(false)
        const [loading, setLoading] = useState<boolean>(false)
        const [dropdownSearchText, setDropdownSearchText] = useState<string>("")
        const [cacheHistoryData, setCacheHistoryData] = useState<YakitAutoCompleteCacheDataHistoryProps>({
            options: [],
            defaultValue: ""
        })
        useEffect(() => {
            inViewport && onGetRemoteValues(isInit)
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initValue, inViewport, isInit])

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
            onSetRemoteValuesBase({
                cacheHistoryDataKey,
                newValue,
                isCacheDefaultValue,
                cacheHistoryListLength
            }).then((value) => {
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

        const delCatchOptionItem = useMemoizedFn(
            (e: React.MouseEvent<Element, MouseEvent>, item: YakitOptionTypeProps) => {
                e.stopPropagation()
                if (!cacheHistoryDataKey) return
                onSetRemoteValuesBase({
                    cacheHistoryDataKey,
                    newValue: "",
                    isCacheDefaultValue,
                    cacheHistoryListLength,
                    delCacheValue: item.value
                }).then((value) => {
                    setCacheHistoryData({
                        defaultValue: value.defaultValue,
                        options: value.options
                    })
                })
            }
        )

        const historyRowDeletable = useCreation(() => {
            return Boolean(cacheHistoryDataKey && cacheHistoryData.options.length > 0)
        }, [cacheHistoryDataKey, cacheHistoryData])

        const renderItem = useMemoizedFn((item: YakitOptionTypeProps, deletable: boolean) => {
            const copyItem = {...item}
            copyItem.label = (
                <YakitAutoCompleteOptionLabel
                    item={item}
                    deletable={deletable}
                    selectedValue={props.value}
                    onDelete={delCatchOptionItem}
                />
            )
            return copyItem
        })

        const sourceFlatOptions: YakitOptionTypeProps[] = useMemo(() => {
            if (cacheHistoryData.options.length) {
                return cacheHistoryData.options
            }
            const raw = restProps.options
            if (!raw || !Array.isArray(raw)) return []
            return raw as YakitOptionTypeProps[]
        }, [cacheHistoryData.options, restProps.options])

        const options = useMemo(() => {
            if (!groupSearchWithAll) {
                if (cacheHistoryData.options.length) {
                    return cacheHistoryData.options.map((item) => renderItem(item, historyRowDeletable))
                }
                return restProps.options
            }

            const matched = sourceFlatOptions.filter((opt) =>
                optionMatchesInput(dropdownSearchText, opt, filterOptionProp)
            )

            const searchRowOptions =
                matched.length > 0
                    ? matched.map((item, index) =>
                          renderItem(
                              {
                                  ...item,
                                  key: `yakit-ac-search-${index}-${item.value}`
                              } as YakitOptionTypeProps,
                              historyRowDeletable
                          )
                      )
                    : [
                          {
                              value: GROUP_EMPTY_VALUE,
                              key: "yakit-ac-search-empty",
                              label: (
                                  <span className={styles["group-empty-placeholder"]}>{searchResultEmptyLabel}</span>
                              ),
                              disabled: true
                          }
                      ]

            const allRowOptions = sourceFlatOptions.map((item, index) =>
                renderItem(
                    {
                        ...item,
                        key: `yakit-ac-all-${index}-${item.value}`
                    } as YakitOptionTypeProps,
                    historyRowDeletable
                )
            )

            return [
                {
                    label: <span className={styles["group-section-title"]}>{searchResultGroupLabel}</span>,
                    options: searchRowOptions
                },
                {
                    label: <span className={styles["group-section-title"]}>{allOptionsGroupLabel}</span>,
                    options: allRowOptions
                }
            ]
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            groupSearchWithAll,
            cacheHistoryData.options,
            cacheHistoryDataKey,
            restProps.options,
            sourceFlatOptions,
            dropdownSearchText,
            filterOptionProp,
            searchResultGroupLabel,
            searchResultEmptyLabel,
            allOptionsGroupLabel,
            props.value,
            historyRowDeletable
        ])

        const mergedOnSearch = useMemoizedFn((val: string) => {
            if (groupSearchWithAll) {
                setDropdownSearchText(val)
            }
            onSearchFromProp?.(val)
        })

        const mergedOnDropdownVisibleChange = useMemoizedFn((open: boolean) => {
            setShow(open)
            if (groupSearchWithAll && open) {
                const v = restProps.value
                setDropdownSearchText(
                    v !== undefined && v !== null ? String(v) : String(cacheHistoryData.defaultValue || "")
                )
            }
            props.onDropdownVisibleChange?.(open)
        })

        return (
            <div
                ref={autoCompleteRef}
                className={classNames(styles["yakit-auto-complete-wrapper"], {
                    [styles["yakit-auto-complete-wrapper-large"]]: size === "large",
                    [styles["yakit-auto-complete-wrapper-small"]]: size === "small",
                    [styles["yakit-auto-complete-disabled"]]: !!props.disabled
                })}
                style={{...(wrapperStyle || {})}}
            >
                {loading ? (
                    <></>
                ) : (
                    <AutoComplete
                        defaultValue={cacheHistoryData.defaultValue}
                        {...restProps}
                        filterOption={groupSearchWithAll ? () => true : filterOptionProp}
                        onSearch={mergedOnSearch}
                        options={options}
                        size='middle'
                        dropdownClassName={classNames(
                            styles["yakit-auto-complete-popup"],
                            {
                                [styles["yakit-auto-complete-popup-y"]]: show
                            },
                            props.dropdownClassName
                        )}
                        onDropdownVisibleChange={mergedOnDropdownVisibleChange}
                    />
                )}
            </div>
        )
    }
)

YakitAutoComGroupSearchWithAll.displayName = "YakitAutoComGroupSearchWithAll"
