import {Select} from "antd"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    YakitBaseSelectRef,
    YakitDefaultOptionType,
    YakitSelectCacheDataHistoryProps,
    YakitSelectProps
} from "./YakitSelectType"
import styles from "./YakitSelect.module.scss"
import classNames from "classnames"
import {BaseOptionType} from "antd/lib/select"
import {YakitTag} from "../YakitTag/YakitTag"
import {ChevronDownIcon, ChevronUpIcon} from "@/assets/newIcon"
import {useInViewport, useMemoizedFn} from "ahooks"
import {CacheDataHistoryProps, YakitOptionTypeProps, onGetRemoteValuesBase, onSetRemoteValuesBase} from "../utils"
import {setRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"
import {OutlineCheckIcon, OutlineXIcon} from "@/assets/icon/outline"
const {Option, OptGroup} = Select

/**
 * @description: 下拉选择
 * @augments SwitchProps 继承antd的 SelectProps 默认属性
 * @param {string} wrapperClassName Switch装饰div的className
 * @param {CSSProperties} wrapperStyle Switch装饰div的style
 */
export const YakitSelectCustom = <ValueType, OptionType>(
    {
        className,
        size = "middle",
        wrapperClassName = "",
        wrapperStyle,
        cacheHistoryDataKey = "",
        isCacheDefaultValue = true,
        cacheHistoryListLength = 10,
        defaultOptions,
        ...props
    }: YakitSelectProps<OptionType>,
    ref: React.Ref<YakitBaseSelectRef>
) => {
    const selectRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(selectRef)
    // 鼠标移入项 用于判断是否显示 ×
    const [mouseEnterItem, setMouseEnterItem] = useState<string>("")
    const [show, setShow] = useState<boolean>(false)
    const [cacheHistoryData, setCacheHistoryData] = useState<YakitSelectCacheDataHistoryProps>({
        options: [],
        defaultValue: []
    })
    useEffect(() => {
        if (cacheHistoryDataKey && inViewport) onGetRemoteValues()
    }, [cacheHistoryDataKey, inViewport])
    useImperativeHandle(
        ref,
        () => ({
            onSetRemoteValues: (value: string[]) => {
                const newValue = value.length > 0 ? value : props.value
                onSetRemoteValues(newValue)
            },
            onGetRemoteValues: () => {
                return cacheHistoryData
            }
        }),
        [cacheHistoryData, props.value]
    )
    /**@description 缓存 cacheHistoryDataKey 对应的数据 */
    const onSetRemoteValues = useMemoizedFn((newValue: string[]) => {
        if (!cacheHistoryDataKey) return
        if (props.mode === "tags") {
            // tag模式 一般情况下 label和value是一样的
            const cacheHistoryDataValues: string[] = cacheHistoryData.options.map((ele) => ele.value)
            const addValue = newValue.filter((ele) => !cacheHistoryDataValues.includes(ele))
            const newOption = [
                ...addValue.map((item) => ({value: item, label: item})),
                ...cacheHistoryData.options
            ].filter((_, index) => index < cacheHistoryListLength)
            const cacheHistory: CacheDataHistoryProps = {
                defaultValue: newValue.join(","),
                options: newOption
            }
            const cacheData = {
                options: cacheHistory.options,
                defaultValue: isCacheDefaultValue ? cacheHistory.defaultValue : ""
            }
            setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheData))
                .then(() => {
                    // onGetRemoteValues()
                    setCacheHistoryData({
                        defaultValue: newValue,
                        options: newOption
                    })
                })
                .catch((e) => {
                    yakitNotify("error", `${cacheHistoryDataKey}缓存字段保存数据出错:` + e)
                })
        } else if (props.mode === "multiple") {
            // 多选;该情况下label和value 大多数时候不一样;暂不支持缓存
        } else {
            //  单选
            onSetRemoteValuesBase({cacheHistoryDataKey, newValue: newValue.join(","), isCacheDefaultValue}).then(
                (value: CacheDataHistoryProps) => {
                    // onGetRemoteValues()
                    setCacheHistoryData({
                        defaultValue: value.defaultValue ? value.defaultValue.split(",") : [],
                        options: value.options
                    })
                }
            )
        }
    })
    /**@description 获取 cacheHistoryDataKey 对应的数据 */
    const onGetRemoteValues = useMemoizedFn(() => {
        if (!cacheHistoryDataKey) return
        onGetRemoteValuesBase(cacheHistoryDataKey).then((cacheData) => {
            const value = cacheData.defaultValue ? cacheData.defaultValue.split(",") : []
            let newOption: YakitDefaultOptionType[] = getNewOption(cacheData.options, !!cacheData.firstUse)
            //非form表单时,设置value
            if (isCacheDefaultValue) {
                if (props.onChange) props.onChange(value, newOption)
            }
            setCacheHistoryData({defaultValue: value, options: newOption as unknown as YakitOptionTypeProps})
        })
    })
    const getNewOption = useMemoizedFn((options, firstUse: boolean) => {
        let newOption: YakitDefaultOptionType[] = []
        if (options.length > 0) {
            newOption = options as YakitDefaultOptionType[]
        } else if (defaultOptions?.length > 0 && firstUse) {
            newOption = (defaultOptions || []) as YakitDefaultOptionType[]
        } else if ((props?.options?.length || 0) > 0) {
            newOption = props.options as YakitDefaultOptionType[]
        }
        return newOption || []
    })
    /**@description 删除缓存项 */
    const delCatchOptionItem = (e: React.MouseEvent<Element, MouseEvent>, item: YakitDefaultOptionType) => {
        e.stopPropagation()
        if (cacheHistoryDataKey) {
            if (props.mode === "tags") {
                const newHistoryList = cacheHistoryData.options.filter((i) => i.value !== item.value)
                const cacheData = {
                    options: newHistoryList,
                    defaultValue: isCacheDefaultValue ? cacheHistoryData.defaultValue.join(",") : ""
                }
                const cacheHistory = {
                    options: newHistoryList,
                    defaultValue: cacheHistoryData.defaultValue
                }
                setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheData))
                    .then(() => {
                        setCacheHistoryData({
                            options: cacheHistory.options,
                            defaultValue: cacheHistory.defaultValue
                        })
                    })
                    .catch((e) => {
                        yakitNotify("error", `${cacheHistoryDataKey}缓存字段保存数据出错:` + e)
                    })
            } else if (props.mode === "multiple") {
                // 暂不支持删除缓存项
            } else {
                // 暂不支持删除缓存项
            }
        }
    }

    const renderItem = (item: YakitDefaultOptionType) => {
        const copyItem = {...item}
        // 主要是tag部分直接渲染props.label的话会将下面强制塞进去的icon一起渲染
        copyItem.tabLable = item.label

        let showClose = false
        const newValue = props.value ?? ""
        // input框里面选中了这个值，应该是由于antd本身的限制，就算过滤掉了该项的options选项，但是下拉列表还是存在该项
        if (mouseEnterItem === item.value && !newValue.includes(item.value)) {
            showClose = true
        }

        let showSelectedIcon = false
        if (["tags", "multiple"].includes(props.mode || "") && !showClose && newValue.includes(item.value)) {
            showSelectedIcon = true
        }

        copyItem.label = (
            <div
                className={styles["yakit-option-item"]}
                onMouseEnter={(e) => {
                    setMouseEnterItem(item.value + "")
                }}
                onMouseLeave={() => {
                    setMouseEnterItem("")
                }}
            >
                <div
                    className={styles["yakit-option-item-label"]}
                >
                    {copyItem.label}
                </div>
                <OutlineXIcon
                    style={{
                        display: showClose ? "block" : "none"
                    }}
                    className={styles["option-item-close"]}
                    onClick={(e) => delCatchOptionItem(e, item)}
                />
                <OutlineCheckIcon
                    style={{
                        display: showSelectedIcon ? "block" : "none"
                    }}
                    className={styles["option-item-checked"]}
                />
            </div>
        )
        return copyItem
    }

    // 是否支持删除缓存 目前只有tags支持
    const supportDelCache = useMemo(() => {
        if (cacheHistoryDataKey) {
            if (props.mode === "tags") {
                return true
            } else if (props.mode === "multiple") {
                // 多选 暂不支持删除缓存项
                return false
            } else {
                // 单选 暂不支持删除缓存项
                return false
            }
        } else {
            return false
        }
    }, [cacheHistoryDataKey, props.mode])

    let extraProps: {defaultValue?: string[]; options?: YakitDefaultOptionType[]} = {}
    if (!props.children) {
        const renderNewOptions = [...cacheHistoryData.options]
        // 此处是由于属性menuItemSelectedIcon被设置为<></>, 勾是在label中处理的，当手动输入选项值后，点击选项，处理没有勾显示的问题
        if (supportDelCache && Array.isArray(props.value)) {
            props.value.forEach((value) => {
                const exists = renderNewOptions.some((item) => item.value === value)
                if (!exists) {
                    renderNewOptions.push({label: value, value: value})
                }
            })
        }
        extraProps = {
            ...extraProps,
            options: supportDelCache
                ? renderNewOptions.map((item) => renderItem(item))
                : getNewOption(cacheHistoryData.options, true),
            defaultValue: cacheHistoryData.defaultValue
        }
    }
    return (
        <div
            ref={selectRef}
            className={classNames(
                "ant-select",
                "ant-select-in-form-item",
                styles["yakit-select"],
                {
                    [styles["yakit-select-wrapper-tags"]]: props.mode === "tags" || props.mode === "multiple",
                    [styles["yakit-select-large"]]: size === "large",
                    [styles["yakit-select-middle"]]: size === "middle",
                    [styles["yakit-select-small"]]: size === "small"
                },
                wrapperClassName
            )}
            style={wrapperStyle}
        >
            <Select
                suffixIcon={
                    show ? (
                        <ChevronUpIcon className={styles["yakit-select-icon"]} />
                    ) : (
                        <ChevronDownIcon className={styles["yakit-select-icon"]} />
                    )
                }
                tagRender={(props) => {
                    const tabEle =
                        extraProps.options?.find((item) => item.value === props.value)?.tabLable || props.label
                    return (
                        <YakitTag size={size} {...props}>
                            <span className='content-ellipsis' style={{width: "100%"}}>
                                {tabEle}
                            </span>
                        </YakitTag>
                    )
                }}
                {...props}
                {...extraProps}
                menuItemSelectedIcon={supportDelCache ? <></> : props.menuItemSelectedIcon}
                size='middle'
                dropdownClassName={classNames(
                    styles["yakit-select-popup"],
                    {
                        [styles["yakit-select-wrapper-tags"]]: props.mode === "tags" || props.mode === "multiple",
                        [styles["yakit-select-popup-y"]]: show
                    },
                    props.dropdownClassName
                )}
                onDropdownVisibleChange={(open) => {
                    setShow(open)
                    if (props.onDropdownVisibleChange) props.onDropdownVisibleChange(open)
                }}
            >
                {props.children}
            </Select>
        </div>
    )
}

export const YakitSelect = React.forwardRef(YakitSelectCustom) as unknown as (<
    ValueType = any,
    OptionType extends BaseOptionType | YakitDefaultOptionType = YakitDefaultOptionType
>(
    props: React.PropsWithChildren<YakitSelectProps<ValueType, OptionType>> & {
        ref?: React.Ref<YakitBaseSelectRef>
    }
) => React.ReactElement) & {
    SECRET_COMBOBOX_MODE_DO_NOT_USE: string
    Option: typeof Option
    OptGroup: typeof OptGroup
}

YakitSelect.Option = Option
YakitSelect.OptGroup = OptGroup
