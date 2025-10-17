import React, {useEffect, useState} from "react"
import {RandStrWithLenProp} from "./Rand"
import {Form, Typography} from "antd"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {Text} = Typography

export interface SingleTagProp extends RandStrWithLenProp {
    tag: string
    help: string
    enableInput?: boolean
    defaultInput?: string
    label?: string
    exampleInput?: string
}

export interface EncodeTagProp extends SingleTagProp {}

export const EncodeTag: React.FC<EncodeTagProp> = (props) => {
    const {t, i18n} = useI18nNamespaces(["webFuzzer"])
    const [origin, setOrigin] = useState(props.origin)

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

    return (
        <>
            {props.help && (
                <Form.Item label={t("EncodeTag.encodeTagIntro")}>
                    <Text mark={true}>{props.help}</Text>
                </Form.Item>
            )}
        </>
    )
}
