import React, {ReactNode} from "react"
import {Col, Form, FormItemProps, Input, InputProps, Row, Upload, Select, SelectProps} from "antd"
import "@ant-design/compatible/assets/index.css"
import {DraggerProps} from "antd/lib/upload"
import {TextAreaProps} from "antd/lib/input"

import "./FormItemUtil.css"
import {ManyMultiSelectForString} from "../../utils/inputUtil";

const {Item} = Form
const {Dragger} = Upload
const {TextArea} = Input
const {Option} = Select

interface ItemDraggerProps extends DraggerProps {
    className?: string
}
interface ItemExtraProps extends FormItemProps {}
interface ItemInputProps extends InputProps {
    isBubbing?: boolean // 是否阻止事件冒泡
    setValue?: (s: string) => any
}
interface ItemTextAreaProps extends TextAreaProps {
    isBubbing?: boolean // 是否阻止事件冒泡
    setValue?: (s: string) => any
}
interface ItemSelectProps<T> extends SelectProps<T> {
    setValue?: (value: any) => any
    data?: T[]
    optText?: string
    optValue?: string
    optDisabled?: string
    renderOpt?: (info: T) => ReactNode
}

/* 拖拽式上传组件，内部组件为textarea类型 */
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

                <Col span={24 - (prefixNode ? 1 : 0) * 6 - (suffixNode ? 1 : 0) * 6}>
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

/* 拖拽式上传组件，内部组件为input类型 */
export interface ItemDraggerInputProps {
    // dragger组件属性
    dragger?: ItemDraggerProps
    // item组件属性
    item?: ItemExtraProps
    // input组件属性
    input?: ItemInputProps

    // 放在form-item里面的前缀元素
    prefixNode?: ReactNode
    // 放在form-item里面的前缀元素
    suffixNode?: ReactNode
}
export const ItemDraggerInput: React.FC<ItemDraggerInputProps> = (props) => {
    const {
        // @ts-ignore
        dragger: {className: DraggerClassName, ...restDragger} = {},
        item = {},
        // @ts-ignore
        input: {isBubbing = false, setValue, ...restInput} = {},
        prefixNode,
        suffixNode
    } = props

    return (
        <Item {...item}>
            <Row gutter={8}>
                <Col span={prefixNode ? 4 : 0}>{prefixNode}</Col>

                <Col span={24 - (prefixNode ? 1 : 0) * 6 - (suffixNode ? 1 : 0) * 6}>
                    <Dragger
                        {...restDragger}
                        className={`file-upload-dragger ${DraggerClassName || ""}`}
                        accept={restDragger.accept === undefined ? "text/plain" : restDragger.accept}
                    >
                        <Input
                            {...restInput}
                            onChange={(e) => {
                                if (restInput.onChange) restInput.onChange(e)
                                setValue && setValue(e.target.value)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onPressEnter={(e) => {
                                if (restInput.onPressEnter) restInput.onPressEnter(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onFocus={(e) => {
                                if (restInput.onFocus) restInput.onFocus(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                            onClick={(e) => {
                                if (restInput.onClick) restInput.onClick(e)
                                if (!!isBubbing) e.stopPropagation()
                            }}
                        ></Input>
                    </Dragger>
                </Col>

                <Col span={suffixNode ? 4 : 0}>{suffixNode}</Col>
            </Row>
        </Item>
    )
}

/* 下拉框类型组件 */
export interface ItemSelectsProps<T> {
    // item组件属性
    item?: ItemExtraProps
    // select组件属性
    select?: ItemSelectProps<T>

    // 放在form-item里面的前缀元素
    prefixNode?: ReactNode
    // 放在form-item里面的前缀元素
    suffixNode?: ReactNode
}
export const ItemSelects: React.FC<ItemSelectsProps<any>> = (props) => {
    const {
        item = {},
        // @ts-ignore
        select: {
            setValue,
            data = [],
            optText = "text",
            optValue = "value",
            optDisabled = "disabled",
            renderOpt,
            ...restSelect
        } = {},
        prefixNode,
        suffixNode
    } = props

    return (
        <Item {...item}>
            <Row gutter={8}>
                <Col span={prefixNode ? 4 : 0}>{prefixNode}</Col>

                <Col span={24 - (prefixNode ? 1 : 0) * 6 - (suffixNode ? 1 : 0) * 6}>
                    <Select
                        {...restSelect}
                        onChange={(value, option) => {
                            if (setValue) setValue(value)
                            if (restSelect.onChange) restSelect.onChange(value, option)
                        }}
                    >
                        {data.map((item, index) => {
                            return (
                                <Option
                                    key={item[optValue] || index}
                                    value={item[optValue]}
                                    title={item[optText]}
                                    disabled={item[optDisabled]}
                                >
                                    {!!renderOpt ? renderOpt(item) : item[optText] ? item[optText] : item[optValue]}
                                </Option>
                            )
                        })}
                    </Select>
                </Col>

                <Col span={suffixNode ? 4 : 0}>{suffixNode}</Col>
            </Row>
        </Item>
    )
}
