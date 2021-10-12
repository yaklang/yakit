import React, {useEffect, useState} from "react";
import {RandStrWithLenProp} from "./Rand";
import {InputItem} from "../../../utils/inputUtil";
import {Form, Input, InputNumber} from "antd";

export interface FuzzWithRangeProp extends RandStrWithLenProp {
    help?: string
    label: string
    tag: string
}

export const FuzzWithRange: React.FC<FuzzWithRangeProp> = (props) => {
    const [range, setRange] = useState("")

    useEffect(() => {
        props.setOrigin(`{{${props.tag}(${range})}}`)
    }, [range])

    return <>
        <InputItem help={props.help} label={props.label} value={range} setValue={setRange}/>
    </>
};

export interface RangeCharProp extends RandStrWithLenProp {

}

export const RangeChar: React.FC<RangeCharProp> = (props) => {
    const [min, setMin] = useState("00");
    const [max, setMax] = useState("FF");

    useEffect(() => {
        props.setOrigin(`{{rangechar(${min || "00"},${max || "FF"})}}`)
    }, [min, max])

    return <>
        <Form.Item label={"设置字符最小 ASCII 码"}>
            <Input
                value={min}
                prefix={"0x"}
                maxLength={2}
                onChange={e => {
                    setMin(e.target.value.split("").filter(i => i !== "" && "0987654321abcdefABCDEF".includes(i)).join("").toUpperCase())
                }}
            />
        </Form.Item>
        <Form.Item label={"设置字符最大 ASCII 码"}>
            <Input prefix={"0x"}
                   value={max}
                   maxLength={2}
                   onChange={e => {
                       setMax(e.target.value.split("").filter(i => i !== "" && "0987654321abcdefABCDEF".includes(i)).join("").toUpperCase())
                   }}
            />
        </Form.Item>
    </>
};