import React, {memo} from "react"
import {Form} from "antd"
import {ItemSwitchProps} from "./ItemSwitchType"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

const {Item} = Form

/** @name 表单项-开关 */
export const DemoItemSwitch: React.FC<ItemSwitchProps> = memo((p) => {
    const {label, help, formItemStyle, required, size, disabled, value, setValue} = p

    return (
        <Item label={label} help={help} style={{...formItemStyle}} required={required}>
            <YakitSwitch
                size={size}
                disabled={disabled}
                checked={value}
                onChange={(value) => setValue && setValue(value)}
            />
        </Item>
    )
})
