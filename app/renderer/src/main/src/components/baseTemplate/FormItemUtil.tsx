import React, {ReactNode} from "react"
import {Col, Form, Input, Row, Upload} from "antd"
import "@ant-design/compatible/assets/index.css"
import {DraggerProps} from "antd/lib/upload"
import {TextAreaProps} from "antd/lib/input"
import {FormItemProps} from "@ant-design/compatible/lib/form"

import "./FormItemUtil.css"

const {Item} = Form
const {Dragger} = Upload
const {TextArea} = Input

interface ItemDraggerProps extends DraggerProps {
    className?: string
}
interface ItemExtraProps extends FormItemProps {}
interface ItemTextAreaProps extends TextAreaProps {
    // 是否阻止事件冒泡
    isBubbing?: boolean
    // 修改内容时的回调
    setValue?: (s: string) => any
}

export interface ItemDraggerTextAreaProps {
    // dragger组件属性
    dragger?: ItemDraggerProps
    // item组件属性
    item?: ItemExtraProps
    // textarea组件属性
    textarea?: ItemTextAreaProps

    // 放在form-item里面的前缀元素
    prefixNode?: ReactNode
    // 放在form-item里面的前缀元素
    suffixNode?: ReactNode
}
export const ItemDraggerTextArea: React.FC<ItemDraggerTextAreaProps> = (props) => {
    const {
        // @ts-ignore
        dragger: {className: DraggerClassName, ...restDragger} = {},
        item = {},
        // @ts-ignore
        textarea: {isBubbing = false, setValue, ...restTextarea} = {},
        prefixNode,
        suffixNode
    } = props

    return (
        <Item {...item}>
            <Row gutter={8}>
                <Col span={prefixNode ? 4 : 0}>{prefixNode}</Col>

                <Col span={24 - ((prefixNode ? 1 : 0) + (suffixNode ? 1 : 0)) * 4}>
                    <Dragger
                        {...restDragger}
                        className={`file-upload-dragger ${DraggerClassName || ""}`}
                        accept={restDragger.accept || "text/plain"}
                    >
                        <TextArea
                            {...restTextarea}
                            onChange={(e) => {
                                if (restTextarea.onChange) restTextarea.onChange(e)
                                setValue && setValue(e.target.value)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onPressEnter={(e) => {
                                if (restTextarea.onPressEnter) restTextarea.onPressEnter(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onFocus={(e) => {
                                if (restTextarea.onFocus) restTextarea.onFocus(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onClick={(e) => {
                                if (restTextarea.onClick) restTextarea.onClick(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                        ></TextArea>
                    </Dragger>
                </Col>

                <Col span={suffixNode ? 4 : 0}>{suffixNode}</Col>
            </Row>
        </Item>
    )
}
