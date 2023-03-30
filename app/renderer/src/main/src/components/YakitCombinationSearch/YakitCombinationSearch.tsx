import { Input, InputRef } from "antd"
import React, { useState } from "react"
import styles from "./YakitCombinationSearch.module.scss"
import classNames from "classnames"
import { useMemoizedFn } from "ahooks"
import { SearchIcon } from "@/assets/newIcon"
import { YakitCombinationSearchProps } from "./YakitCombinationSearchType"
import { YakitSelect } from "../yakitUI/YakitSelect/YakitSelect"
import { YakitInput } from "../yakitUI/YakitInput/YakitInput"

/**
 *
 * @description select 组合搜索
 */
export const YakitCombinationSearch: React.FC<YakitCombinationSearchProps> = (props) => {
    const {
        afterModuleType = "input",
        valueBeforeOption,
        onSelectBeforeOption,
        addonBeforeOption = [],
        beforeOptionWidth = 73,
        wrapperClassName,
        selectProps = {},
        inputSearchModuleTypeProps = {},
        selectModuleTypeProps = {}
    } = props
    const [focus, setFocus] = useState<boolean>(false)
    // ========================== input ==========================
    const onFocus = useMemoizedFn((e) => {
        setFocus(true)
        if (inputSearchModuleTypeProps.onFocus) inputSearchModuleTypeProps.onFocus(e)
    })
    const onBlur = useMemoizedFn((e) => {
        setFocus(false)
        if (inputSearchModuleTypeProps.onBlur) inputSearchModuleTypeProps.onBlur(e)
    })
    // ========================== select ==========================
    const onFocusSelect = useMemoizedFn((e) => {
        setFocus(true)
        if (selectModuleTypeProps.onFocus) selectModuleTypeProps.onFocus(e)
    })
    const onBlurSelect = useMemoizedFn((e) => {
        setFocus(false)
        if (selectModuleTypeProps.onBlur) selectModuleTypeProps.onBlur(e)
    })
    // ========================== render right ==========================
    const onRenderRightContent = useMemoizedFn(() => {
        switch (afterModuleType) {
            case "input":
                return onRenderInput()
            case "select":
                return onRenderSelect()
            default:
                return <></>
        }
    })
    const onRenderInput = useMemoizedFn(() => {
        return (
            <YakitInput.Search
                {...inputSearchModuleTypeProps}
                size={inputSearchModuleTypeProps.size || "large"}
                style={{
                    ...inputSearchModuleTypeProps.wrapperStyle,
                    width: `calc(100% - ${beforeOptionWidth}px`,
                    position: "relative"
                }}
                onFocus={onFocus}
                onBlur={onBlur}
                wrapperClassName={classNames(
                    styles["yakit-combination-search"],
                    {
                        [styles["yakit-combination-search-focus"]]: focus
                    },
                    inputSearchModuleTypeProps.wrapperClassName
                )}
            />
        )
    })
    const onRenderSelect = useMemoizedFn(() => {
        const {
            data = [],
            wrapperClassName = "",
            wrapperStyle = {},
            ...resSelectModuleTypeProps
        } = selectModuleTypeProps || {}
        return (
            <YakitSelect
                mode='tags'
                {...resSelectModuleTypeProps}
                size={resSelectModuleTypeProps.size || "middle"}
                onFocus={onFocusSelect}
                onBlur={onBlurSelect}
                wrapperStyle={{
                    ...wrapperStyle,
                    width: `calc(100% - ${beforeOptionWidth}px`
                }}
                wrapperClassName={classNames(styles["yakit-combination-search-right-select"], wrapperClassName)}
            >
                {data.map((item, index) => {
                    const optValue = selectModuleTypeProps.optValue || "value"
                    const optText = selectModuleTypeProps.optText || "text"
                    const optDisabled = selectModuleTypeProps.optDisabled || "disabled"
                    const flag = Object.prototype.toString.call(item) === "[object Object]"
                    const value = flag ? item[optValue] : item
                    const title = flag ? item[optText] : item
                    const key = selectModuleTypeProps.optKey ? item[optText] : null
                    return (
                        <YakitSelect.Option
                            key={key || value || index}
                            value={value}
                            title={title}
                            disabled={item[optDisabled]}
                            record={item}
                        >
                            {!!selectModuleTypeProps.renderOpt
                                ? selectModuleTypeProps.renderOpt(item)
                                : item[optText]
                                    ? item[optText]
                                    : value}
                        </YakitSelect.Option>
                    )
                })}
            </YakitSelect>
        )
    })
    return (
        <div className={classNames(styles["yakit-combination-search"], { wrapperClassName })}>
            <Input.Group compact>
                <YakitSelect
                    {...selectProps}
                    size={selectProps.size || "middle"}
                    value={valueBeforeOption}
                    onSelect={onSelectBeforeOption}
                    wrapperStyle={{
                        width: beforeOptionWidth,
                        ...selectProps.wrapperStyle
                    }}
                    wrapperClassName={classNames(
                        styles["yakit-combination-search-select"],
                        selectProps.wrapperClassName
                    )}
                >
                    {addonBeforeOption.map((item) => (
                        <YakitSelect.Option value={item.value} key={item.value}>
                            {item.label}
                        </YakitSelect.Option>
                    ))}
                </YakitSelect>
                {onRenderRightContent()}
            </Input.Group>
        </div>
    )
}
