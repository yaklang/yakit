import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import styles from "../PayloadLocalTable.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {Divider, Form, Space, Table, Tooltip} from "antd"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"
import {
    OutlineArrowdownIcon,
    OutlineArrowupIcon,
    OutlineDocumentduplicateIcon,
    OutlinePencilaltIcon,
    OutlineSelectorIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {PaginationSchema, QueryGeneralRequest, QueryGeneralResponse} from "../../invoker/schema"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {setClipboardText} from "@/utils/clipboard"
import {API} from "@/services/swagger/resposeType"
import {apiUpdateOnlinePayload} from "../utils"
const {ipcRenderer} = window.require("electron")

interface EditableCellProps {
    editing: boolean
    editable: boolean
    selected: boolean
    children: React.ReactNode
    dataIndex: keyof API.PayloadDetail
    record: API.PayloadDetail
    handleSave: (record: API.PayloadDetail, newRecord: API.PayloadDetail) => void
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
        } catch (errInfo) {}
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
    record: API.PayloadDetail
    onUpdatePayload: (updatePayload: API.UpdatePayloadRequest) => Promise<unknown>
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
                Content: record.content,
                HitCount: record.hitCount
            })
        }
    }, [])

    const onFinish = useMemoizedFn(async () => {
        if (editParams.Content.length > 0 && judgeNum(editParams.HitCount)) {
            const result = await onUpdatePayload({
                id: record.id,
                content: editParams.Content,
                hitCount: editParams.HitCount
            })
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

export interface DeleteOnlinePayloadProps {
    ids?: number[]
}

export interface EditingObjProps {
    // 操作的行id
    id: number
    // 操作的列
    dataIndex: string
}

export interface NewPayloadOnlineTableProps {
    selectPayloadArr: number[]
    setSelectPayloadArr: (v: number[]) => void
    onDeletePayload?: (v: DeleteOnlinePayloadProps) => void
    onQueryPayload: (page?: number, limit?: number) => void
    pagination?: API.PageMeta
    params: API.PayloadRequest
    setParams: (v: API.PayloadRequest) => void
    response: API.PayloadResponse | undefined
    setResponse: (v: API.PayloadResponse) => void
}
export const NewPayloadOnlineTable: React.FC<NewPayloadOnlineTableProps> = (props) => {
    const {
        selectPayloadArr,
        setSelectPayloadArr,
        onDeletePayload,
        onQueryPayload,
        pagination,
        params,
        response,
        setResponse,
        setParams
    } = props
    // 编辑
    const [editingObj, setEditingObj] = useState<EditingObjProps>()
    // 单击边框
    const [selectObj, setSelectObj] = useState<EditingObjProps>()

    const [sortStatus, setSortStatus] = useState<"desc" | "asc">()

    const handleSort = useMemoizedFn((v: "desc" | "asc") => {
        if (sortStatus === v) {
            setSortStatus(undefined)
            setParams({...params,  order: "asc", order_by: "id"})
        } else {
            setSortStatus(v)
            setParams({...params,  order: v, order_by: "hit_count"})
        }
        setTimeout(() => {
            onQueryPayload()
        }, 100)
    })

    const defaultColumns: (ColumnTypes[number] & {editable?: boolean; dataIndex: string})[] = [
        {
            title: () => (
                <div className={styles["order"]}>
                    {(response?.data || []).length > 0 && (
                        <YakitCheckbox
                            indeterminate={
                                selectPayloadArr.length > 0 && selectPayloadArr.length !== response?.data.length
                            }
                            checked={selectPayloadArr.length === response?.data.length}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectPayloadArr((response?.data || []).map((item) => item.id))
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
                const limit = pagination?.limit || params.limit
                const page = (pagination?.page || params.page) - 1
                const order: number = limit * page + index + 1
                const {id} = record as API.PayloadDetail
                return (
                    <div className={styles["order"]}>
                        <YakitCheckbox
                            checked={selectPayloadArr.includes(id)}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectPayloadArr([...selectPayloadArr, id])
                                } else {
                                    const newDeletePayloadArr = selectPayloadArr.filter((item) => item !== id)
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
            dataIndex: "content",
            editable: true,
            render: (text) => (
                <div
                    className={styles["basic"]}
                    style={{wordBreak: "break-all", wordWrap: "break-word", whiteSpace: "pre-wrap"}}
                >
                    {text}
                </div>
            )
        },
        {
            title: () => <Tooltip title={"新增命中次数字段，命中次数越高，在爆破时优先级也会越高"}>命中次数</Tooltip>,
            dataIndex: "hitCount",
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
            width: 132,
            // @ts-ignore
            render: (_, record: API.PayloadDetail) => {
                return (
                    <div className={styles["table-operation"]}>
                        <OutlineDocumentduplicateIcon
                            className={styles["copy"]}
                            onClick={() => {
                                setClipboardText(record.content)
                            }}
                        />
                        <Divider type='vertical' style={{top: 1, height: 12, margin: "0px 12px"}} />
                        <OutlineTrashIcon
                            className={styles["delete"]}
                            onClick={() => {
                                onDeletePayload && onDeletePayload({ids: [record.id]})
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

    const onUpdatePayload = useMemoizedFn((updatePayload: API.UpdatePayloadRequest) => {
        return new Promise((resolve, reject) => {
            apiUpdateOnlinePayload(updatePayload)
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
                    onQueryPayload(pagination?.page, pagination?.limit)
                })

            // ipcRenderer
            //     .invoke("UpdatePayload", updatePayload)
            //     .then(() => {
            //         success(`修改成功`)
            //         resolve(true)
            //     })
            //     .catch((e: any) => {
            //         resolve(false)
            //         if (e.toString().includes("UNIQUE constraint failed: payloads.hash")) {
            //             warn("已有相同字典内容，请修改后再保存")
            //             return
            //         }
            //         failed("更新失败：" + e)
            //     })
            //     .finally(() => {
            //         onQueryPayload(pagination?.page, pagination?.limit)
            //     })
        })
    })

    const handleSave = (row: API.PayloadDetail, newRow: API.PayloadDetail) => {
        setEditingObj(undefined)
        // 此处默认修改成功 优化交互闪烁(因此如若修改失败则会闪回)
        if (response?.data && newRow.content.length !== 0 && judgeNum(newRow.hitCount)) {
            const newData = response?.data.map((item) => {
                if (item.id === row.id) {
                    return newRow
                } else {
                    return item
                }
            })
            response.data = newData
            setResponse(response)
        }
        // 真正的更改与更新数据
        if (
            (row.content !== newRow.content || row.hitCount !== newRow.hitCount) &&
            newRow.content.length !== 0 &&
            judgeNum(newRow.hitCount)
        ) {
            onUpdatePayload({id: row.id, content: newRow.content, hitCount: newRow.hitCount})
        }
        if (newRow.content.length === 0) {
            warn("字典内容不可为空")
        }
        if (!judgeNum(newRow.hitCount)) {
            warn("字典次数内容不合规")
        }
    }

    const isEditing = (record: API.PayloadDetail, dataIndex) =>
        record.id === editingObj?.id && dataIndex === editingObj?.dataIndex

    const isSelect = (record: API.PayloadDetail, dataIndex) =>
        record.id === selectObj?.id && dataIndex === selectObj?.dataIndex

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return {
                ...col,
                onCell: (record: API.PayloadDetail) => ({
                    onClick: () => setSelectObj(undefined)
                })
            }
        }
        return {
            ...col,
            onCell: (record: API.PayloadDetail) => ({
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
    const handleRowClick = (record: API.PayloadDetail, column) => {
        if (record.id === editingObj?.id && column.dataIndex === editingObj?.dataIndex) {
            return
        }
        if (record.id !== editingObj?.id || column.dataIndex !== editingObj?.dataIndex) {
            setEditingObj(undefined)
            setSelectObj(undefined)
        }
        callCountRef.current += 1
        if (callCountRef.current >= 2) {
            callCountRef.current = 0 // 重置计数器
            setEditingObj({id: record.id, dataIndex: column.dataIndex})
        } else if (callCountRef.current === 1) {
            // 这里开启一个定时器，若在300ms内没有第二次点击，则重置计数器
            setTimeout(() => {
                callCountRef.current = 0
            }, 300)
            setSelectObj({id: record.id, dataIndex: column.dataIndex})
        }
    }

    const handleRowRightClick = (record, column) => {
        // console.log("Right click:", record, column)
        showByRightContext({
            data: [
                {label: "编辑", key: "edit"},
                {label: "删除", key: "delete"}
            ],
            onClick: (e) => {
                switch (e.key) {
                    case "edit":
                        setSelectObj(undefined)
                        setEditingObj({id: record.id, dataIndex: column.dataIndex})
                        return
                    case "delete":
                        onDeletePayload && onDeletePayload({ids: [record.id]})
                        return
                }
            }
        })
    }

    return (
        <div className={styles["new-payload-table"]}>
            <Table
                rowKey={(i: API.PayloadDetail) => i.id}
                components={{
                    body: {
                        cell: (props) => <EditableCell {...props} />
                    }
                }}
                bordered
                dataSource={response?.data}
                // @ts-ignore
                columns={columns as ColumnTypes}
                pagination={{
                    showQuickJumper: true,
                    current: parseInt(`${pagination?.page || 1}`),
                    pageSize: parseInt(`${pagination?.limit || 10}`), // 每页显示的条目数量
                    total: response?.pagemeta.total || 0,
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
