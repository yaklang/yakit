import React, {useContext, useEffect, useRef, useState} from "react"
import {} from "@ant-design/icons"
import {useGetState, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./newPayloadTable.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import type {InputRef} from "antd"
import {Divider, Popconfirm, Table, Tooltip} from "antd"
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
import {PayloadEditForm} from "./newPayload"
const {ipcRenderer} = window.require("electron")

interface EditableCellProps {
    editing: boolean
    editable: boolean
    children: React.ReactNode
    dataIndex: keyof DataType
    record: DataType
    handleSave: (record: DataType) => void
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
            setValue(record.dictionary)
        }
    }, [])

    const save = async () => {
        try {
            handleSave({...record, [dataIndex]: value})
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

type EditableTableProps = Parameters<typeof Table>[0]

interface DataType {
    key: React.Key
    dictionary: string
    count: number
}

type ColumnTypes = Exclude<EditableTableProps["columns"], undefined>

export interface NewPayloadTableProps {}
export const NewPayloadTable: React.FC<NewPayloadTableProps> = (props) => {
    const [editingKey, setEditingKey] = useState("")
    const [dataSource, setDataSource] = useState<DataType[]>([
        {
            key: "0",
            dictionary: "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 777
        },
        {
            key: "1",
            dictionary:
                "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 888
        },
        {
            key: "2",
            dictionary: "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 777
        },
        {
            key: "3",
            dictionary:
                "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 888
        },
        {
            key: "4",
            dictionary: "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 777
        },
        {
            key: "5",
            dictionary:
                "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 888
        },
        {
            key: "6",
            dictionary: "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 777
        },
        {
            key: "7",
            dictionary:
                "https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pchttps://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=docs_pc",
            count: 888
        }
    ])
    const [sortStatus, setSortStatus] = useState<"desc" | "asc">()

    const handleDelete = (key: React.Key) => {
        const newData = dataSource.filter((item) => item.key !== key)
        setDataSource(newData)
    }

    const handleSort = useMemoizedFn((v: "desc" | "asc") => {
        if (sortStatus === v) {
            setSortStatus(undefined)
        } else {
            setSortStatus(v)
        }
    })

    const defaultColumns: (ColumnTypes[number] & {editable?: boolean; dataIndex: string})[] = [
        {
            title: "序号",
            dataIndex: "index",
            width: 88,
            render: (text, record, index) => (
                <div className={styles["order"]}>
                    <YakitCheckbox
                        // checked={true}
                        onChange={(e) => {
                            // e.target.checked
                        }}
                    />
                    <div className={styles["basic"]}>{index + 1 < 10 ? `0${index + 1}` : `${index + 1}`}</div>
                </div>
            )
        },
        {
            title: "字典内容",
            dataIndex: "dictionary",
            editable: true,
            render: (text) => <div className={styles["basic"]}>{text}</div>
        },
        {
            title: () => <Tooltip title={"新增命中次数字段，命中次数越高，在爆破时优先级也会越高"}>命中次数</Tooltip>,
            dataIndex: "count",
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
            render: (_, record: {key: React.Key}) => {
                return (
                    <div className={styles["table-operation"]}>
                        <YakitPopconfirm title='确认删除?' placement='left' onConfirm={() => handleDelete(record.key)}>
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
                                    onOkText: "保存",
                                    // closable: false,
                                    content: <PayloadEditForm onClose={() => m.destroy()} />
                                })
                            }}
                        />
                    </div>
                )
            }
        }
    ]

    const handleSave = (row: DataType) => {
        console.log("555", row)
        setEditingKey("")
        // const newData = [...dataSource]
        // const index = newData.findIndex((item) => row.key === item.key)
        // const item = newData[index]
        // newData.splice(index, 1, {
        //     ...item,
        //     ...row
        // })
        // setDataSource(newData)
    }

    const columns = defaultColumns.map((col) => {
        if (!col.editable) {
            return col
        }
        return {
            ...col,
            onCell: (record: DataType) => ({
                record,
                editable: col.editable,
                dataIndex: col.dataIndex,
                editing: isEditing(record),
                handleSave
            })
        }
    })

    const isEditing = (record: DataType) => record.key === editingKey

    const handleRowClick = (record, index) => {
        console.log("Single click:", record, index)
    }

    const handleRowDoubleClick = (record, index) => {
        console.log("Double click:", record, index)
        setEditingKey(record.key)
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
                        setEditingKey(record.key)
                        return
                    case "copy":
                        return
                    case "move":
                        return
                    case "delete":
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
                dataSource={dataSource}
                columns={columns as ColumnTypes}
                onRow={getRowProps}
                pagination={{
                    // 覆盖原有样式
                    className: styles[""],
                    showQuickJumper: true,
                    pageSize: 10, // 每页显示的条目数量
                    total: 100,
                    pageSizeOptions: ["10", "20", "30", "40"], // 指定每页显示条目数量的选项
                    showSizeChanger: true, // 是否显示切换每页条目数量的控件
                    showTotal: (i) => <span className={styles["show-total"]}>共{i}条记录</span>,
                    onChange: (page: number, limit?: number) => {
                        // update(page, limit)
                    },
                    onShowSizeChange: (old, limit) => {
                        // update(1, limit)
                    },
                    size: "small"
                }}
            />
        </div>
    )
}
