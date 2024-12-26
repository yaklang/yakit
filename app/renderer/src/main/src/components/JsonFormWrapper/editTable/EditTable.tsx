import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import styles from "./EditTable.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {Form, FormInstance, Input, InputNumber, Table, Tooltip, Typography} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {ArrowsAltOutlined, InfoCircleOutlined, PlusOutlined} from "@ant-design/icons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {v4 as uuidv4} from "uuid"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {DefaultOptionType} from "antd/lib/select"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"

interface Item {
    _id: string
    [key: string]: string
}

type CellTypeProps = "string" | "boolean"

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean
    required: boolean
    type?: CellTypeProps
    selectOption: DefaultOptionType[]
    UiStyle?: UiKeyProps
    dataIndex: string
    title: any
    record: Item
    index: number
    children: React.ReactNode
    form: FormInstance<any>
}

const EditableCell: React.FC<EditableCellProps> = ({
    editing,
    required,
    type,
    selectOption,
    UiStyle,
    dataIndex,
    title,
    record,
    index,
    children,
    form,
    ...restProps
}) => {
    const getNode = useMemoizedFn(() => {
        if (UiStyle && UiStyle?.["ui:widget"]) {
            switch (UiStyle["ui:widget"]) {
                case "textarea":
                    return (
                        <YakitInput
                            className={styles["input-textarea"]}
                            suffix={
                                <ArrowsAltOutlined
                                    onClick={() => {
                                        const str = form.getFieldValue(dataIndex)
                                        let val = form.getFieldValue(dataIndex)
                                        const m = showYakitModal({
                                            title: `编辑 ${title}`,
                                            centered: true,
                                            content: (
                                                <YakitInput.TextArea
                                                    defaultValue={str}
                                                    placeholder={`请输入 ${title}`}
                                                    onChange={(e) => {
                                                        val = e.target.value
                                                    }}
                                                />
                                            ),
                                            bodyStyle: {padding: 24},
                                            onOk: () => {
                                                form.setFieldsValue({
                                                    [dataIndex]: val
                                                })
                                                m.destroy()
                                            }
                                        })
                                    }}
                                />
                            }
                        />
                    )
                default:
                    return <YakitInput />
            }
        } else {
            switch (type) {
                case "string":
                    return selectOption.length > 0 ? <YakitSelect options={selectOption} /> : <YakitInput />
                case "boolean":
                    return <YakitSwitch />
                default:
                    return <YakitInput />
            }
        }
    })

    return (
        <td {...restProps}>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{margin: 0}}
                    rules={[
                        {
                            required,
                            message: `未处理 ${title}!`
                        }
                    ]}
                    valuePropName={type === "boolean" ? "checked" : undefined}
                >
                    {getNode()}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    )
}

interface itemsProps {
    properties: {
        [key: string]: {
            type: CellTypeProps
            title: string
            default?: string
            enum?: string[]
            description?: string
        }
    }
    require: string[]
}

interface UiKeyProps {
    // 目前支持的替换控件
    "ui:widget": "textarea"
    // "ui:grid": string | number
}

interface UiKeysProps {
    [key: string]: UiKeyProps | DefaultObjProps[]
}

interface DefaultObjProps {
    [key: string]: any
}

export interface ColumnSchemaProps {
    minItems?: number
    maxItems?: number
    items: itemsProps
}

export interface UiSchemaTableProps {
    items?: any
    x?: number
    y?: number
}

export interface EditTableProps {
    columnSchema: ColumnSchemaProps
    uiSchema: UiSchemaTableProps
    onChange?: (v: any) => void
    // 默认值
    value?: any
}
export const EditTable: React.FC<EditTableProps> = (props) => {
    const {columnSchema, uiSchema, onChange, value} = props
    const [form] = Form.useForm()
    const [data, setData] = useState<Item[]>([])
    const [cacheData, setCacheData] = useState<Item[]>([])
    const [editingId, setEditingId] = useState<string>("")
    const [columns, setColumns] = useState<any[]>([])
    const [requireList, setRequireList] = useState<string[]>([])
    const [maxItems, setMaxItems] = useState<number>()
    const [uiKeys, setUiKeys] = useState<UiKeysProps>()
    const [defaultObj, setDefaultObj] = useState<DefaultObjProps>({})
    useEffect(() => {
        try {
            // columnSchema
            const {minItems, maxItems = 50, items} = columnSchema
            const {require, properties} = items
            const newColumns: any[] = []
            const newData: any[] = []
            const defObj: DefaultObjProps = {}
            // uiSchema
            const newUiKeys = uiSchema?.items as UiKeysProps
            const newGrid = (newUiKeys?.["ui:grid"] || []) as DefaultObjProps[]
            let widthObj = {}
            newGrid.forEach((item) => {
                widthObj = {...widthObj, ...item}
            })
            Object.keys(properties).forEach((key) => {
                const {type, title, description} = properties[key]
                newColumns.push({
                    title: description ? (
                        <div>
                            <span style={{marginRight: 4}}>{title || key}</span>
                            <Tooltip title={description}>
                                <InfoCircleOutlined />
                            </Tooltip>
                        </div>
                    ) : (
                        title || key
                    ),
                    dataIndex: key,
                    editable: true,
                    type,
                    enum: properties[key]?.enum,
                    render: (text) => {
                        if (type === "boolean") {
                            return <YakitSwitch checked={text} />
                        }
                        if (newUiKeys?.[key]?.["ui:widget"] === "textarea") {
                            return (
                                <Tooltip title={text}>
                                    <div
                                        style={{overflow: "hidden"}}
                                        className={classNames("yakit-content-single-ellipsis")}
                                    >
                                        {text}
                                    </div>
                                </Tooltip>
                            )
                        }
                        return (
                            <div style={{overflow: "hidden"}} className={classNames("yakit-content-single-ellipsis")}>
                                {text || "-"}
                            </div>
                        )
                    },
                    width: widthObj?.[key]
                })

                newData.push({
                    _id: uuidv4()
                })
                // 默认值赋值
                if (properties[key]?.default) {
                    defObj[key] = properties[key]?.default
                }
            })
            setDefaultObj(defObj)
            setUiKeys(newUiKeys)
            setRequireList(require)
            setColumns([...newColumns])
            setMaxItems(maxItems)
        } catch (error) {
            failed(`解析表格失败:${error}`)
        }
    }, [columnSchema, uiSchema])

    const isEditing = useMemoizedFn((rowItem: Item) => rowItem._id === editingId)

    const onEdit = useMemoizedFn((record: Partial<Item> & {_id: React.Key}) => {
        form.setFieldsValue({...record})
        setEditingId(record._id)
    })

    const onCancel = useMemoizedFn(() => {
        setEditingId("")
        setCacheData([])
    })

    const onDelete = useMemoizedFn((record: Item) => {
        const newData = [...data].filter((item) => item._id !== record._id)
        setData(newData)
        onSubmit(newData)
        if (record._id === editingId) {
            setEditingId("")
        }
    })

    // 数据提交
    const onSubmit = useMemoizedFn((arr: Item[]) => {
        const data = arr.map(({_id, ...obj}) => obj)
        onChange && onChange(data)
    })

    const onSave = useMemoizedFn((record: Item) => {
        return new Promise(async (resolve, reject) => {
            try {
                const row = (await form.validateFields()) as Item
                console.log("111")
                const newData = [...data]
                const index = newData.findIndex((item) => record._id === item._id)
                // 修改
                if (index > -1) {
                    const item = newData[index]
                    newData.splice(index, 1, {
                        ...item,
                        ...row
                    })
                    setData(newData)
                    setEditingId("")
                    onSubmit(newData)
                }
                // 新增
                else if (cacheData.length > 0 && record._id === cacheData[0]._id) {
                    newData.push({...cacheData[0], ...row})
                    setCacheData([])
                    setData(newData)
                    setEditingId("")
                    onSubmit(newData)
                }
                resolve(null)
            } catch (errInfo) {
                console.log("Validate Failed:", errInfo)
                reject()
            }
        })
    })

    const addCell = useMemoizedFn(async () => {
        if (typeof maxItems === "number" && data.length >= maxItems) {
            warn(`已达最大数量${maxItems}`)
            return
        }
        if (cacheData.length !== 0) {
            await onSave(cacheData[0])
        }
        form.resetFields()
        if (Object.keys(defaultObj).length !== 0) {
            form.setFieldsValue({...defaultObj})
        }
        const _id = uuidv4()
        setCacheData([{_id}])
        setEditingId(_id)
    })

    const realData = useMemo(() => {
        return [...data, ...cacheData]
    }, [data, cacheData])

    const realColumns = useMemo(() => {
        return [
            ...columns,
            {
                title: "操作",
                dataIndex: "operation",
                width: 150,
                fixed: "right",
                render: (_: any, record: Item) => {
                    const editable = isEditing(record)
                    return editable ? (
                        <div className={styles["operation"]}>
                            <YakitButton type='text' size='small' onClick={() => onSave(record)}>
                                保存
                            </YakitButton>
                            <YakitButton type='text' size='small' onClick={onCancel}>
                                取消
                            </YakitButton>
                            {Object.keys(record).length > 1 && (
                                <YakitButton danger type='text' size='small' onClick={() => onDelete(record)}>
                                    删除
                                </YakitButton>
                            )}
                        </div>
                    ) : (
                        <div className={styles["operation"]}>
                            <YakitButton
                                size='small'
                                type='text'
                                disabled={editingId !== ""}
                                onClick={() => onEdit(record)}
                            >
                                编辑
                            </YakitButton>
                            <YakitButton danger type='text' size='small' onClick={() => onDelete(record)}>
                                删除
                            </YakitButton>
                        </div>
                    )
                }
            }
        ]
    }, [columns, editingId])

    const mergedColumns = realColumns.map((col) => {
        if (!col.editable) {
            return col
        }
        return {
            ...col,
            onCell: (record: Item) => ({
                record,
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record),
                required: requireList.includes(col.dataIndex),
                type: col.type,
                selectOption: (col.enum || []).map((item) => ({label: item, value: item})),
                UiStyle: uiKeys?.[col.dataIndex],
                form
            })
        }
    })

    return (
        <Form form={form} component={false}>
            <Table
                className={classNames({
                    [styles["edit-table"]]: realData.length === 0
                })}
                components={{
                    body: {
                        cell: EditableCell
                    }
                }}
                dataSource={realData}
                columns={mergedColumns}
                pagination={false}
                scroll={{x: uiSchema?.x || "max-content", y: uiSchema?.y}}
            />
            <YakitButton
                onClick={addCell}
                size='large'
                style={{width: "100%", marginTop: 12}}
                icon={<PlusOutlined />}
                type='outline1'
            >
                添加一行数据
            </YakitButton>
        </Form>
    )
}
