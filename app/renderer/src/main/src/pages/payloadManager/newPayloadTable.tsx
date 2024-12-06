import React, {useContext, useEffect, useMemo, useRef, useState} from "react"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./newPayloadTable.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import type {InputRef} from "antd"
import {Divider, Form, Space, Table, Tooltip} from "antd"
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
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
const {ipcRenderer} = window.require("electron")

interface EditableCellProps {
    editing: boolean
    editable: boolean
    selected: boolean
    children: React.ReactNode
    dataIndex: keyof Payload
    record: Payload
    handleSave: (record: Payload, newRecord: Payload) => void
}

const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    editable,
    selected,
    children,
    dataIndex,
    record,
    handleSave,
    ...restProps
}) => {
    const [value, setValue] = useState<string>("")

    useEffect(() => {
        if (editable && editing) {
            setValue(record[dataIndex as string])
        }
    }, [])

    const save = async () => {
        try {
            handleSave(record, {...record, [dataIndex]: value})
        } catch (errInfo) {
            console.log("Save failed:", errInfo)
        }
    }

    return (
        <td
            {...restProps}
            style={{position: "relative"}}
            className={classNames({
                [styles["td-active-border"]]: selected
            })}
        >
            {editable && editing && (
                <div style={{position: "absolute", top: 0, left: 0, height: "100%", width: "100%", overflow: "hidden"}}>
                    <YakitInput.TextArea
                        wrapperStyle={{height: "100%"}}
                        style={{
                            height: "100%",
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
                </div>
            )}
            {children}
        </td>
    )
}

// 判断是否为大于等于0的数字
const judgeNum = (num) => {
    try {
        let newNum: number = parseInt(num)
        return typeof newNum === "number" && newNum >= 0
    } catch (error) {
        return false
    }
}
interface PayloadAddEditFormProps {
    onClose: () => void
    record: Payload
    onUpdatePayload: (updatePayload: UpdatePayloadProps) => Promise<unknown>
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
        if (editParams.Content.length > 0 && judgeNum(editParams.HitCount)) {
            const result = await onUpdatePayload({Id: record.Id, Data: {...record, ...editParams}})
            if (result) {
                onClose()
            }
        }
        if (editParams.Content.length === 0) {
            warn("字典内容不可为空")
        }
        if (!judgeNum(editParams.HitCount)) {
            warn("字典次数内容不合规")
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
                        size='large'
                        onClick={() => {
                            onClose()
                        }}
                        type='outline2'
                    >
                        取消
                    </YakitButton>
                    <YakitButton size='large' type='primary' htmlType={"submit"} onClick={onFinish}>
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

export interface EditingObjProps {
    // 操作的行id
    Id: number
    // 操作的列
    dataIndex: string
}

export interface NewPayloadTableProps {
    onCopyToOtherPayload?: (v: number) => void
    onMoveToOtherPayload?: (v: number) => void
    selectPayloadArr: number[]
    setSelectPayloadArr: (v: number[]) => void
    onDeletePayload?: (v: DeletePayloadProps) => void
    onQueryPayload: (page?: number, limit?: number) => void
    pagination?: PaginationSchema
    params: QueryPayloadParams
    setParams: (v: QueryPayloadParams) => void
    response: QueryGeneralResponse<Payload> | undefined
    setResponse: (v: QueryGeneralResponse<Payload>) => void
    onlyInsert?: boolean
}
export const NewPayloadTable: React.FC<NewPayloadTableProps> = (props) => {
    const {
        onCopyToOtherPayload,
        onMoveToOtherPayload,
        selectPayloadArr,
        setSelectPayloadArr,
        onDeletePayload,
        onQueryPayload,
        pagination,
        params,
        response,
        setResponse,
        setParams,
        onlyInsert
    } = props
    // 编辑
    const [editingObj, setEditingObj] = useState<EditingObjProps>()
    // 单击边框
    const [selectObj, setSelectObj] = useState<EditingObjProps>()

    const [sortStatus, setSortStatus] = useState<"desc" | "asc">()

    const handleSort = useMemoizedFn((v: "desc" | "asc") => {
        if (sortStatus === v) {
            setSortStatus(undefined)
            setParams({...params, Pagination: {...params.Pagination, Order: "asc", OrderBy: "id"}})
        } else {
            setSortStatus(v)
            setParams({...params, Pagination: {...params.Pagination, Order: v, OrderBy: "hit_count"}})
        }
        setTimeout(() => {
            onQueryPayload()
        }, 100)
    })

    const defaultColumns: (ColumnTypes[number] & {editable?: boolean; dataIndex: string})[] = [
        {
            title: () => (
                <div className={styles["order"]}>
                    {(response?.Data || []).length > 0 && (
                        <YakitCheckbox
                            indeterminate={
                                selectPayloadArr.length > 0 && selectPayloadArr.length !== response?.Data.length
                            }
                            checked={selectPayloadArr.length === response?.Data.length}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectPayloadArr((response?.Data || []).map((item) => item.Id))
                                } else {
                                    setSelectPayloadArr([])
                                }
                            }}
                        />
                    )}
                    序号
                </div>
            ),
            dataIndex: "index",
            width: 88,
            render: (text, record, index) => {
                const limit = pagination?.Limit || params.Pagination.Limit
                const page = (pagination?.Page || params.Pagination.Page) - 1
                const order: number = limit * page + index + 1
                const {Id} = record as Payload
                return (
                    <div className={styles["order"]}>
                        <YakitCheckbox
                            checked={selectPayloadArr.includes(Id)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectPayloadArr([...selectPayloadArr, Id])
                                } else {
                                    const newDeletePayloadArr = selectPayloadArr.filter((item) => item !== Id)
                                    setSelectPayloadArr([...newDeletePayloadArr])
                                }
                            }}
                        />

                        <div className={styles["basic"]}>{order < 10 ? `0${order}` : `${order}`}</div>
                    </div>
                )
            }
        },
        {
            title: "字典内容",
            dataIndex: "Content",
            editable: true,
            render: (text) => (
                <div className={styles["basic"]} style={{wordBreak: "break-all", wordWrap: "break-word"}}>
                    {text}
                </div>
            )
        },
        {
            title: () => <Tooltip title={"新增命中次数字段，命中次数越高，在爆破时优先级也会越高"}>命中次数</Tooltip>,
            dataIndex: "HitCount",
            width: 102,
            editable: true,
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
                        <OutlineTrashIcon
                            className={styles["delete"]}
                            onClick={() => {
                                onDeletePayload && onDeletePayload({Id: record.Id})
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 12, margin: "0px 12px"}} />
                        <OutlinePencilaltIcon
                            className={styles["edit"]}
                            onClick={() => {
                                const m = showYakitModal({
                                    title: "编辑",
                                    width: 448,
                                    type: "white",
                                    footer: null,
                                    maskClosable: false,
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

    const InsertColumns: ColumnTypes[number][] = [
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
                        {!onlyInsert && (
                            <YakitCheckbox
                                checked={selectPayloadArr.includes(Id)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectPayloadArr([...selectPayloadArr, Id])
                                    } else {
                                        const newDeletePayloadArr = selectPayloadArr.filter((item) => item !== Id)
                                        setSelectPayloadArr([...newDeletePayloadArr])
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
        }
    ]

    const onUpdatePayload = useMemoizedFn((updatePayload: UpdatePayloadProps) => {
        return new Promise((resolve, reject) => {
            ipcRenderer
                .invoke("UpdatePayload", updatePayload)
                .then(() => {
                    success(`修改成功`)
                    resolve(true)
                })
                .catch((e: any) => {
                    resolve(false)
                    if (e.toString().includes("UNIQUE constraint failed: payloads.hash")) {
                        warn("已有相同字典内容，请修改后再保存")
                        return
                    }
                    failed("更新失败：" + e)
                })
                .finally(() => {
                    onQueryPayload(pagination?.Page, pagination?.Limit)
                })
        })
    })

    const handleSave = (row: Payload, newRow: Payload) => {
        setEditingObj(undefined)
        // 此处默认修改成功 优化交互闪烁(因此如若修改失败则会闪回)
        if (response?.Data && newRow.Content.length !== 0 && judgeNum(newRow.HitCount)) {
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
        if (
            (row.Content !== newRow.Content || row.HitCount !== newRow.HitCount) &&
            newRow.Content.length !== 0 &&
            judgeNum(newRow.HitCount)
        ) {
            onUpdatePayload({Id: row.Id, Data: {...newRow}})
        }
        if (newRow.Content.length === 0) {
            warn("字典内容不可为空")
        }
        if (!judgeNum(newRow.HitCount)) {
            warn("字典次数内容不合规")
        }
    }

    const isEditing = (record: Payload, dataIndex) =>
        record.Id === editingObj?.Id && dataIndex === editingObj?.dataIndex

    const isSelect = (record: Payload, dataIndex) => record.Id === selectObj?.Id && dataIndex === selectObj?.dataIndex

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return {
                ...col,
                onCell: (record: Payload) => ({
                    onClick: () => setSelectObj(undefined)
                })
            }
        }
        return {
            ...col,
            onCell: (record: Payload) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                editing: isEditing(record, col.dataIndex),
                selected: isSelect(record, col.dataIndex),
                handleSave,
                onClick: () => handleRowClick(record, col),
                // onDoubleClick: () => handleRowDoubleClick(record, col),
                onContextMenu: (e) => {
                    e.preventDefault()
                    handleRowRightClick(record, col)
                }
            })
        }
    })

    const callCountRef = useRef<number>(0)
    const handleMethod = (record, column) => {
        if (callCountRef.current === 1) {
            // console.log("Single click:", record, column)
            setSelectObj({Id: record.Id, dataIndex: column.dataIndex})
        } else if (callCountRef.current >= 2) {
            // console.log("Double click:", record, column)
            setEditingObj({Id: record.Id, dataIndex: column.dataIndex})
        }
        callCountRef.current = 0 // 重置计数器
    }
    const handleRowClick = (record, column) => {
        if (record.Id === editingObj?.Id && column.dataIndex === editingObj?.dataIndex) {
            return
        }
        if (record.Id !== editingObj?.Id || column.dataIndex !== editingObj?.dataIndex) {
            setEditingObj(undefined)
            setSelectObj(undefined)
        }
        callCountRef.current += 1
        setTimeout(() => handleMethod(record, column), 200)
    }

    const handleRowDoubleClick = (record, column) => {}

    const handleRowRightClick = (record, column) => {
        // console.log("Right click:", record, column)
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
                        setSelectObj(undefined)
                        setEditingObj({Id: record.Id, dataIndex: column.dataIndex})
                        return
                    case "copy":
                        onCopyToOtherPayload && onCopyToOtherPayload(record.Id)
                        return
                    case "move":
                        onMoveToOtherPayload && onMoveToOtherPayload(record.Id)
                        return
                    case "delete":
                        onDeletePayload && onDeletePayload({Id: record.Id})
                        return
                }
            }
        })
    }

    return (
        <div className={styles["new-payload-table"]}>
            <Table
                rowKey={(i:Payload) => i.Id}
                components={onlyInsert?undefined:{
                    body: {
                        cell: (props) => <EditableCell {...props} />
                    }
                }}
                bordered
                dataSource={response?.Data}
                // @ts-ignore
                columns={onlyInsert ? InsertColumns : (columns as ColumnTypes)}
                pagination={{
                    showQuickJumper: true,
                    current: parseInt(`${pagination?.Page || 1}`),
                    pageSize: parseInt(`${pagination?.Limit || 10}`), // 每页显示的条目数量
                    total: response?.Total || 0,
                    pageSizeOptions: ["10", "20", "30", "40"], // 指定每页显示条目数量的选项
                    showSizeChanger: true, // 是否显示切换每页条目数量的控件
                    showTotal: (i) => <span className={styles["show-total"]}>共{i}条记录</span>,
                    onChange: (page: number, limit?: number) => {
                        setSelectPayloadArr([])
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
