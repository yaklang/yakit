import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {useMemoizedFn} from "ahooks"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {OutlinePlusIcon} from "@/assets/newIcon"
import {Divider, Modal, Table} from "antd"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {OutlinePencilaltIcon, OutlineTrashIcon, OutlineXIcon} from "@/assets/icon/outline"
import {EditingObjProps} from "@/pages/payloadManager/PayloadLocalTable"
import {yakitNotify} from "@/utils/notification"
import {AgentConfigModal, GenerateURLResponse, initAgentConfigModalParams} from "./MITMServerStartForm"
import {v4 as uuidv4} from "uuid"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {RemoteMitmGV} from "@/enums/mitm"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import styles from "./ConfigureProxyAuthentication.module.scss"

const {ipcRenderer} = window.require("electron")

type EditableTableProps = Parameters<typeof Table>[0]
type ColumnTypes = Exclude<EditableTableProps["columns"], undefined>
interface DownstreamAgent {
    Id: string
    Address: string
    Scheme: string
    Username: string
    Password: string
    UrlLable: string
    Url: string
}

interface ConfigureProxyAuthenticationProps {
    visible: boolean
    onSetVisible: React.Dispatch<React.SetStateAction<boolean>>
}
const ConfigureProxyAuthentication: React.FC<ConfigureProxyAuthenticationProps> = memo((props) => {
    const {visible, onSetVisible} = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "mitm"])
    const [data, setData] = useState<DownstreamAgent[]>([])
    const [current, setCurrent] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const handleTableChange = (pagination: any) => {
        setCurrent(pagination.current)
        setPageSize(pagination.pageSize)
    }

    useEffect(() => {
        if (visible) {
            getRemoteValue(RemoteMitmGV.MitmConfigureProxyAuthentication).then((res) => {
                if (res) {
                    try {
                        const arr = JSON.parse(res)
                        console.log(arr)
                        setData(arr)
                    } catch (error) {
                        yakitNotify("error", error + "")
                    }
                } else {
                    setData([])
                }
            })
        }
    }, [visible])

    const handleJudgeModify = useMemoizedFn(async () => {
        try {
            // 是否有修改
            let isModify: boolean = false
            const res = await getRemoteValue(RemoteMitmGV.MitmConfigureProxyAuthentication)
            if (res) {
                if (res !== JSON.stringify(data)) {
                    isModify = true
                }
            } else if (data.length) {
                isModify = true
            }
            return isModify
        } catch (error) {
            yakitNotify("error", `${error}`)
            return null
        }
    })

    const onClose = useMemoizedFn(async () => {
        const result = await handleJudgeModify()
        if (result == null) return

        if (result) {
            Modal.confirm({
                title: t("YakitModal.friendlyReminder"),
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存配置代理认证并关闭弹框？",
                okText: t("YakitButton.save"),
                cancelText: t("YakitButton.doNotSave"),
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <OutlineXIcon />
                    </div>
                ),
                onOk: onSave,
                onCancel: () => onSetVisible(false),
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            onSetVisible(false)
        }
    })

    const onSave = useMemoizedFn(() => {
        setRemoteValue(RemoteMitmGV.MitmConfigureProxyAuthentication, JSON.stringify(data))
        onSetVisible(false)
        yakitNotify("success", "保存成功")
    })

    const defaultColumns: (ColumnTypes[number] & {
        editable?: boolean
        editType?: "input" | "input.Password" | "select"
        placeholder?: string
        options?: {label: string; value: string}[]
        dataIndex: string
    })[] = [
        {
            title: "代理地址",
            dataIndex: "Address",
            editable: true,
            editType: "input",
            placeholder: "例如：127.0.0.1:7890",
            ellipsis: true,
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text}
                </div>
            )
        },
        {
            title: "协议",
            dataIndex: "Scheme",
            editable: true,
            editType: "select",
            options: ["http", "https", "socks4", "socks4a", "socks5"].map((item) => ({
                value: item,
                label: item
            })),
            ellipsis: true,
            width: "10%",
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text}
                </div>
            )
        },
        {
            title: "用户名",
            dataIndex: "Username",
            editable: true,
            editType: "input",
            width: "15%",
            ellipsis: true,
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text}
                </div>
            )
        },
        {
            title: "密码",
            dataIndex: "Password",
            editable: true,
            editType: "input.Password",
            width: "15%",
            ellipsis: true,
            render: (text) => (
                <div
                    className={classNames(styles["basic"], "yakit-content-single-ellipsis")}
                    style={{overflow: "hidden"}}
                >
                    {text ? "***" : ""}
                </div>
            )
        },
        {
            title: "操作",
            dataIndex: "operation",
            width: 88,
            // @ts-ignore
            render: (_, record: DownstreamAgent) => {
                return (
                    <div className={styles["table-operation"]}>
                        <OutlineTrashIcon
                            className={styles["delete"]}
                            onClick={() => {
                                setData((prev) => prev.filter((item) => item.Id !== record.Id))
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 12, margin: "0px 12px"}} />
                        <OutlinePencilaltIcon
                            className={styles["edit"]}
                            onClick={() => {
                                setEditInfo({
                                    Id: record.Id,
                                    Address: record.Address,
                                    Scheme: record.Scheme,
                                    Username: record.Username,
                                    Password: record.Password
                                })
                                setAgentConfigModalVisible(true)
                            }}
                        />
                    </div>
                )
            }
        }
    ]
    // 编辑
    const [editingObj, setEditingObj] = useState<EditingObjProps>()
    const isEditing = (record: DownstreamAgent, dataIndex) =>
        record.Id === editingObj?.Id && dataIndex === editingObj?.dataIndex
    // 单击边框
    const [selectObj, setSelectObj] = useState<EditingObjProps>()
    const isSelect = (record: DownstreamAgent, dataIndex) =>
        record.Id === selectObj?.Id && dataIndex === selectObj?.dataIndex

    const handleSave = (row: DownstreamAgent, newRow: DownstreamAgent) => {
        setEditingObj(undefined)
        if (!newRow.Address.length) {
            yakitNotify("warning", "代理地址不能为空")
            return
        }

        if (
            !/^((([a-z\d]([a-z\d-]*[a-z\d])*)\.)*[a-z]([a-z\d-]*[a-z\d])?|(?:\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(
                newRow.Address.trim()
            )
        ) {
            yakitNotify("warning", "代理地址格式不正确")
            return
        }

        if (newRow.Address)
            if (
                row.Address !== newRow.Address ||
                row.Scheme !== newRow.Scheme ||
                row.Username !== newRow.Username ||
                row.Password !== newRow.Password
            ) {
                const {Scheme, Username, Password} = newRow
                const address = newRow.Address.trim().split(":") || []
                const params = {
                    Scheme,
                    Username,
                    Password,
                    Host: address[0] || "",
                    Port: address[1] || ""
                }
                if (params.Port === "0") {
                    if (params.Scheme === "http") {
                        params.Port = "80"
                    } else if (params.Scheme === "https") {
                        params.Port = "443"
                    } else {
                        params.Port = "1080"
                    }
                }

                ipcRenderer
                    .invoke("mitm-agent-hijacking-config", params)
                    .then((res: GenerateURLResponse) => {
                        setData((prev) => {
                            return prev.map((item) => {
                                if (item.Id === row.Id) {
                                    return {...newRow, Url: res.URL}
                                } else {
                                    return item
                                }
                            })
                        })
                    })
                    .catch((err) => {
                        yakitNotify("error", err + "")
                    })
            }
    }

    const callCountRef = useRef<number>(0)
    const handleRowClick = (record, column) => {
        if (record.Id === editingObj?.Id && column.dataIndex === editingObj?.dataIndex) {
            return
        }
        if (record.Id !== editingObj?.Id || column.dataIndex !== editingObj?.dataIndex) {
            setEditingObj(undefined)
            setSelectObj(undefined)
        }
        callCountRef.current += 1
        if (callCountRef.current >= 2) {
            callCountRef.current = 0 // 重置计数器
            setEditingObj({Id: record.Id, dataIndex: column.dataIndex})
        } else if (callCountRef.current === 1) {
            // 这里开启一个定时器，若在300ms内没有第二次点击，则重置计数器
            setTimeout(() => {
                callCountRef.current = 0
            }, 300)
            setSelectObj({Id: record.Id, dataIndex: column.dataIndex})
        }
    }

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return {
                ...col,
                onCell: (record: DownstreamAgent) => ({
                    onClick: () => setSelectObj(undefined)
                })
            }
        }
        return {
            ...col,
            onCell: (record: DownstreamAgent) => ({
                record,
                editType: col.editType,
                placeholder: col.placeholder,
                options: col.options,
                editable: col.editable,
                dataIndex: col.dataIndex,
                editing: isEditing(record, col.dataIndex),
                selected: isSelect(record, col.dataIndex),
                handleSave,
                onClick: () => handleRowClick(record, col)
            })
        }
    })

    const [agentConfigModalVisible, setAgentConfigModalVisible] = useState<boolean>(false)
    const [editInfo, setEditInfo, getEditInfo] = useGetSetState<Omit<DownstreamAgent, "Url" | "UrlLable">>()
    const initParams = useMemo(() => {
        if (editInfo) {
            const obj = {...editInfo}
            // @ts-ignore
            delete obj.Id
            return obj
        } else {
            return initAgentConfigModalParams
        }
    }, [editInfo])

    const generateURL = useMemoizedFn((url, params) => {
        setData((prev) => {
            const urlLable = url.replace(/(\/\/[^\/:@]+):[^@]+@/g, "$1:***@")
            const index = prev.findIndex((item) => item.Url === url)
            if (index !== -1) {
                yakitNotify("info", "下游代理已存在")
            } else {
                if (params?.Address) {
                    const Id = getEditInfo()?.Id
                    if (Id) {
                        const index2 = prev.findIndex((item) => item.Id === Id)
                        if (index2 !== -1) {
                            prev[index2] = {
                                ...params,
                                Id,
                                Address: params.Address!,
                                Url: url,
                                UrlLable: urlLable
                            }
                            return prev.slice()
                        }
                    } else {
                        return [
                            ...prev,
                            {...params, Id: uuidv4(), Address: params.Address!, Url: url, UrlLable: urlLable}
                        ]
                    }
                }
            }
            return prev
        })
    })

    return (
        <YakitDrawer
            className={styles["ConfigureProxyAuthentication"]}
            visible={visible}
            width='40%'
            title={
                <div className={styles["ConfigureProxyAuthentication-title"]}>
                    <div className={styles["ConfigureProxyAuthentication-title-text"]}>配置代理认证</div>
                    <div className={styles["ConfigureProxyAuthentication-title-btns"]}>
                        <YakitButton type='outline2' onClick={onClose}>
                            {t("YakitButton.cancel")}
                        </YakitButton>
                        <YakitButton type='primary' onClick={onSave}>
                            {t("YakitButton.save")}
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
            onClose={onClose}
        >
            <div className={styles["ConfigureProxyAuthentication-table"]}>
                <div className={styles["ConfigureProxyAuthentication-table-header"]}>
                    <div className={styles["header-body"]}>
                        <div className={styles["header-title"]}>下游代理</div>
                        <div className={styles["header-extra"]}>
                            <YakitButton
                                type='outline2'
                                onClick={() => {
                                    setData([])
                                }}
                            >
                                清空
                            </YakitButton>
                            <YakitButton
                                type='primary'
                                icon={<OutlinePlusIcon />}
                                onClick={() => {
                                    setEditInfo(undefined)
                                    setAgentConfigModalVisible(true)
                                }}
                            >
                                新增
                            </YakitButton>
                            <AgentConfigModal
                                agentConfigModalVisible={agentConfigModalVisible}
                                initParams={initParams}
                                onCloseModal={() => {
                                    setAgentConfigModalVisible(false)
                                }}
                                generateURL={generateURL}
                            ></AgentConfigModal>
                        </div>
                    </div>
                </div>
                <div className={styles["ConfigureProxyAuthentication-table-body"]}>
                    <Table
                        rowKey={(i: DownstreamAgent) => i.Id}
                        components={{
                            body: {
                                cell: (props) => <EditableCell<DownstreamAgent> {...props} />
                            }
                        }}
                        bordered
                        size='small'
                        dataSource={data}
                        // @ts-ignore
                        columns={columns as ColumnTypes}
                        pagination={{
                            current,
                            pageSize,
                            total: data.length,
                            pageSizeOptions: ["2", "5", "10", "20"],
                            showSizeChanger: true,
                            size: "small",
                            showTotal: (total) => `共 ${total} 条记录`
                        }}
                        onChange={handleTableChange}
                    />
                </div>
            </div>
        </YakitDrawer>
    )
})

export default ConfigureProxyAuthentication

interface EditableCellProps<T> {
    editType: "input" | "input.Password" | "select"
    placeholder: string
    options: {label: string; value: string}[]
    editing: boolean
    editable: boolean
    selected: boolean
    children: React.ReactNode
    dataIndex: keyof T
    record: T
    handleSave: (record: T, newRecord: T) => void
}
const EditableCell = <T,>({
    editType,
    placeholder,
    options,
    editing,
    editable,
    selected,
    children,
    dataIndex,
    record,
    handleSave,
    ...restProps
}: EditableCellProps<T>) => {
    const [value, setValue] = useState<string>("")

    useEffect(() => {
        if (editable && editing) {
            setValue(record[dataIndex as string])
        }
    }, [])

    const save = useMemoizedFn(async () => {
        try {
            handleSave(record, {...record, [dataIndex]: value})
        } catch (errInfo) {
            console.log("Save failed:", errInfo)
        }
    })

    return (
        <td
            {...restProps}
            style={{position: "relative", padding: editable && editing ? 0 : 8}}
            className={classNames({
                [styles["td-active-border"]]: selected
            })}
        >
            {editable && editing ? (
                <div style={{width: "100%"}}>
                    {editType === "input" && (
                        <YakitInput
                            style={{
                                resize: "none",
                                fontSize: "12px",
                                padding: "7px 15px",
                                lineHeight: "16px",
                                borderRadius: 0
                            }}
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                            onPressEnter={save}
                            onBlur={save}
                        />
                    )}

                    {editType === "input.Password" && (
                        <YakitInput.Password
                            style={{
                                resize: "none",
                                fontSize: "12px",
                                padding: "7px 15px",
                                lineHeight: "16px",
                                borderRadius: 0
                            }}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                            onPressEnter={save}
                            onBlur={save}
                        />
                    )}

                    {editType === "select" && (
                        <YakitSelect
                            wrapperClassName={styles["editableCell-select"]}
                            options={options}
                            value={value}
                            onChange={(value) => {
                                setValue(value)
                            }}
                            defaultOpen
                            onDropdownVisibleChange={(open) => {
                                if (!open) {
                                    setTimeout(() => {
                                        save()
                                    }, 100)
                                }
                            }}
                        />
                    )}
                </div>
            ) : (
                <>{children}</>
            )}
        </td>
    )
}
