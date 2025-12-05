import React, {useEffect, useMemo, useState} from "react"
import {Tooltip, Form, Divider, Table, Modal} from "antd"
import {
    OutlinePencilaltIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTrashIcon,
    OutlineEyeoffIcon,
    OutlineEyeIcon
} from "@/assets/icon/outline"
import {useMemoizedFn} from "ahooks"
import {ProxyEndpoint, ProxyRoute} from "@/apiUtils/grpc"
import {randomString} from "@/utils/randomUtil"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {YakitPopconfirm} from "../yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useProxy} from "@/hook/useProxy"
import {YakitSideTab} from "../yakitSideTab/YakitSideTab"
import styles from "./ConfigNetworkPage.module.scss"

const generateEndpointId = () => `ep-${randomString(8)}`
const generateRouteId = () => `route-${randomString(8)}`
const PasswordDisplay: React.FC<{
    password?: string
}> = ({password}) => {
    const [visible, setVisible] = useState(false)
    if (!password) return <></>
    return (
        <span>
            <span className={styles["password_display_icon_text"]}>
                {visible ? password : "•".repeat(password.length)}
            </span>
            <YakitButton
                className={styles["password_display_icon_eye"]}
                icon={visible ? <OutlineEyeIcon /> : <OutlineEyeoffIcon />}
                type='text2'
                onClick={() => setVisible(!visible)}
            />
        </span>
    )
}

export interface ProxyRulesConfigProps {
    visible: boolean
    onClose: () => void
    onRoutesChange?: (count: number) => void
    hideRules?: boolean
}

const ProxyRulesConfig = (props: ProxyRulesConfigProps) => {
    const {visible, hideRules = false, onClose, onRoutesChange} = props
    const {proxyConfig, saveProxyConfig} = useProxy()
    const [form] = Form.useForm()
    const [modalVisible, setModalVisible] = useState(false)
    const [activeKey, setActiveKey] = useState("point")
    const [editId, setEditId] = useState<string | null>(null)
    const {t, i18n} = useI18nNamespaces(["yakitUi", "mitm", "payload"])
    const {Endpoints, Routes} = proxyConfig
    const tab = [
        {value: "point", label: t("ProxyConfig.Points")},
        {value: "route", label: t("ProxyConfig.Routes")}
    ]
    const isEndpoints = useMemo(() => activeKey === "point", [activeKey])

    useEffect(() => {
        onRoutesChange?.(Routes.length)
    }, [Routes, onRoutesChange])

    const handleOk = useMemoizedFn(() => {
        form.validateFields().then((values) => {
            const {Url = "", UserName = "", Password = "", EndpointIds = [], Patterns = [], Name = ""} = values
            const newItem = isEndpoints
                ? {
                      Id: editId || generateEndpointId(),
                      Url,
                      Name: Url,
                      ...(UserName ? {UserName} : null),
                      ...(Password ? {Password} : null)
                  }
                : {
                      Id: editId || generateRouteId(),
                      EndpointIds,
                      Name,
                      Patterns
                  }

            const updateList = <T extends {Id: string}>(list: T[]): T[] =>
                editId
                    ? list.map((item) => (item.Id === editId ? ({...item, ...newItem} as unknown as T) : item))
                    : [...list, newItem as unknown as T]

            saveProxyConfig(
                {
                    Endpoints: isEndpoints ? updateList(Endpoints) : Endpoints,
                    Routes: !isEndpoints ? updateList(Routes) : Routes
                },
                handleCancel
            )
        })
    })

    const handleCancel = useMemoizedFn(() => {
        setModalVisible(false)
        form.resetFields()
        setEditId(null)
    })

    const onEdit = useMemoizedFn((record: ProxyRoute | ProxyEndpoint) => {
        setEditId(record.Id)
        if (!isEndpoints) {
            const {EndpointIds = [], ...rest} = record as ProxyRoute
            form.setFieldsValue({
                ...rest,
                EndpointIds: EndpointIds.filter((val) => Endpoints.some(({Id}) => Id === val))
            })
        } else {
            form.setFieldsValue({
                ...record
            })
        }
        setModalVisible(true)
    })

    const onDelete = useMemoizedFn((deleteId: string) => {
        if (isEndpoints) {
            const handleDelete = () =>
                saveProxyConfig({
                    Endpoints: Endpoints.filter(({Id}) => Id !== deleteId),
                    Routes
                })

            const relatedRoutes = Routes.filter(({EndpointIds = []}) => EndpointIds.includes(deleteId))
            if (relatedRoutes.length === 0) {
                handleDelete()
                return
            }
            Modal.confirm({
                title: t("ProxyConfig.delete_point_title"),
                content: t("ProxyConfig.delete_point_tips", {i: relatedRoutes.length}),
                okText: t("YakitButton.delete"),
                cancelText: t("YakitButton.cancel"),
                centered: true,
                onOk: () => handleDelete(),
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            saveProxyConfig({
                Endpoints,
                Routes: Routes.filter(({Id}) => (!isEndpoints ? Id !== deleteId : true))
            })
        }
    })

    const onDeleteAll = useMemoizedFn(() => {
        saveProxyConfig({
            Endpoints: isEndpoints ? [] : Endpoints,
            Routes: !isEndpoints ? [] : Routes
        })
    })

    const renderEndPointsTable = useMemoizedFn(() => {
        return (
            <Table
                columns={[
                    {
                        title: t("ProxyConfig.proxy_address"),
                        dataIndex: "Url",
                    },
                    {
                        title: t("ProxyConfig.username"),
                        dataIndex: "UserName",
                        width: 400
                    },
                    {
                        title: t("ProxyConfig.password"),
                        dataIndex: "Password",
                        width: 400,
                        render: (password) => <PasswordDisplay password={password} />
                    },
                    {
                        title: t("ProxyConfig.operation"),
                        width: 100,
                        dataIndex: "action",
                        render: (_, record) => (
                            <>
                                <YakitButton
                                    icon={<OutlineTrashIcon className={styles["icon-trash"]} />}
                                    type='text2'
                                    onClick={() => onDelete(record.Id)}
                                />
                                <Divider type='vertical' style={{margin: "0 12px"}} />
                                <YakitButton
                                    icon={<OutlinePencilaltIcon />}
                                    type='text2'
                                    onClick={() => onEdit(record)}
                                />
                            </>
                        )
                    }
                ]}
                bordered
                size='small'
                dataSource={Endpoints}
                pagination={{
                    showTotal: (i) => t("ProxyConfig.recordPointsCount", {i}),
                    total: Endpoints.length
                }}
                rowKey='Id'
            />
        )
    })

    const renderRoutesTable = useMemoizedFn(() => {
        return (
            <Table
                columns={[
                    {
                        title: t("ProxyConfig.rule_group_name"),
                        dataIndex: "Name",
                        width: 300
                    },
                    {
                        title: t("ProxyConfig.target_address"),
                        dataIndex: "Patterns",
                        render: (Patterns = []) => (
                            <div style={{display: "flex", flexDirection: "column", maxHeight: 100, overflow: "scroll"}}>
                                {Patterns.map((pattern, index) => (
                                    <div key={index}>{pattern}</div>
                                ))}
                            </div>
                        )
                    },
                    {
                        title: t("ProxyConfig.proxy_address"),
                        dataIndex: "EndpointIds",
                        render: (EndpointIds) => (
                            <div style={{display: "flex", flexDirection: "column", maxHeight: 100, overflow: "scroll"}}>
                                {EndpointIds.map((id) => {
                                    const url = Endpoints.find(({Id}) => Id === id)?.Url
                                    return url ? <div key={id}>{url}</div> : null
                                })}
                            </div>
                        )
                    },
                    {
                        title: t("ProxyConfig.operation"),
                        width: 100,
                        dataIndex: "action",
                        render: (_, record) => (
                            <>
                                <YakitButton
                                    icon={<OutlineTrashIcon className={styles["icon-trash"]} />}
                                    type='text2'
                                    onClick={() => onDelete(record.Id)}
                                />
                                <Divider type='vertical' style={{margin: "0 12px"}} />
                                <YakitButton
                                    icon={<OutlinePencilaltIcon />}
                                    type='text2'
                                    onClick={() => onEdit(record)}
                                />
                            </>
                        )
                    }
                ]}
                bordered
                size='small'
                dataSource={Routes}
                pagination={{
                    showTotal: (i) => t("ProxyConfig.recordRoutesCount", {i}),
                    total: Routes.length
                }}
                rowKey='Id'
            />
        )
    })

    const renderContent = useMemoizedFn(() => {
        return (
            <div style={{flex: 1, padding: 20}}>
                <div style={{textAlign: "right", marginBottom: 12}}>
                    {!isEndpoints && (
                        <YakitPopconfirm
                            title={t("ProxyConfig.confirm_delete_all")}
                            onConfirm={onDeleteAll}
                            placement='bottomRight'
                            disabled={!(isEndpoints ? Endpoints : Routes).length}
                        >
                            <YakitButton
                                type='outline1'
                                colors='danger'
                                disabled={!(isEndpoints ? Endpoints : Routes).length}
                            >
                                {t("ProxyConfig.clear_all")}
                            </YakitButton>
                        </YakitPopconfirm>
                    )}
                    {!isEndpoints && !Endpoints.length ? (
                        <Tooltip title={t("ProxyConfig.disable_add_new_route")}>
                            <span>
                                <YakitButton type='primary' style={{marginLeft: "8px"}} disabled>
                                    {t(`ProxyConfig.add_new_route`)}
                                </YakitButton>
                            </span>
                        </Tooltip>
                    ) : (
                        <YakitButton type='primary' style={{marginLeft: "8px"}} onClick={() => setModalVisible(true)}>
                            {t(`ProxyConfig.${isEndpoints ? "add_new_point" : "add_new_route"}`)}
                        </YakitButton>
                    )}
                </div>
                {isEndpoints ? renderEndPointsTable() : renderRoutesTable()}
            </div>
        )
    })

    return (
        <YakitDrawer
            visible={visible}
            placement='bottom'
            onClose={onClose}
            height='70%'
            title={
                <div className={styles["textarea-header"]}>
                    <span className={styles["header-title"]}>{t("AgentConfigModal.proxy_configuration")}</span>
                    {!hideRules && (
                        <Tooltip title={t("ProxyConfig.tip")}>
                            <OutlineQuestionmarkcircleIcon className={styles["header-hint-icon"]} />
                        </Tooltip>
                    )}
                </div>
            }
            maskClosable={false}
            className={styles["proxy-rules-config-overlay"]}
        >
            {hideRules ? (
                renderContent()
            ) : (
                <YakitSideTab
                    yakitTabs={tab}
                    activeKey={activeKey}
                    onActiveKey={setActiveKey}
                    btnItemClassName={styles["config-tab-item"]}
                >
                    {renderContent()}
                </YakitSideTab>
            )}
            <YakitModal
                title={t(`ProxyConfig.${editId ? "edit_rule" : "add_rule"}`)}
                visible={modalVisible}
                onOk={handleOk}
                maskClosable={false}
                onCancel={handleCancel}
                okText={t("YakitButton.save")}
                cancelText={t("YakitButton.cancel")}
                className={styles["proxy-rules-config-modal"]}
            >
                <Form form={form} layout={"horizontal"} labelCol={{span: 6}} wrapperCol={{span: 18}}>
                    {isEndpoints ? (
                        <>
                            <Form.Item
                                label={t("ProxyConfig.proxy_address_label")}
                                name='Url'
                                rules={[
                                    {required: true, message: t("ProxyConfig.please_enter_proxy_address")},
                                    {
                                        pattern: /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//,
                                        message: t("ProxyConfig.valid_proxy_address_tip")
                                    }
                                ]}
                            >
                                <YakitInput placeholder={t("ProxyConfig.example_proxy_address")} disabled={!!editId} />
                            </Form.Item>

                            <Form.Item label={t("AgentConfigModal.username")} name='UserName'>
                                <YakitInput placeholder={t("AgentConfigModal.please_enter_username")} />
                            </Form.Item>

                            <Form.Item label={t("AgentConfigModal.password")} name='Password'>
                                <YakitInput placeholder={t("AgentConfigModal.please_enter_password")} />
                            </Form.Item>
                        </>
                    ) : (
                        <>
                            <Form.Item
                                label={t("ProxyConfig.rule_group_name_label")}
                                name='Name'
                                rules={[{required: true, message: t("ProxyConfig.please_enter_rule_group_name")}]}
                            >
                                <YakitInput placeholder={t("ProxyConfig.please_enter_rule_group_name")} />
                            </Form.Item>

                            <Form.Item
                                label={
                                    <>
                                        {t("ProxyConfig.destination_address")}
                                        <Tooltip title={t("ProxyConfig.address_tip")}>
                                            <OutlineQuestionmarkcircleIcon className={styles["header-hint-icon"]} />
                                        </Tooltip>
                                    </>
                                }
                                name='Patterns'
                                rules={[{required: true, message: t("ProxyConfig.please_enter_destination_address")}]}
                            >
                                <YakitSelect
                                    mode='tags'
                                    placeholder={t("ProxyConfig.destination_address_placeholder")}
                                />
                            </Form.Item>

                            <Form.Item
                                label={t("ProxyConfig.proxy_address_label")}
                                name='EndpointIds'
                                rules={[{required: true, message: t("ProxyConfig.please_enter_proxy_address")}]}
                            >
                                <YakitSelect
                                    options={Endpoints.map(({Url, Id}) => ({label: Url, value: Id}))}
                                    placeholder={t("ProxyConfig.example_proxy_address")}
                                    mode='multiple'
                                />
                            </Form.Item>
                        </>
                    )}
                </Form>
            </YakitModal>
        </YakitDrawer>
    )
}

export default ProxyRulesConfig
