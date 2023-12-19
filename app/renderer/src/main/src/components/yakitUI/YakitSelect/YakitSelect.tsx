import {Select} from "antd"
import React, {useEffect, useImperativeHandle, useMemo, useState} from "react"
import {YakitBaseSelectRef, YakitSelectCacheDataHistoryProps, YakitSelectProps} from "./YakitSelectType"
import styles from "./YakitSelect.module.scss"
import classNames from "classnames"
import {BaseOptionType, DefaultOptionType, SelectProps} from "antd/lib/select"
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
        wrapperClassName,
        wrapperStyle,
        dropdownRender,
        cacheHistoryDataKey = "",
        cacheHistoryListLength = 10,
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
            setRemoteValue(cacheHistoryDataKey, JSON.stringify(cacheHistory))
                .then(() => {
                    onGetRemoteValues()
                })
                .catch((e) => {
                    yakitNotify("error", `${cacheHistoryDataKey}缓存字段保存数据出错:` + e)
                })
        } else if (props.mode === "multiple") {
            // 多选;该情况下label和value 大多数时候不一样;暂不支持缓存
        } else {
            //  单选
            onSetRemoteValuesBase({cacheHistoryDataKey, newValue: newValue.join(",")}).then(() => {
                onGetRemoteValues()
            })
        }
    })
    /**@description 获取 cacheHistoryDataKey 对应的数据 */
    const onGetRemoteValues = useMemoizedFn(() => {
        if (!cacheHistoryDataKey) return
        onGetRemoteValuesBase(cacheHistoryDataKey).then((cacheData) => {
            const value = cacheData.defaultValue ? cacheData.defaultValue.split(",") : []
            let newOption: DefaultOptionType[] = []
            if (cacheData.options.length > 0) {
                newOption = cacheData.options as DefaultOptionType[]
            } else if (props?.defaultOptions?.length > 0) {
                newOption = (props.defaultOptions || []) as DefaultOptionType[]
            } else if ((props?.options?.length || 0) > 0) {
                newOption = props.options as DefaultOptionType[]
            }
            if (props.onChange) props.onChange(value, newOption)
            setCacheHistoryData({defaultValue: value, options: newOption as unknown as YakitOptionTypeProps})
        })
    })
    let extraProps = {}
    if (!props.children) {
        extraProps = {
            ...extraProps,
            options: cacheHistoryData.options,
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
