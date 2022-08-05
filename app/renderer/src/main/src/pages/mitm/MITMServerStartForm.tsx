import React, {useEffect, useState} from "react";
import {Button, Checkbox, Divider, Form, Input, InputNumber, Space} from "antd";
import {SimplePluginList} from "@/components/SimplePluginList";
import {showDrawer, showModal} from "@/utils/showModal";
import {MITMContentReplacerViewer} from "@/pages/mitm/MITMContentReplacerViewer";
import {MITMContentReplacerExport, MITMContentReplacerImport} from "@/pages/mitm/MITMContentReplacerImport";
import {getRemoteValue, getValue, setRemoteValue} from "@/utils/kv";
import {CONST_DEFAULT_ENABLE_INITIAL_PLUGIN} from "@/pages/mitm/MITMPage";
import {MITMConsts} from "@/pages/mitm/MITMConsts";

export interface MITMServerStartFormProp {
    onStartMITMServer: (host: string, port: number, downstreamProxy: string, enableInitialPlugin: boolean, defaultPlugins: string[]) => any
}

const {Item} = Form;

export const MITMServerStartForm: React.FC<MITMServerStartFormProp> = React.memo((props) => {
    const [host, setHost] = useState("127.0.0.1");
    const [port, setPort] = useState(8083);
    const [downstreamProxy, setDownstreamProxy] = useState("");
    const [enableInitialPlugin, setEnableInitialPlugin] = useState(false);
    const [defaultPlugins, setDefaultPlugins] = useState<string[]>([]);

    useEffect(() => {
        // 设置 MITM 初始启动插件选项
        getRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN).then(a => {
            setEnableInitialPlugin(!!a)
        })

        getRemoteValue(MITMConsts.MITMDefaultServer).then(e => {
            if (!!e) {
                setHost(`${e}`)
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultPort).then(e => {
            if (!!e) {
                setPort(parseInt(`${e}`))
            }
        })

        getRemoteValue(MITMConsts.MITMDefaultDownstreamProxy).then(e => {
            if (!!e) {
                setDownstreamProxy(`${e}`)
            }
        })
    }, [])

    return <div style={{height: "100%", width: "100%"}}>
        <Form
            style={{marginTop: 40}}
            onSubmitCapture={e => {
                e.preventDefault()
                props.onStartMITMServer(host, port, downstreamProxy, enableInitialPlugin, defaultPlugins)

                setRemoteValue(MITMConsts.MITMDefaultServer, host);
                setRemoteValue(MITMConsts.MITMDefaultPort, `${port}`);
                setRemoteValue(MITMConsts.MITMDefaultDownstreamProxy, downstreamProxy)
            }}
            layout={"horizontal"} labelCol={{span: 7}}
            wrapperCol={{span: 13}}
        >
            <Item label={"劫持代理监听主机"} help={"远程模式可以修改为 0.0.0.0 以监听主机所有网卡"}>
                <Input value={host} onChange={e => setHost(e.target.value)}/>
            </Item>
            <Item label={"劫持代理监听端口"}>
                <InputNumber value={port} onChange={e => setPort(e)}/>
            </Item>
            <Item label={"选择插件"} colon={true}>
                <div style={{height: 200, maxWidth: 420}}>
                    <SimplePluginList
                        disabled={!enableInitialPlugin}
                        bordered={true}
                        initialSelected={defaultPlugins}
                        onSelected={(list: string[]) => {
                            setDefaultPlugins(list)
                        }} pluginTypes={"mitm,port-scan"}
                        verbose={<div>MITM 与 端口扫描插件</div>}/>
                </div>
            </Item>
            <Item label={"下游代理"} help={"为经过该 MITM 代理的请求再设置一个代理，通常用于访问中国大陆无法访问的网站或访问特殊网络/内网，也可用于接入被动扫描"}>
                <Input value={downstreamProxy} onChange={e => setDownstreamProxy(e.target.value)}/>
            </Item>
            <Item label={"内容规则"} help={"使用规则进行匹配、替换、标记、染色，同时配置生效位置"}>
                <Space>
                    <Button
                        onClick={() => {
                            let m = showDrawer({
                                placement: "top", height: "50%",
                                content: (
                                    <MITMContentReplacerViewer/>
                                ),
                                maskClosable: false,
                            })
                        }}
                    >已有规则</Button>
                    <Button type={"link"} onClick={() => {
                        const m = showModal({
                            title: "从 JSON 中导入",
                            width: "60%",
                            content: (
                                <>
                                    <MITMContentReplacerImport onClosed={() => {
                                        m.destroy()
                                    }}/>
                                </>
                            )
                        })
                    }}>从 JSON 导入</Button>
                    <Button type={"link"} onClick={() => {
                        showModal({
                            title: "导出配置 JSON",
                            width: "50%",
                            content: (
                                <>
                                    <MITMContentReplacerExport/>
                                </>
                            )
                        })
                    }}>导出为 JSON</Button>
                </Space>
            </Item>
            <Item label={" "} colon={false}>
                <Space>
                    <Button type={"primary"} htmlType={"submit"}>
                        劫持启动
                    </Button>
                    <Divider type={"vertical"}/>
                    <Checkbox
                        checked={enableInitialPlugin}
                        onChange={node => {
                            const e = node.target.checked;
                            setEnableInitialPlugin(e)
                            if (e) {
                                setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, "true")
                            } else {
                                setRemoteValue(CONST_DEFAULT_ENABLE_INITIAL_PLUGIN, "")
                            }
                        }}
                    >
                        插件自动加载
                    </Checkbox>
                </Space>
            </Item>
        </Form>
    </div>
});