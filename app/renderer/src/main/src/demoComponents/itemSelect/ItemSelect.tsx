import React, {memo, useMemo} from "react"
import {Form} from "antd"
import {ItemSelectMultiForStringProps, ItemSelectOneProps} from "./ItemSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

const {Item} = Form

/** @name 表单项-单选下拉表 */
export const DemoItemSelectOne: React.FC<ItemSelectOneProps> = memo((p) => {
    const {label, help, formItemStyle, required, disabled, placeholder, size, allowClear, value, setValue, data} = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitSelect
                value={value}
                onChange={(value) => setValue && setValue(value)}
                disabled={disabled}
                size={size}
                placeholder={placeholder}
                allowClear={allowClear}
                options={data}
            ></YakitSelect>
        </Item>
    )
})

/** @name 表单项-多选下拉表 */
export const DemoItemSelectMultiForString: React.FC<ItemSelectMultiForStringProps> = memo((p) => {
    const {
        label,
        help,
        formItemStyle,
        required,
        disabled,
        placeholder,
        size,
        allowClear,
        mode = "multiple",
        defaultSep = ",",
        maxTagTextLength,
        value,
        setValue,
        data
    } = p

    const v = useMemo(() => {
        if (!value) return []
        return value?.split(defaultSep) || []
    }, [defaultSep, value])

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitSelect
                value={v}
                onChange={(value) => setValue && setValue(value.join(defaultSep) || "")}
                mode={mode}
                maxTagTextLength={maxTagTextLength}
                disabled={disabled}
                size={size}
                placeholder={placeholder}
                allowClear={allowClear}
                options={data}
            ></YakitSelect>
        </Item>
    )
})
