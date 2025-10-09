import React, {useEffect, useState} from "react"
import {Form, FormItemProps} from "antd"
import {failed} from "../../utils/notification"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

const {ipcRenderer} = window.require("electron")

export interface SelectItemProps {
    label: string | any
    required?: boolean
    help?: string | any
    style?: React.CSSProperties
    extraFormItemProps?: FormItemProps

    value: string | number
    width?: number | string
    disable?: boolean
    placeholder?: string
    allowClear?: boolean
    onChange?: (value: string, dict: string) => void
}

const {Item} = Form

export const SelectItem: React.FC<SelectItemProps> = (props) => {
    const [lists, setLists] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    const fetchList = () => {
        ipcRenderer
            .invoke("GetAllPayloadGroup")
            .then((data: {Groups: string[]}) => {
                setLists(data.Groups || [])
            })
            .catch((e: any) => {
                failed(e?.details || "获取字典列表失败！")
            })
            .finally()
    }

    useEffect(() => {
        fetchList()
    }, [])

    return (
        <div>
            <Item
                {...props.extraFormItemProps}
                label={props.label}
                required={!!props.required}
                style={props.style}
                help={props.help}
            >
                <YakitSelect
                    value={props.value}
                    loading={loading}
                    allowClear
                    disabled={loading || props.disable}
                    onChange={(value: any) => {
                        if (value) {
                            setLoading(true)
                            ipcRenderer
                                .invoke("Codec", {Type: "fuzz", Text: `{{x(${value})}}`})
                                .then((res) => {
                                    if (props.onChange) props.onChange(value, res?.Result || "")
                                })
                                .catch((err) => {
                                    failed(`获取字典内容失败：${err.details}`)
                                })
                                .finally(() => {
                                    setTimeout(() => {
                                        setLoading(false)
                                    }, 300)
                                })
                        } else {
                            if (props.onChange) props.onChange(value, "")
                        }
                    }}
                >
                    {lists.map((item) => (
                        <YakitSelect.Option key={item} value={item}>
                            {item}
                        </YakitSelect.Option>
                    ))}
                </YakitSelect>
            </Item>
        </div>
    )
}
