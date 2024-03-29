import {Select} from "antd"
import React, {useEffect, useImperativeHandle, useState} from "react"
import {YakitBaseSelectRef, YakitSelectCacheDataHistoryProps, YakitSelectProps} from "./YakitSelectType"
import styles from "./YakitSelect.module.scss"
import classNames from "classnames"
import {BaseOptionType, DefaultOptionType} from "antd/lib/select"
import {OptGroup} from "rc-select"
import {YakitTag} from "../YakitTag/YakitTag"
import {ChevronDownIcon, ChevronUpIcon} from "@/assets/newIcon"
import {useMemoizedFn} from "ahooks"
import {CacheDataHistoryProps, YakitOptionTypeProps, onGetRemoteValuesBase, onSetRemoteValuesBase} from "../utils"
import {setRemoteValue} from "@/utils/kv"
import {yakitNotify} from "@/utils/notification"

const {Option} = Select

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
        dropdownRender,
        cacheHistoryDataKey = "",
        isCacheDefaultValue = true,
        cacheHistoryListLength = 10,
        defaultOptions,
        ...props
    }: YakitSelectProps<OptionType>,
    ref: React.Ref<YakitBaseSelectRef>
) => {
    const [show, setShow] = useState<boolean>(false)
    const [cacheHistoryData, setCacheHistoryData] = useState<YakitSelectCacheDataHistoryProps>({
        options: [],
        defaultValue: []
    })
    useEffect(() => {
        if (cacheHistoryDataKey) onGetRemoteValues()
    }, [cacheHistoryDataKey])
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
            let newOption: DefaultOptionType[] = getNewOption(cacheData.options)
            //非form表单时,设置value
            if (isCacheDefaultValue) {
                if (props.onChange) props.onChange(value, newOption)
            }
            setCacheHistoryData({defaultValue: value, options: newOption as unknown as YakitOptionTypeProps})
        })
    })
    const getNewOption = useMemoizedFn((options) => {
        let newOption: DefaultOptionType[] = []
        if (options.length > 0) {
            newOption = options as DefaultOptionType[]
        } else if (defaultOptions?.length > 0) {
            newOption = (defaultOptions || []) as DefaultOptionType[]
        } else if ((props?.options?.length || 0) > 0) {
            newOption = props.options as DefaultOptionType[]
        }
        return newOption || []
    })
    let extraProps = {}
    if (!props.children) {
        extraProps = {
            ...extraProps,
            options: getNewOption(cacheHistoryData.options),
            defaultValue: cacheHistoryData.defaultValue
        }
    }
    return (
        <div
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
                    return (
                        <YakitTag size={size} {...props}>
                            <span className='content-ellipsis' style={{width: "100%"}}>
                                {props.label}
                            </span>
                        </YakitTag>
                    )
                }}
                {...props}
                {...extraProps}
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
    OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType
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
