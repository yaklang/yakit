import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {Form} from "antd"
import React, {useEffect, useState} from "react"
import {InputInteger} from "../../../utils/inputUtil"

export interface RandStrWithLenProp {
    origin: string
    setOrigin: (origin: string) => any
}

export const RandStrWithLen: React.FC<RandStrWithLenProp> = (props) => {
    const {origin, setOrigin} = props
    const [len, setLen] = useState(10)

    useEffect(() => {
        const strLen = len || 10

        setOrigin(`{{randstr(${len})}}`)
    }, [len])

    return (
        <>
            <Form.Item label={"随机字符串长度"}>
                <YakitInputNumber value={len} onChange={(v) => setLen(v as number)} />
            </Form.Item>
        </>
    )
}

export interface RandStrWithMaxProp extends RandStrWithLenProp {}

export const RandStrWithMax: React.FC<RandStrWithMaxProp> = (props) => {
    const {origin, setOrigin} = props
    const [min, setMin] = useState(10)
    const [max, setMax] = useState(10)

    useEffect(() => {
        setOrigin(`{{randstr(${min},${max})}}`)
    }, [min, max])

    return (
        <>
            <Form.Item label={"最小长度"}>
                <YakitInputNumber value={min} min={1} max={max} onChange={(v) => setMin(v as number)} />
            </Form.Item>
            <Form.Item label={"最大长度"}>
                <YakitInputNumber value={max} min={min} onChange={(v) => setMax(v as number)} />
            </Form.Item>
        </>
    )
}

export interface RandStrWIthRepeatProp extends RandStrWithLenProp {}

export const RandStrWIthRepeat: React.FC<RandStrWIthRepeatProp> = (props) => {
    const {origin, setOrigin} = props
    const [min, setMin] = useState(10)
    const [max, setMax] = useState(10)
    const [count, setCount] = useState(5)

    useEffect(() => {
        setOrigin(`{{randstr(${min},${max},${count})}}`)
    }, [min, max, count])

    return (
        <>
            <Form.Item label={"最小长度"}>
                <YakitInputNumber value={min} min={1} max={max} onChange={(v) => setMin(v as number)} />
            </Form.Item>
            <Form.Item label={"最大长度"}>
                <YakitInputNumber value={max} min={min} onChange={(v) => setMax(v as number)} />
            </Form.Item>
            <Form.Item label={"重复次数"}>
                <YakitInputNumber value={count} min={1} onChange={(v) => setCount(v as number)} />
            </Form.Item>
        </>
    )
}

export interface RandIntProp extends RandStrWithLenProp {}

export const RandInt: React.FC<RandIntProp> = (props) => {
    const {origin, setOrigin} = props
    const [min, setMin] = useState(1000)
    const [max, setMax] = useState(9999)
    const [count, setCount] = useState(5)

    useEffect(() => {
        if (count > 1) {
            setOrigin(`{{randint(${min},${max},${count})}}`)
            return
        }
        setOrigin(`{{randint(${min},${max})}}`)
    }, [min, max, count])

    return (
        <>
            <Form.Item label={"最小值"}>
                <YakitInputNumber value={min} min={1} max={max} onChange={(v) => setMin(v as number)} />
            </Form.Item>
            <Form.Item label={"最大值"}>
                <YakitInputNumber value={max} min={min} onChange={(v) => setMax(v as number)} />
            </Form.Item>
            <Form.Item label={"重复次数"}>
                <YakitInputNumber value={count} min={1} onChange={(v) => setCount(v as number)} />
            </Form.Item>
        </>
    )
}
