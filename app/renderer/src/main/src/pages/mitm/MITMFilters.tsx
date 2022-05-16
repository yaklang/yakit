import React, {useEffect, useState} from "react";
import {Button, Form, Space, Spin} from "antd";
import {ManyMultiSelectForString} from "../../utils/inputUtil";
import { useMemoizedFn } from "ahooks";
import { success } from "../../utils/notification";

const {ipcRenderer} = window.require("electron");

const DefaultMitmFilter = "default-mitm-filter"

export interface MITMFiltersProp {
    filter?: MITMFilterSchema
    onFinished?: (filter: MITMFilterSchema) => any
}

export interface MITMFilterSchema {
    includeHostname?: string[]
    excludeHostname?: string[]
    includeSuffix?: string[]
    excludeSuffix?: string[]
    excludeMethod?: string[]
    excludeContentTypes?: string[]
}

export const MITMFilters: React.FC<MITMFiltersProp> = (props) => {
    const [params, setParams] = useState<MITMFilterSchema>(props.filter || {});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setParams(props.filter || {})
    }, [props.filter])

    const saveDefaultFilter = useMemoizedFn(() => {
        setLoading(true)

        if(JSON.stringify(params) === "{}") return
        ipcRenderer.invoke("set-value", DefaultMitmFilter, params)
        success("保存默认模板值成功")
        
        ipcRenderer.invoke("mitm-filter", {
            updateFilter: true, ...params
        }).finally(() => setLoading(false))
    })

    return <Spin spinning={loading}>
        <Form onSubmitCapture={e => {
            e.preventDefault()

            setLoading(true)
            ipcRenderer.invoke("mitm-filter", {
                updateFilter: true, ...params
            }).finally(() => setLoading(false))

            if (props.onFinished) props.onFinished(params);
        }} labelCol={{span: 4}} wrapperCol={{span: 15}}>
            <ManyMultiSelectForString
                label={"包含 Hostname"}
                data={[]}
                value={(params.includeHostname || []).join(",")}
                setValue={(r) => {
                    setParams({...params, includeHostname: r.split(",")})
                }}
                mode={"tags"}
            />
            <ManyMultiSelectForString
                label={"排除 Hostname"}
                data={[]}
                value={(params.excludeHostname || []).join(",")}
                setValue={(r) => {
                    setParams({...params, excludeHostname: r.split(",")})
                }}
                mode={"tags"}
            />
            <ManyMultiSelectForString
                label={"包含文件后缀"}
                data={[]}
                value={(params.includeSuffix || []).join(",")}
                setValue={(r) => {
                    setParams({...params, includeSuffix: r.split(",")})
                }}
                mode={"tags"}
            />
            <ManyMultiSelectForString
                label={"排除文件后缀"}
                data={[]}
                value={(params.excludeSuffix || []).join(",")}
                setValue={(r) => {
                    setParams({...params, excludeSuffix: r.split(",")})
                }}
                mode={"tags"}
            />
            <ManyMultiSelectForString
                label={"排除 Content-Type"}
                data={[]}
                value={(params.excludeContentTypes || []).join(",")}
                setValue={(r) => {
                    setParams({...params, excludeContentTypes: r.split(",")})
                }}
                mode={"tags"}
            />
            <ManyMultiSelectForString
                label={"排除 HTTP 方法"}
                data={[]}
                value={(params.excludeMethod || []).join(",")}
                setValue={(r) => {
                    setParams({...params, excludeMethod: r.split(",")})
                }}
                mode={"tags"}
            />
            <Form.Item colon={false} label={" "}>
                <Space>
                    <Button type="primary" htmlType="submit"> 确认修改 </Button>
                    <Button type="primary" onClick={saveDefaultFilter}> 确认修改并保存为模板 </Button>
                </Space>
            </Form.Item>
        </Form>
    </Spin>
};