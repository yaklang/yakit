import React, {useEffect, useMemo, useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import styles from "./EditTable.module.scss"
import {failed, warn} from "@/utils/notification"
import classNames from "classnames"
import {Form, FormInstance, Table, Tooltip} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {EllipsisOutlined, InfoCircleOutlined, PlusOutlined} from "@ant-design/icons"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {v4 as uuidv4} from "uuid"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {DefaultOptionType} from "antd/lib/select"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {showByRightContext} from "@/components/yakitUI/YakitMenu/showByRightContext"

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
    setFoucusFun: (v: boolean) => void
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
    setFoucusFun,
    ...restProps
}) => {
    const onFocus = useMemoizedFn(() => {
        setFoucusFun(true)
    })

    const getNode = useMemoizedFn(() => {
        if (UiStyle && UiStyle?.["ui:widget"]) {
            switch (UiStyle["ui:widget"]) {
                case "textarea":
                    return (
                        <YakitInput.TextArea
                            className={styles["input-textarea"]}
                            rows={3}
                            placeholder={`请输入 ${typeof title === "object" ? "该字段" : title}`}
                            onFocus={onFocus}
                        />
                    )
                default:
                    return <YakitInput onFocus={onFocus} />
            }
        } else {
            switch (type) {
                case "string":
                    return selectOption.length > 0 ? (
                        <YakitSelect options={selectOption} onFocus={onFocus} />
                    ) : (
                        <YakitInput onFocus={onFocus} />
                    )
                case "boolean":
                    return <YakitSwitch onClick={onFocus} />
                default:
                    return <YakitInput onFocus={onFocus} />
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
                            message: `请填写${typeof title === "object" ? "该字段" : title}`
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

interface PropertiesProps {
    [key: string]: {
        type: CellTypeProps
        title: string
        default?: string
        enum?: string[]
        description?: string
    }
}

interface itemsProps {
    properties: PropertiesProps
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

    // 默认数据注入
    useEffect(() => {
        if (Array.isArray(value) && value.length > 0) {
            const newData = value.map((item) => ({...item, _id: uuidv4()}))
            setData(newData)
        }
    }, [])

    // 初始化表格数据
    useEffect(() => {
        try {
            // 在 EditTable 保存时，检测并“剥掉多余的嵌套层”：
            if (columnSchema?.items?.properties?.properties) {
                columnSchema.items.properties = columnSchema.items.properties.properties as unknown as PropertiesProps
            }
            // columnSchema
            const {minItems, maxItems = 50, items} = columnSchema
            const {require = [], properties} = items
            const newColumns: any[] = []
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
                        <div style={{fontSize: 12}}>
                            <span style={{marginRight: 4}}>{title || key}</span>
                            <Tooltip title={description}>
                                <InfoCircleOutlined />
                            </Tooltip>
                        </div>
                    ) : (
                        <div style={{fontSize: 12}}>{title || key}</div>
                    ),
                    dataIndex: key,
                    editable: true,
                    type,
                    enum: properties[key]?.enum,
                    render: (text) => {
                        if (type === "boolean") {
                            return <YakitSwitch checked={text} disabled />
                        }
                        if (newUiKeys?.[key]?.["ui:widget"] === "textarea") {
                            return (
                                <Tooltip title={text}>
                                    <div
                                        // scroll为max-content时将会根据内容自适应宽度 为减轻后端写入x轴压力（默认不写） 因此传入widthObj
                                        style={{overflow: "hidden", fontSize: 12, maxWidth: widthObj?.[key]}}
                                        className={classNames("yakit-content-single-ellipsis")}
                                    >
                                        {text}
                                    </div>
                                </Tooltip>
                            )
                        }
                        return (
                            <div
                                style={{overflow: "hidden", fontSize: 12, maxWidth: widthObj?.[key]}}
                                className={classNames("yakit-content-single-ellipsis")}
                            >
                                {text || "-"}
                            </div>
                        )
                    },
                    width: widthObj?.[key]
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

            // 如果表格为空，初始化一条新数据 由于需要校验数据不可直接保存
            if (data.length === 0 && !(Array.isArray(value) && value.length > 0)) {
                const newItem = {
                    _id: uuidv4(),
                    ...defObj
                }
                setCacheData([newItem])
                setEditingId(newItem._id)
                form.setFieldsValue({...newItem})
            }
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
        if (cacheData.length > 0 && record._id === cacheData[0]._id) {
            if (record._id === editingId) {
                setEditingId("")
            }
            setCacheData([])
            return
        }
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
        return new Promise<Item>(async (resolve, reject) => {
            try {
                const row = (await form.validateFields()) as Item
                const newData = [...data]
                const index = newData.findIndex((item) => record._id === item._id)
                // 修改
                if (index > -1) {
                    const item = newData[index]
                    const newItem = {
                        ...item,
                        ...row
                    }
                    newData.splice(index, 1, newItem)
                    setData(newData)
                    setEditingId("")
                    onSubmit(newData)
                    resolve(newItem)
                }
                // 新增
                else if (cacheData.length > 0 && record._id === cacheData[0]._id) {
                    newData.push({...cacheData[0], ...row})
                    setCacheData([])
                    setData(newData)
                    setEditingId("")
                    onSubmit(newData)
                    resolve(cacheData[0])
                }
            } catch (errInfo) {
                reject()
            }
        })
    })

    // 复制
    const onCopy = useMemoizedFn(async (record: Item) => {
        // 校验复制行 如若为编辑状态且无法通过校验则无法复制
        if (record._id === editingId) {
            try {
                const item = await onSave(record)
                const newRecord = {
                    ...item,
                    _id: uuidv4()
                }
                setData([...data, newRecord])
            } catch (error) {
                warn("当前行校验未通过")
            }
        } else {
            const newRecord = {
                ...record,
                _id: uuidv4()
            }
            setData([...data, newRecord])
        }
    })

    // 失焦自动保存（如若此时点击可选组件时，不应调用自动保存）
    const onBlur = useMemoizedFn((record: Item) => {
        isFoucus.current = false
        setTimeout(async () => {
            if (editingId && !isFoucus.current) {
                try {
                    await onSave(record)
                    setEditingId("")
                } catch (error) {
                    // 保存失败时不退出编辑状态
                }
            }
            isFoucus.current = false
        }, 200)
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
                title: <div style={{fontSize: 12}}>操作</div>,
                dataIndex: "operation",
                width: 45,
                fixed: "right",
                render: (_: any, record: Item) => {
                    const editTable = isEditing(record)
                    const editData = [
                        {
                            key: "save",
                            label: "保存"
                        },
                        {
                            key: "cancel",
                            label: "取消"
                        }
                    ]
                    const showData = [
                        {
                            key: "edit",
                            label: "编辑"
                        },
                        {
                            key: "copy",
                            label: "复制"
                        }
                    ]
                    const delData = [
                        {
                            key: "delete",
                            label: "删除"
                        }
                    ]
                    return (
                        <YakitDropdownMenu
                            menu={{
                                data: editTable ? [...editData, ...delData] : [...showData, ...delData],
                                onClick: ({key}) => {
                                    switch (key) {
                                        case "save":
                                            onSave(record)
                                            break
                                        case "cancel":
                                            onCancel()
                                            break
                                        case "edit":
                                            onEdit(record)
                                            break
                                        case "copy":
                                            onCopy(record)
                                            break
                                        case "delete":
                                            onDelete(record)
                                            break
                                        default:
                                            break
                                    }
                                },
                                width: 80
                            }}
                            dropdown={{
                                trigger: ["click"],
                                placement: "bottom"
                            }}
                        >
                            <YakitButton type='text' size='small' icon={<EllipsisOutlined />} />
                        </YakitDropdownMenu>
                    )
                }
            }
        ]
    }, [columns, editingId])

    const isFoucus = useRef<boolean>(false)
    const setFoucusFun = useMemoizedFn((is: boolean) => {
        isFoucus.current = is
    })
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
                form,
                setFoucusFun: setFoucusFun,
                onBlur: () => onBlur(record)
            })
        }
    })

    return (
        <Form form={form} component={false}>
            <div className={styles["edit-table-box"]}>
                <Table
                    rowKey={(e) => e._id}
                    size='small'
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
                    bordered={true}
                    onRow={(record) => ({
                        onDoubleClick: () => {
                            // 如果当前没有编辑中的行,直接编辑
                            if (editingId === "") {
                                onEdit(record)
                                return
                            }

                            // 如果点击的是当前编辑行,不做处理
                            if (editingId === record._id) {
                                return
                            }

                            // 如果有其他行在编辑,先保存再编辑新行
                            const editingRecord = data.find((item) => item._id === editingId)
                            if (editingRecord) {
                                onSave(editingRecord)
                                onEdit(record)
                            }
                        },
                        onContextMenu: (e) => {
                            e.preventDefault()
                            showByRightContext({
                                data: [
                                    {label: "编辑", key: "edit"},
                                    {label: "复制", key: "copy"},
                                    {label: "保存", key: "save"},
                                    {label: "删除", key: "delete"}
                                ],
                                width: 80,
                                onClick: async (e) => {
                                    switch (e.key) {
                                        case "edit":
                                            // 如果当前没有编辑中的行,直接编辑
                                            if (editingId === "") {
                                                onEdit(record)
                                                return
                                            }

                                            // 如果点击的是当前编辑行,不做处理
                                            if (editingId === record._id) {
                                                return
                                            }

                                            // 如果有其他行在编辑,先保存再编辑新行
                                            const editingRecord = data.find((item) => item._id === editingId)
                                            if (editingRecord) {
                                                onSave(editingRecord)
                                                onEdit(record)
                                            }
                                            return
                                        case "copy":
                                            onCopy(record)
                                            return
                                        case "save":
                                            try {
                                                await onSave(record)
                                            } catch (error) {
                                                warn("当前行校验未通过")
                                            }

                                            return
                                        case "delete":
                                            const newData = data.filter((item) => item._id !== record._id)
                                            setData(newData)
                                            return
                                    }
                                }
                            })
                        }
                    })}
                />
            </div>

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
