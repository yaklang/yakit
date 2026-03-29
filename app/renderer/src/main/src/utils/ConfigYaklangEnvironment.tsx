import React, {useEffect, useState} from "react";
import {showModal} from "@/utils/showModal";
import {Alert, Button, Form, Space, Spin, Table, Tag, Tooltip} from "antd";
import {useMemoizedFn} from "ahooks";
import {CopyableField, InputItem} from "@/utils/inputUtil";
import {PlusOutlined, QuestionOutlined, ReloadOutlined} from "@ant-design/icons";
import {formatTimestamp} from "@/utils/timeUtil";
import {info} from "@/utils/notification";
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm";
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")

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
    const {t, i18n} = useI18nNamespaces(["utils"])
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
            <InputItem label={t("basic.ConfigYaklangEnvironment.variableName")} setValue={Key => setParams({...params, Key})} value={params.Key}/>
            <InputItem label={t("basic.ConfigYaklangEnvironment.variableValue")} setValue={Value => setParams({...params, Value})} value={params.Value}/>
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> {t("basic.ConfigYaklangEnvironment.setEnvironmentVariable")} </Button>
            </Form.Item>
        </Spin>
    </Form>
};

export const ConfigYaklangEnvironment: React.FC<ConfigYaklangEnvironmentProp> = (props) => {
    const {t, i18n} = useI18nNamespaces(["utils"])
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
                {t("basic.ConfigYaklangEnvironment.environmentVariableList")}
                <Button
                    size={"small"} icon={<PlusOutlined/>}
                    type={"primary"}
                    onClick={() => {
                        const m = showModal({
                            title: t("basic.ConfigYaklangEnvironment.newVariableTitle"), width: 600, content: (
                                <NewEnvKeyForm onClose={() => {
                                    m.destroy()
                                    updateKeys()
                                }}/>
                            )
                        })
                    }}
                    >{t("basic.ConfigYaklangEnvironment.setNewVariable")}</Button>
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
                title: t("basic.ConfigYaklangEnvironment.environmentVariableName"), render: (e: EnvKey) => <Space>
                    <Tag color={"geekblue"}>{e.Key}</Tag>
                    {
                        e.Verbose && <Tooltip title={e.Verbose}>
                            <Button type={"link"} size={"small"} icon={<QuestionOutlined/>}/>
                        </Tooltip>
                    }
                </Space>
            },
            {
                title: t("basic.ConfigYaklangEnvironment.variableValue"),
                render: (e: EnvKey) => <CopyableField text={e.Value} noCopy={(!e.Value || e.Value === `""`)}/>
            },
            {
                title: t("basic.ConfigYaklangEnvironment.expiredTime"),
                render: (e: EnvKey) => <div>{e.ExpiredAt > 100 ? formatTimestamp(e.ExpiredAt) : "Permanent"}</div>
            },
            {
                title: t("basic.ConfigYaklangEnvironment.operation"),
                render: (key: EnvKey) => {
                    return <Space>
                        <Button
                            size={"small"}
                            onClick={() => {
                                const m = showModal({
                                    title: t("basic.ConfigYaklangEnvironment.editVariableTitle"), width: 650, content: (
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
                            {t("basic.ConfigYaklangEnvironment.modify")}
                        </Button>
                        <YakitPopconfirm title={t("basic.ConfigYaklangEnvironment.deleteThisEnvironmentVariable")} onConfirm={() => {
                            ipcRenderer.invoke("DelKey", {Key: key.Key}).then(() => {
                                info(t("basic.ConfigYaklangEnvironment.deleteSuccess"))
                                updateKeys()
                            })
                        }}>
                            <Button
                                size={"small"} danger={true}
                            >{t("basic.ConfigYaklangEnvironment.delete")}</Button>
                        </YakitPopconfirm>
                    </Space>
                }
            },
        ]}
    />
};

export const showConfigYaklangEnvironment = (title?: string) => {
    showModal({
        title: title ? title : t("basic.ConfigYaklangEnvironment.configYaklangSystemEnvironmentVariable"),
        width: 800,
        content: (
            <>
                <ConfigYaklangEnvironment/>
            </>
        )
    })
}
