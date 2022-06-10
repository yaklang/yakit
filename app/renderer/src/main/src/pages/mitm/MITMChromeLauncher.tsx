import React, {useEffect, useState} from "react";
import {Alert, Button, Form, Input, Popconfirm, Space, Typography} from "antd";
import {showModal} from "../../utils/showModal";
import {failed, info} from "../../utils/notification";
import {ChromeFilled, StopOutlined} from "@ant-design/icons";

interface MITMChromeLauncherProp {
    host?: string
    port?: number
    onClose?: () => any
}

const {ipcRenderer} = window.require("electron");
const {Text} = Typography;

const MITMChromeLauncher: React.FC<MITMChromeLauncherProp> = (props) => {
    const [params, setParams] = useState<{ host: string, port: number }>({
        host: props.host ? props.host : "127.0.0.1",
        port: props.port ? props.port : 8083,
    });

    const close = () => {
        if (props.onClose) {
            props.onClose()
        }
    }

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            ipcRenderer.invoke("LaunchChromeWithParams", params).then(e => {
                close()
            }).catch(e => {
                failed(`Chrome 启动失败：${e}`)
            })
        }}
    >
        <Form.Item label={"配置代理"}>
            <Input.Group compact={true}>
                <Input prefix={"http://"}
                       onChange={e => setParams({...params, host: e.target.value})}
                       value={params.host}
                       style={{width: 165}}
                />
                <Input
                    prefix={":"} onChange={e => setParams({...params, port: parseInt(e.target.value)})}
                    value={`${params.port}`} style={{width: 80}}
                />
            </Input.Group>
        </Form.Item>
        <Form.Item colon={false} label={" "} help={(
            <Space style={{width: "100%", marginBottom: 20}} direction={"vertical"} size={4}>
                <Alert style={{marginTop: 4}} type={"success"} message={(
                    <>
                        本按钮将会启动一个代理已经被正确配置的 Chrome (使用系统 Chrome 浏览器配置)
                        <br/> <Text mark={true}>无需用户额外启用代理</Text>，同时把测试浏览器和日常浏览器分离
                    </>
                )}/>
                <Alert style={{marginTop: 4}} type={"error"} message={(
                    <>
                        <Text mark={true}>注意：</Text><br/>
                        免配置的浏览器启用了 <Text code={true}>{`--ignore-certificate-errors`}</Text> <br/>
                        这个选项是 <Text mark={true}>生效的</Text>，会忽略所有证书错误，<Text mark={true}>仅推荐安全测试时开启</Text>
                    </>
                )}/>
            </Space>
        )}>
            <Button type="primary" htmlType="submit"> 启动免配置 Chrome </Button>
        </Form.Item>
    </Form>
};

export const startChrome = (host?: string, port?: number) => {
    const m = showModal({
        title: "确定启动免配置 Chrome 参数",
        width: "60%",
        content: (
            <>
                <MITMChromeLauncher host={host} port={port} onClose={() => m.destroy()}/>
            </>
        )
    })
}

export const ChromeLauncherButton: React.FC<MITMChromeLauncherProp> = React.memo((props: MITMChromeLauncherProp) => {
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const id = setInterval(() => {
            ipcRenderer.invoke("IsChromeLaunched").then(e => {
                setStarted(e)
            })
        }, 500)
        return () => {
            clearInterval(id);
        }
    }, [])

    return <Button.Group>
        <Button
            type={"primary"}
            onClick={() => {
                startChrome(props.host, props.port)
            }}
            icon={<ChromeFilled/>}
        >免配置启动</Button>
        {started && <Popconfirm
            title={"关闭所有免配置 Chrome"}
            onConfirm={() => {
                ipcRenderer.invoke("StopAllChrome").then(() => {
                    info("关闭所有免配置 Chrome 成功")
                }).catch(e => {
                    failed(`关闭所有 Chrome 失败: ${e}`)
                })
            }}
        >
            <Button danger={true}
                    type={"primary"}
                    icon={<StopOutlined/>}
            />
        </Popconfirm>}
    </Button.Group>
});