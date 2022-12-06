import React, {useEffect, useState} from "react";
import {RandStrWithLenProp} from "./Rand";
import {Form, Typography} from "antd";
import {InputItem} from "@/utils/inputUtil";

const {Text} = Typography;

export interface SingleTagProp extends RandStrWithLenProp {
    tag: string
    help: string
    enableInput?: boolean
    defaultInput?: string
    label?: string
    exampleInput?: string
}

export const SingleTag: React.FC<SingleTagProp> = (props) => {
    const [input, setInput] = useState(props.defaultInput || "");

    useEffect(() => {
        if (props.enableInput) {
            return
        }

        let tag = `{{${props.tag}}}`;
        if ((props.origin || "").includes(tag)) {
            return
        }

        const {origin, setOrigin} = props;

        if (origin === "") {
            tag = ""
        }
        setOrigin(tag)
    }, [props])

    useEffect(()=>{
        if (props.enableInput) {
            props.setOrigin(`{{${props.tag}(${props.defaultInput})}}`)
        }
    }, [])

    return <>
        {props.help && <Form.Item label={"标签介绍"}>
            <Text mark={true}>{props.help}</Text>
        </Form.Item>}
        {props.enableInput && <InputItem
            label={props.label}
            value={input}
            setValue={value => {
                setInput(value)
                props.setOrigin(`{{${props.tag}(${value})}}`)
            }}
            help={props.exampleInput}
        />}
    </>
};

export interface EncodeTagProp extends SingleTagProp {

}

export const EncodeTag: React.FC<EncodeTagProp> = (props) => {
    const [origin, setOrigin] = useState(props.origin);

    useEffect(() => {
        if (!origin) {
            return
        }
        props.setOrigin(`{{${props.tag}(${origin})}}`)
    }, [origin])

    useEffect(() => {
        if ((props.origin || "").includes(`{{${props.tag}`)) {
            return
        }
        setOrigin(props.origin)
    }, [props])

    return <>
        {props.help && <Form.Item label={"编码标签介绍"}>
            <Text mark={true}>{props.help}</Text>
        </Form.Item>}
    </>
};