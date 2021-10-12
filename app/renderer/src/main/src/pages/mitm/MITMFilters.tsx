import React, {useEffect, useState} from "react";
import {Button, Form, Spin} from "antd";
import {ManyMultiSelectForString} from "../../utils/inputUtil";

const {ipcRenderer} = window.require("electron");

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
}


export const MITMFilters: React.FC<MITMFiltersProp> = (props) => {
    const [params, setParams] = useState<MITMFilterSchema>(props.filter || {});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setParams(props.filter || {})
    }, [props.filter])

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
                label={"排除 HTTP 方法"}
                data={[]}
                value={(params.excludeMethod || []).join(",")}
                setValue={(r) => {
                    setParams({...params, excludeMethod: r.split(",")})
                }}
                mode={"tags"}
            />
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 确认修改 MITM 过滤器 </Button>
            </Form.Item>
        </Form>
    </Spin>
};