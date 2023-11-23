import React, {useContext, useEffect, useRef, useState} from "react"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./newPayloadTable.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import type {InputRef} from "antd"
import {Divider, Form, Popconfirm, Space, Table, Tooltip} from "antd"
import type {FormInstance} from "antd/es/form"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {
    OutlineArrowdownIcon,
    OutlineArrowupIcon,
    OutlinePencilaltIcon,
    OutlineSelectorIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../invoker/schema"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
const {ipcRenderer} = window.require("electron")

interface EditableCellProps {
    editing: boolean
    editable: boolean
    children: React.ReactNode
    dataIndex: keyof Payload
    record: Payload
    handleSave: (record: Payload, newRecord: Payload) => void
}

const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    editable,
    children,
    dataIndex,
    record,
    handleSave,
    ...restProps
}) => {
    const [value, setValue] = useState<string>("")

    useEffect(() => {
        if (editable && editing) {
            setValue(record.Content)
        }
    }, [])

    const save = async () => {
        try {
            handleSave(record, {...record, [dataIndex]: value})
        } catch (errInfo) {
            console.log("Save failed:", errInfo)
        }
    }

    // if (editable && editing) {
    //     return (
    //         <YakitInput
    //             // style={cellHeightRef.current?{height:cellHeightRef.current}:{}}
    //             value={value}
    //             onChange={(e) => setValue(e.target.value)}
    //             autoFocus
    //             onPressEnter={save}
    //             onBlur={save}
    //         />
    //     )
    // }

    return (
        <td {...restProps} style={{position: "relative"}}>
            {editable && editing && (
                <div style={{position: "absolute", top: 0, left: 0, height: "100%", width: "100%", overflow: "hidden"}}>
                    <YakitInput.TextArea
                        style={{height: "100%"}}
                        textAreaStyle={{
                            height: "100%",
                            resize: "none",
                            fontSize: "12px",
                            padding: "7px 15px",
                            lineHeight: "16px"
                        }}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                        onPressEnter={save}
                        onBlur={save}
                    />
                </div>
            )}
            {children}
        </td>
    )
}

interface PayloadAddEditFormProps {
    onClose: () => void
    record?: Payload
    onUpdatePayload?: (updatePayload: UpdatePayloadProps) => Promise<unknown>
}

interface EditParamsProps {
    Content: string
    HitCount: number
}

export const PayloadAddEditForm: React.FC<PayloadAddEditFormProps> = (props) => {
    const {onClose, record, onUpdatePayload} = props
    const [form] = Form.useForm()
    const [editParams, setEditParams] = useState<EditParamsProps>({
        Content: "",
        HitCount: 0
    })

    useEffect(() => {
        if (record) {
            setEditParams({
                Content: record.Content,
                HitCount: record.HitCount
            })
        }
    }, [])

    const onFinish = useMemoizedFn(async () => {
        // 编辑
        if (record && onUpdatePayload) {
            const result = await onUpdatePayload({Id: record.Id, Data: {...record, ...editParams}})
            if (result) {
                onClose()
            }
        }
        // 新增
        else {
        }
    })

    return (
        <div className={styles["payload-edit-form"]}>
            <Form layout='vertical' form={form}>
                <Form.Item
                    label={
                        <div className={styles["name"]}>
                            字典内容<span className={styles["must"]}>*</span>:
                        </div>
                    }
                >
                    <YakitInput.TextArea
                        rows={3}
                        allowClear
                        size='small'
                        value={editParams.Content}
                        onChange={(e) => {
                            const {value} = e.target
                            setEditParams({...editParams, Content: value})
                        }}
                        placeholder='请输入字典内容...'
                    />
                </Form.Item>
                <Form.Item
                    label={
                        <div className={styles["name"]}>
                            命中次数<span className={styles["must"]}></span>:
                        </div>
                    }
                >
                    <YakitInputNumber
                        // size='small'
                        style={{width: "100%"}}
                        value={editParams.HitCount}
                        placeholder='请输入命中次数...'
                        onChange={(value) => {
                            setEditParams({...editParams, HitCount: value as number})
                        }}
                    />
                </Form.Item>
                <div className={styles["opt-btn"]}>
                    <YakitButton
                        onClick={() => {
                            onClose()
                        }}
                        type='outline2'
                    >
                        取消
                    </YakitButton>
                    <YakitButton type='primary' htmlType={"submit"} onClick={onFinish}>
                        保存
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
}

type EditableTableProps = Parameters<typeof Table>[0]

type ColumnTypes = Exclude<EditableTableProps["columns"], undefined>

export interface QueryPayloadParams extends QueryGeneralRequest {
    Folder: string
    Group: string
    Keyword: string
}

export interface Payload {
    Content: string
    ContentBytes: Uint8Array
    Group: string
    HitCount: number
    Id: number
    IsFile: boolean
}

export interface UpdatePayloadProps {
    Id: number
    Data: Payload
}

export interface DeletePayloadProps {
    Id?: number
    Ids?: number[]
}

export interface NewPayloadTableProps {
    deletePayloadArr?: number[]
    setDeletePayloadArr?: (v: number[]) => void
    onDeletePayload?: (v: DeletePayloadProps) => void
    onQueryPayload: (page?: number, limit?: number) => void
    pagination?: PaginationSchema
    params: QueryPayloadParams
    setParams: (v: QueryPayloadParams) => void
    response: QueryGeneralResponse<Payload> | undefined
    setResponse: (v: QueryGeneralResponse<Payload>) => void
}
export const NewPayloadTable: React.FC<NewPayloadTableProps> = (props) => {
    const {
        deletePayloadArr,
        setDeletePayloadArr,
        onDeletePayload,
        onQueryPayload,
        pagination,
        params,
        response,
        setResponse,
        setParams
    } = props
    const [editingKey, setEditingKey] = useState<number>()

    const [sortStatus, setSortStatus] = useState<"desc" | "asc">()
    useEffect(() => {
        onQueryPayload()
    }, [])

    const handleSort = useMemoizedFn((v: "desc" | "asc") => {
        if (sortStatus === v) {
            setSortStatus(undefined)
            setParams({...params, Pagination: {...params.Pagination, Order: "asc", OrderBy: "id"}})
        } else {
            setSortStatus(v)
            setParams({...params, Pagination: {...params.Pagination, Order: v, OrderBy: "hit_count"}})
        }
        onQueryPayload()
    })

    const defaultColumns: (ColumnTypes[number] & {editable?: boolean; dataIndex: string})[] = [
        {
            title: "序号",
            dataIndex: "index",
            width: 88,
            render: (text, record, index) => {
                const limit = pagination?.Limit || params.Pagination.Limit
                const page = (pagination?.Page || params.Pagination.Page) - 1
                const order: number = limit * page + index + 1
                const {Id} = record as Payload
                return (
                    <div className={styles["order"]}>
                        {deletePayloadArr && (
                            <YakitCheckbox
                                checked={deletePayloadArr.includes(Id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setDeletePayloadArr && setDeletePayloadArr([...deletePayloadArr, Id])
                                    } else {
                                        const newDeletePayloadArr = deletePayloadArr.filter((item) => item !== Id)
                                        setDeletePayloadArr && setDeletePayloadArr([...newDeletePayloadArr])
                                    }
                                }}
                            />
                        )}
                        <div className={styles["basic"]}>{order < 10 ? `0${order}` : `${order}`}</div>
                    </div>
                )
            }
        },
        {
            title: "字典内容",
            dataIndex: "Content",
            editable: true,
            render: (text) => <div className={styles["basic"]}>{text}</div>
        },
        {
            title: () => <Tooltip title={"新增命中次数字段，命中次数越高，在爆破时优先级也会越高"}>命中次数</Tooltip>,
            dataIndex: "HitCount",
            width: 102,
            filterIcon: (filtered) => (
                <OutlineSelectorIcon
                    className={classNames(styles["selector-icon"], {
                        [styles["active-selector-icon"]]: sortStatus !== undefined
                    })}
                />
            ),
            filterDropdown: ({setSelectedKeys, selectedKeys, confirm, clearFilters}) => (
                <div className={styles["filter-box"]}>
                    <div
                        className={classNames(styles["filter-item"], {
                            [styles["active-filter-item"]]: sortStatus === "asc",
                            [styles["hover-filter-item"]]: sortStatus !== "asc"
                        })}
                        onClick={() => handleSort("asc")}
                    >
                        <div className={styles["icon"]}>
                            <OutlineArrowupIcon />
                        </div>
                        <div className={styles["content"]}>升序</div>
                    </div>
                    <div
                        className={classNames(styles["filter-item"], {
                            [styles["active-filter-item"]]: sortStatus === "desc",
                            [styles["hover-filter-item"]]: sortStatus !== "desc"
                        })}
                        onClick={() => handleSort("desc")}
                    >
                        <div className={styles["icon"]}>
                            <OutlineArrowdownIcon />
                        </div>
                        <div className={styles["content"]}>降序</div>
                    </div>
                </div>
            ),
            render: (text) => <div className={styles["basic"]}>{text}</div>
        },
        {
            title: "操作",
            dataIndex: "operation",
            width: 88,
            // @ts-ignore
            render: (_, record: Payload) => {
                return (
                    <div className={styles["table-operation"]}>
                        <YakitPopconfirm
                            title='确认删除?'
                            placement='left'
                            onConfirm={() => {
                                onDeletePayload && onDeletePayload({Id: record.Id})
                            }}
                        >
                            <OutlineTrashIcon className={styles["delete"]} />
                        </YakitPopconfirm>
                        <Divider type='vertical' style={{top: 1, height: 12, margin: "0px 12px"}} />
                        <OutlinePencilaltIcon
                            className={styles["edit"]}
                            onClick={() => {
                                const m = showYakitModal({
                                    title: "编辑",
                                    width: 448,
                                    type: "white",
                                    footer: null,
                                    content: (
                                        <PayloadAddEditForm
                                            record={record}
                                            onUpdatePayload={onUpdatePayload}
                                            onClose={() => m.destroy()}
                                        />
                                    )
                                })
                            }}
                        />
                    </div>
                )
            }
        }
    ]

    const onUpdatePayload = useMemoizedFn((updatePayload: UpdatePayloadProps) => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("UpdatePayload", updatePayload)
                .then(() => {
                    onQueryPayload(pagination?.Page, pagination?.Limit)
                    success("修改成功")
                    resolve(true)
                })
                .catch((e: any) => {
                    failed("更新失败：" + e)
                    resolve(false)
                })
        })
    })

    const handleSave = (row: Payload, newRow: Payload) => {
        console.log("555", row, newRow)
        setEditingKey(undefined)
        // 此处默认修改成功 优化交互闪烁(因此如若修改失败则会闪回)
        if (response?.Data) {
            const newData = response?.Data.map((item) => {
                if (item.Id === row.Id) {
                    return newRow
                } else {
                    return item
                }
            })
            response.Data = newData
            setResponse(response)
        }
        // 真正的更改与更新数据
        if (row.Content !== newRow.Content) {
            onUpdatePayload({Id: row.Id, Data: {...newRow}})
        }
    }

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return col
        }
        return {
            ...col,
            onCell: (record: Payload) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                editing: isEditing(record),
                handleSave
            })
        }
    })

    const isEditing = (record: Payload) => record.Id === editingKey

    const handleRowClick = (record, index) => {
        console.log("Single click:", record, index)
    }

    const handleRowDoubleClick = (record, index) => {
        console.log("Double click:", record, index)
        setEditingKey(record.Id)
    }

    const handleRowRightClick = (record, index) => {
        console.log("Right click:", record, index)
        showByRightContext({
            data: [
                {label: "编辑", key: "edit"},
                {label: "备份到其他字典", key: "copy"},
                {label: "移动到其他字典", key: "move"},
                {label: "删除", key: "delete"}
            ],
            onClick: (e) => {
                switch (e.key) {
                    case "edit":
                        setEditingKey(record.Id)
                        return
                    case "copy":
                        return
                    case "move":
                        return
                    case "delete":
                        onDeletePayload && onDeletePayload({Id: record.Id})
                        return
                }
            }
        })
    }

    const getRowProps = (record, index) => ({
        // onClick: () => handleRowClick(record, index),
        onDoubleClick: () => handleRowDoubleClick(record, index),
        onContextMenu: (e) => {
            e.preventDefault()
            handleRowRightClick(record, index)
        }
    })

    return (
        <div className={styles["new-payload-table"]}>
            <Table
                components={{
                    body: {
                        cell: (props) => <EditableCell {...props} />
                    }
                }}
                rowClassName={() => "editable-row"}
                bordered
                dataSource={response?.Data}
                columns={columns as ColumnTypes}
                onRow={getRowProps}
                pagination={{
                    showQuickJumper: true,
                    pageSize: pagination?.Limit || 10, // 每页显示的条目数量
                    total: response?.Total || 0,
                    pageSizeOptions: ["10", "20", "30", "40"], // 指定每页显示条目数量的选项
                    showSizeChanger: true, // 是否显示切换每页条目数量的控件
                    showTotal: (i) => <span className={styles["show-total"]}>共{i}条记录</span>,
                    onChange: (page: number, limit?: number) => {
                        onQueryPayload(page, limit)
                    },
                    onShowSizeChange: (old, limit) => {
                        onQueryPayload(1, limit)
                    },
                    size: "small"
                }}
            />
        </div>
    )
}
