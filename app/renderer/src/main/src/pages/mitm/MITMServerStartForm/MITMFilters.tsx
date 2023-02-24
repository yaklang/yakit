import React, {useEffect, useState} from "react"
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

export const MITMFilters: React.FC<MITMFiltersProp> = (props) => {
    const [params, setParams] = useState<MITMFilterSchema>(props.filter || {})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setParams(props.filter || {})
    }, [props.filter])

    return (
        <Spin spinning={loading}>
            <Form
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    setLoading(true)
                    ipcRenderer
                        .invoke("mitm-filter", {
                            updateFilter: true,
                            ...params
                        })
                        .finally(() => setLoading(false))

                    if (props.onFinished) props.onFinished(params)
                }}
                labelCol={{span: 6}}
                wrapperCol={{span: 16}}
                className={styles["mitm-filters-form"]}
            >
                <Form.Item label='包含 Hostname'>
                    <YakitSelect
                        mode='tags'
                        value={params?.includeHostname || undefined}
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
                {/* <ManyMultiSelectForString
                    label={"包含 Hostname"}
                    data={[]}
                    value={(params.includeHostname || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, includeHostname: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"排除 Hostname"}
                    data={[]}
                    value={(params.excludeHostname || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, excludeHostname: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"包含 URL 路径"}
                    help={"可理解为 URI 匹配，例如 /main/index.php?a=123 或者 "}
                    data={[]}
                    value={(params.includeUri || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, includeUri: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"排除 URL 路径"}
                    help={"可理解为 URI 过滤，例如 /main/index "}
                    data={[]}
                    value={(params.excludeUri || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, excludeUri: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"包含文件后缀"}
                    data={[]}
                    value={(params.includeSuffix || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, includeSuffix: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"排除文件后缀"}
                    data={[]}
                    value={(params.excludeSuffix || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, excludeSuffix: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"排除 Content-Type"}
                    data={[]}
                    value={(params.excludeContentTypes || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, excludeContentTypes: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <ManyMultiSelectForString
                    label={"排除 HTTP 方法"}
                    data={[]}
                    value={(params.excludeMethod || []).join(",")}
                    setValue={(r) => {
                        setParams({...params, excludeMethod: r.split(",")})
                    }}
                    mode={"tags"}
                /> */}
                {/* <Form.Item colon={false} label={" "}>
                    <Space>
                        <Button type='primary' htmlType='submit'>
                            {" "}
                            确认修改{" "}
                        </Button>
                        <Popconfirm
                            title={"重置过滤器将导致现有过滤器数据丢失，且无法恢复"}
                            onConfirm={() => {
                                ipcRenderer.invoke("mitm-reset-filter").then(() => {
                                    info("MITM 过滤器重置命令已发送")
                                    if (props.onClosed) props.onClosed()
                                })
                            }}
                        >
                            <Button type='link'> 重置过滤器 </Button>
                        </Popconfirm>
                    </Space>
                </Form.Item> */}
            </Form>
        </Spin>
    )
}
