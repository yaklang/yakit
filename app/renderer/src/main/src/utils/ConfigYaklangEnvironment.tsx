import React, {useEffect, useState} from "react";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Form, Popconfirm, Space, Spin, Table, Tag, Tooltip} from "antd";
import {useMemoizedFn} from "ahooks";
import {CopyableField, InputItem} from "@/utils/inputUtil";
import {PlusOutlined, QuestionOutlined, ReloadOutlined} from "@ant-design/icons";
import {formatTimestamp} from "@/utils/timeUtil";
import {info} from "@/utils/notification";

const {ipcRenderer} = window.require("electron");

export interface ConfigYaklangEnvironmentProp {

}

interface EnvKey {
    Key: string
    Value: string
    ExpiredAt: number
    Verbose?: string
}

interface SetEnvKey {
    Key: string
    Value: string
}

interface NewEnvKeyFormProp {
    onClose: () => any
    modified?: SetEnvKey
    verbose?: string
}

const NewEnvKeyForm: React.FC<NewEnvKeyFormProp> = (props) => {
    const [loading, setLoading] = useState(false);
    const [params, setParams] = useState<SetEnvKey>(props.modified || {Key: "", Value: ""})

    return <Form onSubmitCapture={e => {
        e.preventDefault()

        setLoading(true)
        ipcRenderer.invoke("SetProcessEnvKey", params).then(() => {
            props.onClose()
        }).finally(() => setTimeout(() => setLoading(false), 300))
    }} labelCol={{span: 5}} wrapperCol={{span: 14}}>
        <Spin spinning={loading}>
            {props.verbose && <Form.Item label={" "} colon={false}>
                <Alert type={"info"} message={props.verbose}/>
            </Form.Item>}
            <InputItem label={"变量名"} setValue={Key => setParams({...params, Key})} value={params.Key}/>
            <InputItem label={"变量值"} setValue={Value => setParams({...params, Value})} value={params.Value}/>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 设置环境变量 </Button>
            </Form.Item>
        </Spin>
    </Form>
};

export const ConfigYaklangEnvironment: React.FC<ConfigYaklangEnvironmentProp> = (props) => {
    const [keys, setKeys] = useState<EnvKey[]>([]);
    const [loading, setLoading] = useState(false);

    const updateKeys = useMemoizedFn(() => {
        setLoading(true)
        ipcRenderer.invoke("GetAllProcessEnvKey", {}).then((e: { Results: EnvKey[] }) => {
            setKeys(e.Results)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        updateKeys()
    }, [])

    return <Table<EnvKey>
        size={"small"} bordered={true}
        loading={loading}
        title={() => {
            return <Space>
                环境变量列表
                <Button
                    size={"small"} icon={<PlusOutlined/>}
                    type={"primary"}
                    onClick={() => {
                        const m = showModal({
                            title: "设置新变量", width: 600, content: (
                                <NewEnvKeyForm onClose={() => {
                                    m.destroy()
                                    updateKeys()
                                }}/>
                            )
                        })
                    }}
                >设置新变量</Button>
                <Button size={"small"} type={"link"}
                        icon={<ReloadOutlined/>}
                        onClick={updateKeys}
                />
            </Space>
        }}
        dataSource={keys}
        pagination={false}
        columns={[
            {
                title: "环境变量名", render: (e: EnvKey) => <Space>
                    <Tag color={"geekblue"}>{e.Key}</Tag>
                    {
                        e.Verbose && <Tooltip title={e.Verbose}>
                            <Button type={"link"} size={"small"} icon={<QuestionOutlined/>}/>
                        </Tooltip>
                    }
                </Space>
            },
            {
                title: "变量值",
                render: (e: EnvKey) => <CopyableField text={e.Value} noCopy={(!e.Value || e.Value === `""`)}/>
            },
            {
                title: "失效时间",
                render: (e: EnvKey) => <div>{e.ExpiredAt > 100 ? formatTimestamp(e.ExpiredAt) : "永久"}</div>
            },
            {
                title: "操作",
                render: (key: EnvKey) => {
                    return <Space>
                        <Button
                            size={"small"}
                            onClick={() => {
                                const m = showModal({
                                    title: "修改变量", width: 650, content: (
                                        <NewEnvKeyForm
                                            verbose={key.Verbose}
                                            modified={key}
                                            onClose={() => {
                                                m.destroy()
                                                updateKeys()
                                            }}
                                        />
                                    )
                                })
                            }}
                        >
                            修改
                        </Button>
                        <Popconfirm title={"删除本环境变量"} onConfirm={() => {
                            ipcRenderer.invoke("DelKey", {Key: key.Key}).then(() => {
                                info("删除成功")
                                updateKeys()
                            })
                        }}>
                            <Button
                                size={"small"} danger={true}
                            >删除</Button>
                        </Popconfirm>
                    </Space>
                }
            },
        ]}
    />
};

export const showConfigYaklangEnvironment = (title?: string) => {
    showModal({
        title: title ? title : "配置 Yaklang 系统环境变量",
        width: 800,
        content: (
            <>
                <ConfigYaklangEnvironment/>
            </>
        )
    })
}