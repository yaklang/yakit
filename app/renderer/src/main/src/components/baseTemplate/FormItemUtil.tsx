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
    ref?: any
    setValue?: (value: any) => any
    data?: T[]
    optText?: string
    optValue?: string
    optDisabled?: string
    renderOpt?: (info: T) => ReactNode
}

interface ItemGeneralParams {
    // item组件属性
    item?: ItemExtraProps
    // 是否外层包裹item组件，为false时prefixNode和suffixNode参数无效
    isItem?: boolean
    // 放在form-item里面的前缀元素
    prefixNode?: ReactNode
    // 放在form-item里面的前缀元素
    suffixNode?: ReactNode
}

/* 拖拽式上传组件，内部组件为textarea类型 */
export interface ItemDraggerTextAreaProps extends ItemGeneralParams {
    // dragger组件属性
    dragger?: ItemDraggerProps
    // textarea组件属性
    textarea?: ItemTextAreaProps
}
export const ItemDraggerTextArea: React.FC<ItemDraggerTextAreaProps> = (props) => {
    const {
        isItem = true,
        // @ts-ignore
        dragger: {className: DraggerClassName, ...restDragger} = {},
        item = {},
        // @ts-ignore
        textarea: {isBubbing = false, setValue, ...restTextarea} = {},
        prefixNode,
        suffixNode
    } = props

    if (!isItem) {
        return (
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
        )
    }

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
export interface ItemDraggerInputProps extends ItemGeneralParams {
    // dragger组件属性
    dragger?: ItemDraggerProps
    // input组件属性
    input?: ItemInputProps
}
export const ItemDraggerInput: React.FC<ItemDraggerInputProps> = (props) => {
    const {
        isItem = true,
        // @ts-ignore
        dragger: {className: DraggerClassName, ...restDragger} = {},
        item = {},
        // @ts-ignore
        input: {isBubbing = false, setValue, ...restInput} = {},
        prefixNode,
        suffixNode
    } = props

    if (!isItem) {
        return (
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
        )
    }

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
export interface ItemSelectsProps<T> extends ItemGeneralParams {
    // select组件属性
    select?: ItemSelectProps<T>
}
export const ItemSelects: React.FC<ItemSelectsProps<any>> = (props) => {
    const {
        isItem = true,
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

    if (!isItem) {
        return (
            <Select
                {...restSelect}
                onChange={(value, option) => {
                    if (setValue) setValue(value)
                    if (restSelect.onChange) restSelect.onChange(value, option)
                }}
            >
                {data.map((item, index) => {
                    const flag = Object.prototype.toString.call(item) === "[object Object]"
                    const value = flag ? item[optValue] : item
                    const title = flag ? item[optText] : item

                    return (
                        <Option key={value || index} value={value} title={title} disabled={item[optDisabled]}>
                            {!!renderOpt ? renderOpt(item) : item[optText] ? item[optText] : value}
                        </Option>
                    )
                })}
            </Select>
        )
    }

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
                                    key={item[optValue] || item || index}
                                    value={item[optValue] || item}
                                    title={item[optText] || item}
                                    disabled={item[optDisabled]}
                                >
                                    {!!renderOpt
                                        ? renderOpt(item)
                                        : item[optText]
                                        ? item[optText]
                                        : item[optValue] || item}
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
