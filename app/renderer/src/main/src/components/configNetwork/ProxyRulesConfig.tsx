import React, {memo, useEffect, useMemo, useState} from "react"
import {Tooltip, Form, Divider, Table, Modal} from "antd"
import {
    OutlinePencilaltIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTrashIcon,
    OutlineEyeoffIcon,
    OutlineEyeIcon,
    OutlineBanIcon,
    OutlineEngineIcon
} from "@/assets/icon/outline"
import {SolidCheckCircleIcon, SolidExclamationIcon, SolidXcircleIcon} from "@/assets/icon/solid"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
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
import {checkProxyVersion, isValidUrlWithProtocol} from "@/utils/proxyConfigUtil"
import classNames from "classnames"
const {ipcRenderer} = window.require("electron")

const generateEndpointId = () => `ep-${randomString(8)}`
const generateRouteId = () => `route-${randomString(8)}`
const PasswordDisplay: React.FC<{
    password?: string
}> = ({password}) => {
    const [visible, setVisible] = useState(false)
    if (!password) return <></>
    return (
        <span style={{display: "flex", justifyContent: "space-between"}}>
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
    hideRules?: boolean
}

const ProxyRulesConfig = (props: ProxyRulesConfigProps) => {
    const {visible, hideRules = false, onClose} = props
    const {proxyConfig: { Endpoints, Routes }, saveProxyConfig} = useProxy()
    const [form] = Form.useForm()
    const [modalVisible, setModalVisible] = useState(false)
    const [activeKey, setActiveKey] = useState("point")
    const [editId, setEditId] = useState<string | null>(null)
    const {t, i18n} = useI18nNamespaces(["yakitUi", "mitm", "payload"])
    const tab = [
        {value: "point", label: t("ProxyConfig.Points")},
        {value: "route", label: t("ProxyConfig.Routes")}
    ]
    const isEndpoints = useMemo(() => activeKey === "point", [activeKey])

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

    const onToggleDisable = useMemoizedFn((toggleId: string) => {
        if (isEndpoints) {
            const handleToggleDisable = () =>
                saveProxyConfig({
                    Endpoints: Endpoints.map((item) =>
                        item.Id === toggleId ? {...item, Disabled: !item.Disabled} : item
                    ),
                    Routes
                })

            const relatedRoutes = Routes.filter(({EndpointIds = []}) => EndpointIds.includes(toggleId))
            if (relatedRoutes.length === 0) {
                handleToggleDisable()
                return
            }
            Modal.confirm({
                title: t("ProxyConfig.disable_point_title"),
                content: t("ProxyConfig.disable_point_tips", {i: relatedRoutes.length}),
                okText: t("YakitButton.disable"),
                cancelText: t("YakitButton.cancel"),
                centered: true,
                onOk: () => handleToggleDisable(),
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            saveProxyConfig({
                Endpoints,
                Routes: Routes.map((item) => (item.Id === toggleId ? {...item, Disabled: !item.Disabled} : item))
            })
        }
    })

    const renderEndPointsTable = useMemoizedFn(() => {
        return (
            <Table
                columns={[
                    {
                        title: t("ProxyConfig.proxy_address"),
                        dataIndex: "Url"
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
                        width: 200,
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
                                <Divider type='vertical' style={{margin: "0 12px"}} />
                                <ProxyTest proxy={[record.Id]} showIcon btnDisabled={record.Disabled}/>
                                <Divider type='vertical' style={{margin: "0 12px"}} />
                                <YakitButton
                                    icon={
                                        <OutlineBanIcon className={record.Disabled ? styles["icon-ban-active"] : ""} />
                                    }
                                    type='text2'
                                    onClick={() => onToggleDisable(record.Id)}
                                />
                            </>
                        )
                    }
                ]}
                bordered
                size='small'
                dataSource={Endpoints}
                rowClassName={({Disabled}) => (Disabled ? styles["row-disabled"] : "")}
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
                            <div style={{display: "flex", flexDirection: "column", maxHeight: 100, overflow: "auto"}}>
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
                            <div style={{display: "flex", flexDirection: "column", maxHeight: 100, overflow: "auto"}}>
                                {EndpointIds.map((id) => {
                                    const {Url, Disabled} = Endpoints.find(({Id}) => Id === id) || {}
                                    return Url ? (
                                        <div key={id}>
                                            {Url}{" "}
                                            {Disabled ? (
                                                <span className={styles["disabled-badge"]}>
                                                    {t("ProxyConfig.disabled")}
                                                </span>
                                            ) : null}
                                        </div>
                                    ) : null
                                })}
                            </div>
                        )
                    },
                    {
                        title: t("ProxyConfig.operation"),
                        width: 150,
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
                                <Divider type='vertical' style={{margin: "0 12px"}} />
                                <YakitButton
                                    icon={
                                        <OutlineBanIcon className={record.Disabled ? styles["icon-ban-active"] : ""} />
                                    }
                                    type='text2'
                                    onClick={() => onToggleDisable(record.Id)}
                                />
                            </>
                        )
                    }
                ]}
                bordered
                size='small'
                dataSource={Routes}
                rowClassName={({Disabled}) => (Disabled ? styles["row-disabled"] : "")}
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
                    show={true}
                    setShow={() => {}}
                    yakitTabs={tab}
                    activeKey={activeKey}
                    onActiveKey={setActiveKey}
                    btnItemClassName={styles["config-tab-item"]}
                >
                    {renderContent()}
                </YakitSideTab>
            )}
            <YakitModal
                title={t(
                    isEndpoints
                        ? `ProxyConfig.${editId ? "edit_point" : "add_point"}`
                        : `ProxyConfig.${editId ? "edit_rule" : "add_rule"}`
                )}
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
                                    {
                                        validator: (_, value) => {
                                            if (!!value && isValidUrlWithProtocol(value)) {
                                                return Promise.resolve()
                                            }
                                            return Promise.reject(new Error(t("ProxyConfig.valid_proxy_address_tip")))
                                        }
                                    }
                                ]}
                            >
                                <YakitInput placeholder={t("ProxyConfig.example_proxy_address")}/>
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

interface ProxyTestProps {
    proxy?: string[];
    showIcon?: boolean; 
    onEchoNode?: (proxy: string[]) => void, 
    btnDisabled?: boolean
}

export const ProxyTest = memo(
    (props: ProxyTestProps) => {
        const {proxy = [], showIcon = false, onEchoNode, btnDisabled = false} = props
        const [visible, setVisible] = useState(false)
        const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
        const [errorMsg, setErrorMsg] = useState("")
        const [form] = Form.useForm()
        const { proxyConfig: {Endpoints = []} } = useProxy()
        const {t} = useI18nNamespaces(["yakitUi", "mitm", "payload"])

        const onShowModal = useMemoizedFn(async () => {
            try {
                const versionValid = await checkProxyVersion()
                if (!versionValid) {
                    return
                }
                setVisible(true)
                setStatus("idle")
                form.setFieldsValue({Target: "cip.cc", Proxy: proxy})
            } catch (error) {
                console.error("error:", error)
            }
        })

        const onCancel = useMemoizedFn(() => {
            setVisible(false)
            form.resetFields()
        })

        const handleTest = useMemoizedFn(async () => {
            try {
                const {Target, Proxy} = await form.validateFields()
                setStatus("loading")
                setErrorMsg("")

                const joined = Array.isArray(Proxy) ? Proxy.join(",") : String(Proxy || "")
                const params = Object.assign(
                    {
                        Target
                    },
                    joined.startsWith("ep") ? {EndpointId: joined} : {Proxy: joined}
                )

                const res = await ipcRenderer.invoke("CheckProxyAlive", params)
                if (res.Ok) {
                    //回显节点
                    joined && onEchoNode?.(joined.split(","))
                    setStatus("success")
                    if (!["OK", "oK", "ok"].includes(res.Reason)) {
                        setErrorMsg(res.Reason)
                    }
                } else {
                    setStatus("error")
                    setErrorMsg(res.Reason)
                }
            } catch (e: any) {
                setStatus("error")
                setErrorMsg(e.message)
            }
        })

        const renderContent = () => {
            switch (status) {
                case "idle":
                    return (
                        <YakitButton type='primary' onClick={handleTest}>
                            {t("ProxyConfig.detectionStart")}
                        </YakitButton>
                    )
                case "loading":
                    return (
                        <YakitSpin
                            size='large'
                            tip={t("ProxyConfig.detectionLoading")}
                            wrapperClassName={styles["proxy-test-modal-loading"]}
                        />
                    )
                case "success":
                    return (
                        <>
                            <div className={styles["proxy-test-modal-success"]}>
                                <SolidCheckCircleIcon />
                                <span>{t("ProxyConfig.detectionSuccess")}</span>
                            </div>
                            <YakitButton type='primary' onClick={handleTest}>
                                {t("ProxyConfig.detectionStart")}
                            </YakitButton>
                            {errorMsg ? <div className={styles["proxy-test-modal-detail"]}>{errorMsg}</div> : null}
                        </>
                    )
                case "error":
                    return (
                        <>
                            <div className={styles["proxy-test-modal-detail"]}>
                                <SolidXcircleIcon />
                                {errorMsg}
                            </div>
                            <SolidExclamationIcon className={styles["proxy-test-modal-failed"]} />
                            <YakitButton type='primary' onClick={handleTest}>
                                {t("ProxyConfig.detectionStart")}
                            </YakitButton>
                        </>
                    )
            }
        }

        const disabled = useMemo(() => status === "loading", [status])

        return (
            <>
                {showIcon ? (
                <Tooltip title={t("ProxyConfig.proxyDetection")}>
                    <YakitButton
                        icon={<OutlineEngineIcon />}
                        type='text2'
                        onClick={onShowModal}
                        disabled={btnDisabled}
                    />
                </Tooltip>
            ) : (
                <span
                    onClick={() => !btnDisabled && onShowModal()}
                    className={classNames([styles["proxy-test-title"]], {
                        [styles["proxy-test-title-disabled"]]: btnDisabled
                    })}
                >
                    {t("ProxyConfig.proxyDetection")}
                </span>
            )}
                <YakitModal
                    title={t("ProxyConfig.proxyDetection")}
                    visible={visible}
                    onCancel={onCancel}
                    footer={null}
                    width={600}
                    className={styles["proxy-test-modal"]}
                >
                    <div className={styles["proxy-test-modal-content"]}>
                        <Form form={form} layout={"horizontal"} labelCol={{span: 6}} wrapperCol={{span: 18}}>
                            <Form.Item
                                label={t("ProxyConfig.Points")}
                                name='Proxy'
                                getValueFromEvent={(value) => {
                                    // 只保留最后一个选中的值
                                    if (Array.isArray(value) && value.length > 1) {
                                        return [value[value.length - 1]]
                                    }
                                    return value
                                }}
                                validateTrigger={["onChange", "onBlur"]}
                                rules={[
                                    {
                                        validator: (_, value) => {
                                            if (!value || !Array.isArray(value) || value.length === 0) {
                                                return Promise.resolve()
                                            }
                                            // 获取当前options中的所有值
                                            const existingOptions = Endpoints.map((opt) => opt.Id)
                                            // 只校验新输入的值(不在options中的值)
                                            const newValues = value.filter((v) => !existingOptions.includes(v))
                                            // 校验代理地址格式: 协议://地址:端口
                                            for (const v of newValues) {
                                                if (!isValidUrlWithProtocol(v)) {
                                                    return Promise.reject(t("ProxyConfig.valid_proxy_address_tip"))
                                                }
                                            }
                                            return Promise.resolve()
                                        }
                                    }
                                ]}
                            >
                                <YakitSelect
                                    disabled={disabled}
                                    options={Endpoints.map(({Url, Id}) => ({label: Url, value: Id}))}
                                    mode='tags'
                                    placeholder={t("ProxyConfig.proxy_address_placeholder")}
                                />
                            </Form.Item>

                            <Form.Item
                                label={t("ProxyConfig.customDetectionTarget")}
                                name='Target'
                                rules={[{required: true, message: t("ProxyConfig.customDetectionTargetPlaceholder")}]}
                            >
                                <YakitInput disabled={disabled} />
                            </Form.Item>
                        </Form>
                        <div className={styles["test-modal-content-res"]}>{renderContent()}</div>
                    </div>
                </YakitModal>
            </>
        )
    }
)

export default ProxyRulesConfig
