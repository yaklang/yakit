import React, {useEffect, useMemo, useRef, useState} from "react"
import {API} from "@/services/swagger/resposeType"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import moment from "moment"
import {Form, Space, TreeSelectProps} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useCampare} from "@/hook/useCompare/useCompare"
import {useCreation, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {yakitNotify} from "@/utils/notification"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {PencilAltIcon, TrashIcon} from "@/assets/newIcon"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {DefaultOptionType} from "antd/es/select"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitTreeSelect} from "@/components/yakitUI/YakitTreeSelect/YakitTreeSelect"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import styles from "./RoleAdminPage.module.scss"
interface RoleListRequest {
    limit: number
    page: number
    orderBy: string
    order: string
}
interface RemoveProps {
    rid: number[]
}
export interface RoleAdminPageProp {}
export const RoleAdminPage: React.FC<RoleAdminPageProp> = (props) => {
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<API.RoleList[]>([])
    const isInitRequestRef = useRef<boolean>(true)
    const [query, setQuery] = useState<RoleListRequest>({
        page: 1,
        limit: 20,
        orderBy: "updated_at",
        order: "desc"
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<API.RoleListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const [roleFormShow, setRoleFormShow] = useState<boolean>(false)
    const roleInfoRef = useRef<API.RoleList>()

    useEffect(() => {
        update(1)
    }, [])

    const columns: ColumnsTypeProps[] = [
        {
            title: "角色名",
            dataKey: "name"
        },
        {
            title: "操作权限",
            dataKey: "role",
            render: (text, record) => {
                return <span>{["审核员"].includes(record.name) ? "审核插件" : "-"}</span>
            }
        },
        {
            title: "创建时间",
            dataKey: "created_at",
            ellipsis: true,
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "操作",
            dataKey: "action",
            fixed: "right",
            width: 65,
            render: (_, record: API.RoleList) =>
                ["审核员"].includes(record.name) ? (
                    <></>
                ) : (
                    <Space>
                        <PencilAltIcon
                            className={styles["edit-icon"]}
                            onClick={(e) => {
                                roleInfoRef.current = record
                                setRoleFormShow(true)
                            }}
                        />
                        <YakitPopconfirm
                            title={"确定删除该角色吗？"}
                            onConfirm={() => {
                                onRemoveSingle(record.id)
                            }}
                            placement='right'
                        >
                            <TrashIcon className={styles["del-icon"]} />
                        </YakitPopconfirm>
                    </Space>
                )
        }
    ]

    const compareSelectList = useCampare(selectList)
    const selectedRowKeys = useCreation(() => {
        return selectList.map((item) => item.id)
    }, [compareSelectList])
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, compareSelectList, response.pagemeta.total])
    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: API.RoleList[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(response.data)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: API.RoleList) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setAllCheck(false)
            setSelectList((s) => s.filter((ele) => ele.id !== selectedRows.id))
        }
    })

    const queyChangeUpdateData = useDebounceFn(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                update(1)
            }
        },
        {wait: 300}
    ).run

    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [query])

    const update = useMemoizedFn((page: number) => {
        const params: RoleListRequest = {
            ...query,
            page
        }
        const isInit = page === 1
        isInitRequestRef.current = false
        setLoading(true)
        NetWorkApi<RoleListRequest, API.RoleListResponse>({
            method: "get",
            url: "roles",
            params: params
        })
            .then((res) => {
                const d = isInit ? res.data : response.data.concat(res.data)
                setResponse({
                    ...res,
                    data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                    setSelectList([])
                    setAllCheck(false)
                } else {
                    if (allCheck) {
                        setSelectList(d)
                    }
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取角色列表失败：" + e)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onRemoveSingle = (rid: number) => {
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "roles",
            data: {
                rid: [rid]
            }
        })
            .then((res) => {
                yakitNotify("success", "删除角色成功")
                setSelectList((s) => s.filter((ele) => ele.id !== rid))
                setResponse({
                    data: response.data.filter((item) => item.id !== rid),
                    pagemeta: {
                        ...response.pagemeta,
                        total: response.pagemeta.total - 1 > 0 ? response.pagemeta.total - 1 : 0
                    }
                })
            })
            .catch((err) => {
                yakitNotify("error", "删除角色失败：" + err)
            })
    }

    const onRemoveMultiple = () => {
        setLoading(true)
        NetWorkApi<RemoveProps, API.NewUrmResponse>({
            method: "delete",
            url: "roles",
            data: {
                rid: selectedRowKeys
            }
        })
            .then((res) => {
                yakitNotify("success", "删除角色成功")
                setQuery((prevQuery) => ({
                    ...prevQuery,
                    page: 1
                }))
                setSelectList([])
                setAllCheck(false)
            })
            .catch((err) => {
                yakitNotify("error", "删除角色失败：" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    return (
        <div className={styles["roleAdminPage"]}>
            <TableVirtualResize<API.RoleList>
                loading={loading}
                query={query}
                isRefresh={isRefresh}
                isShowTotal={true}
                extra={
                    <Space>
                        <YakitPopconfirm
                            title={"确认删除选择的角色吗？不可恢复"}
                            onConfirm={(e) => {
                                e?.stopPropagation()
                                onRemoveMultiple()
                            }}
                            placement='bottomRight'
                            disabled={selectNum === 0}
                        >
                            <YakitButton size='small' disabled={selectNum === 0}>
                                批量删除
                            </YakitButton>
                        </YakitPopconfirm>
                        <YakitButton size='small' onClick={() => setRoleFormShow(true)}>
                            创建角色
                        </YakitButton>
                    </Space>
                }
                data={response.data}
                enableDrag={false}
                renderKey='id'
                columns={columns}
                useUpAndDown
                pagination={{
                    total: response.pagemeta.total,
                    limit: response.pagemeta.limit,
                    page: response.pagemeta.page,
                    onChange: (page) => {
                        update(page)
                    }
                }}
                rowSelection={{
                    isAll: allCheck,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll,
                    onChangeCheckboxSingle
                }}
            ></TableVirtualResize>
            <YakitModal
                visible={roleFormShow}
                title='创建角色'
                destroyOnClose={true}
                maskClosable={false}
                width={600}
                footer={null}
                onCancel={() => {
                    setRoleFormShow(false)
                    roleInfoRef.current = undefined
                }}
            >
                <RoleOperationForm
                    onCancel={() => {
                        setRoleFormShow(false)
                        roleInfoRef.current = undefined
                    }}
                    refresh={() => {
                        update(1)
                    }}
                    roleInfo={roleInfoRef.current}
                ></RoleOperationForm>
            </YakitModal>
        </div>
    )
}

interface LoadDataProps {
    type: string
}
interface RolesDetailRequest {
    id: number
}
interface RoleOperationFormProp {
    onCancel: () => void
    refresh: () => void
    roleInfo?: API.RoleList
}
const RoleOperationForm: React.FC<RoleOperationFormProp> = (props) => {
    const {onCancel, refresh, roleInfo} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [treeLoadedKeys, setTreeLoadedKeys] = useState<any>([])
    const PluginType = {
        yak: "YAK 插件",
        mitm: "MITM 插件",
        "packet-hack": "数据包扫描",
        "port-scan": "端口扫描插件",
        codec: "CODEC插件",
        nuclei: "YAML POC"
    }
    const PluginTypeKeyArr: string[] = Object.keys(PluginType)
    const TreePluginType = [
        ...PluginTypeKeyArr.map((key) => {
            return {
                id: key,
                value: key,
                title: PluginType[key],
                isLeaf: false
            }
        })
    ]

    const [selectedAll, setSelectedAll] = useState<boolean>(false)
    // 受控模式控制浮层
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (roleInfo) {
            NetWorkApi<RolesDetailRequest, API.NewRoleRequest>({
                method: "get",
                url: "roles/detail",
                params: {
                    id: roleInfo.id
                }
            })
                .then((res: API.NewRoleRequest) => {
                    let {name, plugin, pluginType = ""} = res
                    const pluginArr = (plugin || []).map((item) => ({label: item.script_name, value: item.id}))
                    const pluginTypeArr: string[] = pluginType.split(",").filter((item) => item.length > 0)
                    const value = {
                        name,
                        treeSelect: [...pluginTypeArr, ...pluginArr]
                    }
                    if (
                        pluginTypeArr.length === PluginTypeKeyArr.length &&
                        pluginTypeArr.filter((item) => PluginTypeKeyArr.includes(item)).length ===
                            PluginTypeKeyArr.length
                    ) {
                        setSelectedAll(true)
                    }
                    form.setFieldsValue({
                        ...value
                    })
                })
                .catch((err) => {
                    yakitNotify("error", "失败：" + err)
                })
        }
    }, [roleInfo])

    // 保留数组中重复元素
    const filterUnique = (arr) => arr.filter((i) => arr.indexOf(i) !== arr.lastIndexOf(i))
    const onFinish = useMemoizedFn((values) => {
        const {name, treeSelect} = values
        setLoading(true)
        let pluginTypeArr: string[] = Array.from(new Set(filterUnique([...treeSelect, ...PluginTypeKeyArr])))
        let pluginIdsArr: string[] = treeSelect.filter((item) => !pluginTypeArr.includes(item))
        let params: API.NewRoleRequest = {
            name,
            pluginType: pluginTypeArr.join(","),
            pluginIds: pluginIdsArr.join(",")
        }
        if (roleInfo) {
            params.id = roleInfo.id
        }
        NetWorkApi<API.NewRoleRequest, API.ActionSucceeded>({
            method: "post",
            url: "roles",
            data: params
        })
            .then((res: API.ActionSucceeded) => {
                if (res.ok) {
                    onCancel()
                    refresh()
                }
            })
            .catch((err) => {
                yakitNotify("error", "失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const [treeData, setTreeData] = useState<Omit<DefaultOptionType, "label">[]>([...TreePluginType])

    const onLoadData: TreeSelectProps["loadData"] = ({id}) => {
        return new Promise((resolve) => {
            const pId = id
            NetWorkApi<LoadDataProps, API.PluginTypeListResponse>({
                method: "get",
                url: "plugin/type",
                params: {
                    type: id
                }
            })
                .then((res: API.PluginTypeListResponse) => {
                    if (Array.isArray(res.data)) {
                        const AddTreeData = res.data.map((item) => ({
                            id: item.id,
                            pId,
                            value: item.id,
                            title: item.script_name,
                            isLeaf: true
                        }))
                        setTreeData(
                            Array.from(new Map([...treeData, ...AddTreeData].map((item) => [item.id, item])).values())
                        )
                    }
                })
                .catch((err) => {
                    yakitNotify("error", "失败：" + err)
                })
                .finally(() => {
                    resolve(undefined)
                })
        })
    }

    const onChange = (newValue: string[]) => {
        if (
            newValue.length === PluginTypeKeyArr.length &&
            newValue.filter((item) => PluginTypeKeyArr.includes(item)).length === PluginTypeKeyArr.length
        ) {
            setSelectedAll(true)
            form.setFieldsValue({
                treeSelect: PluginTypeKeyArr
            })
        } else {
            setSelectedAll(false)
        }
    }

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <>
                <YakitCheckbox
                    checked={selectedAll}
                    style={{padding: "0 0px 4px 24px", width: "100%", marginTop: 8}}
                    onChange={(e) => {
                        const {checked} = e.target
                        setSelectedAll(checked)
                        if (checked) {
                            form.setFieldsValue({
                                treeSelect: PluginTypeKeyArr
                            })
                        } else {
                            form.setFieldsValue({
                                treeSelect: []
                            })
                        }
                    }}
                >
                    全部
                </YakitCheckbox>
                {originNode}
            </>
        )
    })

    return (
        <div style={{marginTop: 24}}>
            <Form labelCol={{span: 5}} wrapperCol={{span: 16}} form={form} onFinish={onFinish}>
                <Form.Item name='name' label='角色名' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput placeholder='请输入角色名' allowClear />
                </Form.Item>
                <Form.Item name='treeSelect' label='插件权限' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitTreeSelect
                        showSearch={false}
                        treeDataSimpleMode
                        style={{width: "100%"}}
                        dropdownStyle={{maxHeight: 400, overflow: "auto"}}
                        placeholder='请选择插件权限'
                        treeCheckable={true}
                        onChange={onChange}
                        loadData={onLoadData}
                        treeData={treeData}
                        allowClear
                        showCheckedStrategy='SHOW_PARENT'
                        maxTagCount={selectedAll ? 0 : 3}
                        maxTagPlaceholder={(omittedValues) =>
                            selectedAll ? "全部" : <>+ {omittedValues.length} ...</>
                        }
                        dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                        open={open}
                        onDropdownVisibleChange={(visible) => setOpen(visible)}
                        treeLoadedKeys={treeLoadedKeys}
                        treeExpandedKeys={treeLoadedKeys}
                        onTreeExpand={(expandedKeys) => {
                            setTreeLoadedKeys(expandedKeys)
                        }}
                        tagRender={(props) => (
                            <YakitTag
                                closable
                                onClose={() => {
                                    const treeSelect = form.getFieldValue("treeSelect")
                                    const newTreeSelect = treeSelect.filter((item) => item !== props.value)
                                    form.setFieldsValue({
                                        treeSelect: newTreeSelect
                                    })
                                }}
                            >
                                {props.label}
                            </YakitTag>
                        )}
                    />
                </Form.Item>

                <div style={{textAlign: "center"}}>
                    <YakitButton style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        确认
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
}
