import React, {useEffect, useImperativeHandle, useState} from "react"
import {Button, Form, Popconfirm, Space, Spin} from "antd"
import {ManyMultiSelectForString} from "../../../utils/inputUtil"
import {useMemoizedFn} from "ahooks"
import {info, success} from "../../../utils/notification"
import styles from "./MITMServerStartForm.module.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

const {ipcRenderer} = window.require("electron")

export interface MITMFiltersProp {
    filter?: MITMFilterSchema
    onFinished?: (filter: MITMFilterSchema) => any
    onClosed?: () => any
    ref?: any
}

export interface MITMFilterSchema {
    includeHostname?: string[]
    excludeHostname?: string[]
    includeSuffix?: string[]
    excludeSuffix?: string[]
    excludeMethod?: string[]
    excludeContentTypes?: string[]
    excludeUri?: string[]
    includeUri?: string[]
}

export const MITMFilters: React.FC<MITMFiltersProp> = React.forwardRef((props, ref) => {
    const [params, setParams] = useState<MITMFilterSchema>(props.filter || {})
    const [loading, setLoading] = useState(false)
    useImperativeHandle(
        ref,
        () => ({
            getFormValue: () => params
        }),
        [params]
    )
    useEffect(() => {
        setParams(props.filter || {})
    }, [props.filter])

    return (
        <Spin spinning={loading}>
            <Form labelCol={{span: 6}} wrapperCol={{span: 16}} className={styles["mitm-filters-form"]}>
                <Form.Item label='包含 Hostname'>
                    <YakitSelect
                        mode='tags'
                        value={params?.includeHostname}
                        onChange={(value, _) => {
                            setParams({...params, includeHostname: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label='排除 Hostname'>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeHostname || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeHostname: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item
                    label='包含 URL 路径'
                    help={"可理解为 URI 匹配，例如 /main/index.php?a=123 或者 /*/index 或 /admin* "}
                >
                    <YakitSelect
                        mode='tags'
                        value={params?.includeUri || undefined}
                        onChange={(value, _) => {
                            setParams({...params, includeUri: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"排除 URL 路径"} help={"可理解为 URI 过滤，例如 /main/index "}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeUri || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeUri: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"包含文件后缀"}>
                    <YakitSelect
                        mode='tags'
                        value={params?.includeSuffix || undefined}
                        onChange={(value, _) => {
                            setParams({...params, includeSuffix: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"排除文件后缀"}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeSuffix || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeSuffix: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"排除 Content-Type"}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeContentTypes || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeContentTypes: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={"排除 HTTP 方法"}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeMethod || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeMethod: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
            </Form>
        </Spin>
    )
})
