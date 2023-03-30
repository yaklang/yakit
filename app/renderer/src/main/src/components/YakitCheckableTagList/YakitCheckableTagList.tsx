import classNames from "classnames"
import React, {useState} from "react"
import {Tag} from "antd"
import {YakitCheckableTag} from "../yakitUI/YakitTag/YakitCheckableTag"

const {CheckableTag} = Tag

interface OptionProps {
    label: string
    value: string
    disable?: boolean
}

interface YakitCheckableTagListProps {
    data: OptionProps[]
    value: string[]
    setValue: (s: string[]) => void
}
export const YakitCheckableTagList: React.FC<YakitCheckableTagListProps> = React.memo((props) => {
    const {data, value, setValue} = props
    return (
        <>
            {data.map((item) => (
                <YakitCheckableTag
                    {...item}
                    key={item.value}
                    checked={value.includes(item.value)}
                    onChange={(checked) => {
                        if (checked) {
                            const values: string[] = [...value, item.value]
                            setValue(values)
                        } else {
                            const values: string[] = value.filter((ele) => ele !== item.value)
                            setValue(values)
                        }
                    }}
                >
                    {item.label}
                </YakitCheckableTag>
            ))}
        </>
    )
})
