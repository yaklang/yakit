import React, {ReactNode, useEffect, useRef, useState, useMemo} from "react"
import {
    Table,
    Space,
    Button,
    Input,
    Modal,
    Form,
    Popconfirm,
    Tag,
    Avatar,
    Select,
    Cascader,
    Popover,
    Spin,
    Tree,
    Pagination
} from "antd"
import type {ColumnsType} from "antd/es/table"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn, useDebounce, useThrottleFn} from "ahooks"
import moment from "moment"
import "./AccountAdminPage.scss"
import {failed, success, warn} from "@/utils/notification"
import {PaginationSchema} from "../invoker/schema"
import {showModal} from "@/utils/showModal"
import {callCopyToClipboard} from "@/utils/basic"
import {ResizeBox} from "@/components/ResizeBox"
import {PlusOutlined, EditOutlined, DeleteOutlined,RightOutlined} from "@ant-design/icons"
import {DefaultOptionType} from "antd/lib/cascader"
const {Option} = Select
export interface ShowUserInfoProps extends API.NewUrmResponse {
    onClose: () => void
}
const ShowUserInfo: React.FC<ShowUserInfoProps> = (props) => {
    const {user_name, password, onClose} = props
    const copyUserInfo = () => {
        callCopyToClipboard(`用户名：${user_name}\n密码：${password}`)
    }
    return (
        <div style={{padding: "0 10px"}}>
            <div>
                用户名：<span>{user_name}</span>
            </div>
            <div>
                密码：<span>{password}</span>
            </div>
            <div style={{textAlign: "center", paddingTop: 10}}>
                <Button type='primary' onClick={() => copyUserInfo()}>
                    复制
                </Button>
            </div>
        </div>
    )
}

interface QueryAccountProps {
    uid: string
}
export interface AccountFormProps {
    editInfo: API.UrmUserList | undefined
    onCancel: () => void
    // 第一个参数为更新其他架构ID 第二个参数为自己ID
    refresh: (v: number, b?: number) => void
}

const layout = {
    labelCol: {span: 5},
    wrapperCol: {span: 16}
}

interface DepData {
    value: number
    label: string
    children?: DepData[]
    isLeaf?: boolean
    loading?: boolean
}

const AccountForm: React.FC<AccountFormProps> = (props) => {
    const {onCancel, refresh, editInfo} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    // 角色分页
    const [pagination, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    // 组织架构分页
    const [depPagination, setDepPagination, getDepPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [roleData, setRoleData, getRoleData] = useGetState<API.RoleList[]>([])
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    const isOnceLoading = useRef<boolean>(true)
    const [depData, setDepData, getDepData] = useGetState<DepData[]>([])
    const getRolesData = (page?: number, limit?: number) => {
        // 加载角色列表
        isOnceLoading.current = false
        setSelectLoading(true)
        const paginationProps = {
            page: page || pagination.Page,
            limit: limit || pagination.Limit
        }
        NetWorkApi<QueryProps, API.RoleListResponse>({
            method: "get",
            url: "roles",
            params: {
                ...paginationProps
            }
        })
            .then((res) => {
                // console.log("数据源9：", res)
                if (Array.isArray(res.data)) {
                    const newData = res.data.map((item) => ({...item}))
                    setRoleData([...getRoleData(), ...newData])
                    setPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                }
            })
            .catch((err) => {
                failed("获取角色列表失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setSelectLoading(false)
                }, 200)
            })
    }

    const getDepartmentData = (page?: number, limit?: number, id?: number) => {
        const paginationProps = {
            page: page || depPagination.Page,
            limit: limit || depPagination.Limit
        }
        NetWorkApi<DepartmentGetProps, API.DepartmentListResponse>({
            method: "get",
            url: "department",
            params: {
                ...paginationProps
            }
        })
            .then((res: API.DepartmentListResponse) => {
                console.log("组织架构FORM-返回结果：", res)
                if (Array.isArray(res.data)) {
                    // 控件不支持分页-获取全部数据
                    NetWorkApi<DepartmentGetProps, API.DepartmentListResponse>({
                        method: "get",
                        url: "department",
                        params: {
                            page: 1,
                            limit: res.pagemeta.limit
                        }
                    })
                        .then((res: API.DepartmentListResponse) => {
                            console.log("组织架构FORM1-返回结果：", res)
                            const data = res.data.map((item) => ({
                                value: item.id,
                                label: item.name,
                                isLeaf: item.exist_group ? false : true
                            }))
                            if (id) {
                                // 初始化默认数据
                                initLoadData(data, id)
                            } else {
                                setDepData(data)
                            }
                            setDepPagination({...pagination, Limit: res.pagemeta.limit, Page: res.pagemeta.page})
                        })
                        .catch((err) => {
                            failed("失败：" + err)
                        })
                        .finally(() => {})
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }

    useEffect(() => {
        getRolesData()
        if (editInfo?.uid) {
            // 加载编辑数据
            NetWorkApi<QueryAccountProps, API.UrmEditListResponse>({
                method: "get",
                url: "/urm/edit",
                params: {
                    uid: editInfo?.uid
                }
            })
                .then((res: API.UrmEditListResponse) => {
                    console.log("返回结果：", res)
                    if (res.data) {
                        const {user_name, department_parent_id, department_id, role_id, role_name} = res.data
                        const department = department_parent_id
                            ? [department_parent_id, department_id]
                            : [department_id]
                        getDepartmentData(undefined, undefined, department_parent_id)
                        console.log("默认值", department_parent_id, department_id)
                        let obj: any = {
                            user_name
                        }
                        if (department_id) {
                            obj.department = department
                        }
                        if (role_id) {
                            obj.role_id = {key: role_id, value: role_name}
                        }
                        form.setFieldsValue(obj)
                    }
                })
                .catch((err) => {
                    failed("加载数据失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        } else {
            getDepartmentData()
        }
    }, [])

    const onFinish = useMemoizedFn((values) => {
        const {user_name, department, role_id} = values
        // 编辑
        const departmentId: number = department[department.length - 1]
        if (editInfo) {
            console.log("params888", editInfo)
            const params: API.EditUrmRequest = {
                uid: editInfo.uid,
                user_name,
                department: departmentId,
                role_id: role_id?.key || role_id
            }
            NetWorkApi<API.EditUrmRequest, API.ActionSucceeded>({
                method: "post",
                url: "urm/edit",
                data: params
            })
                .then((res: API.ActionSucceeded) => {
                    refresh(departmentId, editInfo?.department_id)
                    onCancel()
                })
                .catch((err) => {
                    failed("修改账号失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        }
        // 新增
        else {
            const params: API.NewUrmRequest = {
                user_name,
                department: departmentId,
                role_id
            }
            console.log("params", params)
            NetWorkApi<API.NewUrmRequest, API.NewUrmResponse>({
                method: "post",
                url: "urm",
                data: params
            })
                .then((res: API.NewUrmResponse) => {
                    console.log("返回结果：", res)
                    const {user_name, password} = res
                    onCancel()
                    refresh(departmentId)
                    const m = showModal({
                        title: "账号信息",
                        content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                    })
                    return m
                })
                .catch((err) => {
                    failed("创建账号失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        }
    })

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <Spin spinning={selectLoading}>{originNode}</Spin>
            </div>
        )
    })

    const initLoadData = (data, id) => {
        NetWorkApi<DepartmentGetProps, API.DepartmentGroupList>({
            method: "get",
            url: "department/group",
            params: {
                departmentId: id
            }
        })
            .then((res: API.DepartmentGroupList) => {
                if (Array.isArray(res.data)) {
                    const dataIn = res.data.map((item) => ({
                        label: item.name,
                        value: item.id
                    }))
                    let newArr = data.map((item) => {
                        if (item.value === id) {
                            return {
                                ...item,
                                children: dataIn
                            }
                        }
                        return item
                    })
                    setDepData([...newArr])
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }

    const loadData = (selectedOptions: DefaultOptionType[]) => {
        console.log("selectedOptions", selectedOptions)
        const targetOption = selectedOptions[selectedOptions.length - 1]
        targetOption.loading = true

        console.log("targetOption", targetOption)
        NetWorkApi<DepartmentGetProps, API.DepartmentGroupList>({
            method: "get",
            url: "department/group",
            params: {
                departmentId: targetOption.value
            }
        })
            .then((res: API.DepartmentGroupList) => {
                if (Array.isArray(res.data)) {
                    targetOption.loading = false
                    const data = res.data.map((item) => ({
                        label: item.name,
                        value: item.id
                    }))
                    targetOption.children = data
                    setDepData([...depData])
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }

    const {run} = useThrottleFn(
        () => {
            getRolesData(getPagination().Page + 1)
        },
        {wait: 500}
    )
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='user_name' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入用户名' allowClear />
                </Form.Item>
                <Form.Item name='department' label='组织架构' rules={[{required: true, message: "该项为必填"}]}>
                    <Cascader
                        options={depData}
                        loadData={loadData}
                        placeholder='请选择组织架构'
                        changeOnSelect
                        onPopupScroll={(e) => {
                            console.log("加载")
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                                getDepartmentData(getDepPagination().Page + 1)
                            }
                        }}
                    />
                </Form.Item>
                <Form.Item name='role_id' label='角色' rules={[{required: true, message: "该项为必填"}]}>
                    <Select
                        showSearch
                        placeholder='请选择角色'
                        optionFilterProp='children'
                        filterOption={(input, option) =>
                            (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }
                        onPopupScroll={(e) => {
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight) {
                                run()
                            }
                        }}
                        dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                    >
                        {roleData.map((item) => (
                            <Option key={item.id} value={item.id}>
                                {item.name}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface CreateOrganizationFormProps {
    parentId?: number
    onClose: () => void
    refresh: (v?: {name: string; key: number}) => void
}

interface DepartmentPostProps {
    name: string
    pid: number
}

const CreateOrganizationForm: React.FC<CreateOrganizationFormProps> = (props) => {
    const {onClose, refresh, parentId} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const params = {
            name: values.name,
            pid: 0
        }
        if (parentId) {
            params.pid = parentId
        }
        console.log("新建参数", params)
        NetWorkApi<DepartmentPostProps, number>({
            method: "post",
            url: "department",
            data: params
        })
            .then((res: number) => {
                console.log("返回结果998：", res)
                if (res) {
                    success("新建成功")
                    refresh({name: values.name, key: res})
                    onClose()
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    })
    return (
        <div style={{marginTop: 24}}>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='name' label='部门名称' rules={[{required: true, message: "该项为必填"}]}>
                    <Input placeholder='请输入部门名称' allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                </div>
            </Form>
        </div>
    )
}

interface DepartmentGetProps {}

interface DepartmentRemoveProps {
    id: number
}

interface DataSourceProps {
    title: string
    key: number
    // 能否展开
    isLeaf: boolean
    // 数量
    userNum?: number
    // 是否展示添加按钮
    isShowAddBtn?: boolean
    // 父级ID
    pid?: number
    // 是否显示所有按钮
    isShowAllBtn?: boolean
    children?: any
}

export interface OrganizationAdminPageProps {
    selectItemId: string | number | undefined
    setSelectItemId: (v: string | number | undefined) => void
    treeCount: TreeCountProps | undefined
    treeReduceCount: TreeReduceCountProps
    setSelectTitle: (v: SelectTitleProps | undefined) => void
}

interface ResetNameProps {
    pid: number
    name: string
    id?: number
}
const OrganizationAdminPage: React.FC<OrganizationAdminPageProps> = (props) => {
    const {selectItemId, setSelectItemId, treeCount, treeReduceCount, setSelectTitle} = props
    const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([])
    const [loadedKeys, setLoadedKeys] = useState<(string | number)[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [pagination, setPagination, getPagination] = useGetState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [treeHeight, setTreeHeight] = useState<number>(0)
    const TreeBoxRef = useRef<any>()
    // 正常 - 组织架构
    const [department, setDepartment, getDepartment] = useGetState<DataSourceProps[]>([])
    // 无归属 - 组织架构数量
    const [noDepartment, setNoDepartment] = useState<number>()

    const realDataSource = useMemo(() => {
        if (noDepartment && noDepartment > 0) {
            return [
                {
                    title: "无归属",
                    key: -1,
                    userNum: noDepartment,
                    isLeaf: true,
                    isShowAllBtn: false
                },
                ...department
            ]
        }
        return [...department]
    }, [department, noDepartment])

    useEffect(() => {
        setTreeHeight(TreeBoxRef.current.offsetHeight)
        // 获取正常组织架构
        update()
        // 获取无归属组织架构
        noUpdate()
    }, [])

    const updateSelectTitle = (list: DataSourceProps[], key: string | number, firstTitle?: string) =>
        list.map((node) => {
            if (node.key === key) {
                if (firstTitle) {
                    setSelectTitle({
                        firstTitle,
                        secondTitle: node.title
                    })
                } else {
                    setSelectTitle({
                        firstTitle: node.title
                    })
                }
            }
            if (node.children) {
                updateSelectTitle(node.children, key, node.title)
            }
        })
    const updateTreeCount = (list: DataSourceProps[], treeCount: TreeCountProps): DataSourceProps[] =>
        list.map((node) => {
            if (node.key === treeCount.id) {
                return {
                    ...node,
                    userNum: treeCount.count
                }
            }
            if (node.children) {
                return {
                    ...node,
                    children: updateTreeCount(node.children, treeCount)
                }
            }
            return node
        })

    // 更新count数量
    useEffect(() => {
        if (treeCount) {
            setDepartment((origin) => updateTreeCount(origin, treeCount))
            noUpdate()
        }
    }, [treeCount])

    const updateTreeReduceCount = (list: DataSourceProps[], treeCountObj: TreeReduceCountProps): DataSourceProps[] => {
        const {obj, reduce} = treeCountObj
        return list.map((node) => {
            if (obj.hasOwnProperty(node.key)) {
                let newUserNum = reduce ? (node?.userNum || 0) - obj[node.key] : (node?.userNum || 0) + obj[node.key]
                let userNum = newUserNum > 0 ? newUserNum : 0
                return {
                    ...node,
                    userNum
                }
            }
            // 多层递归（如后续升级可用）
            if (node.children) {
                return {
                    ...node,
                    children: updateTreeReduceCount(node.children, treeCountObj)
                }
            }
            return node
        })
    }

    // 动态计算更新count数量
    useEffect(() => {
        if (treeReduceCount) {
            setDepartment((origin) => updateTreeReduceCount(origin, treeReduceCount))
            noUpdate()
        }
    }, [treeReduceCount])

    const noUpdate = () => {
        NetWorkApi<DepartmentGetProps, API.DepartmentList>({
            method: "get",
            url: "noDepartment",
            params: {}
        })
            .then((res: API.DepartmentList) => {
                setNoDepartment(res.userNum)
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const update = (offsetId: number = 0) => {
        setLoading(true)
        const paginationProps = {
            page: pagination.Page,
            limit: pagination.Limit
        }
        NetWorkApi<DepartmentGetProps, API.DepartmentListResponse>({
            method: "get",
            url: "department",
            params: {
                ...paginationProps,
                offsetId
            }
        })
            .then((res: API.DepartmentListResponse) => {
                const newData = (res?.data || [])
                    .filter((item) => item.name || item.userNum > 0)
                    .map((item) => ({
                        title: item.name,
                        key: item.id,
                        userNum: item.userNum,
                        isLeaf: item.exist_group ? false : true,
                        isShowAddBtn: true
                    }))
                // 若无选中 则 默认选中第一项
                // if (newData.length > 0) {
                //     setSelectItemId(selectItemId || newData[0].key)
                // }
                setDepartment([...getDepartment(), ...newData])
                setPagination({...pagination, Limit: res.pagemeta.limit})
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const {run} = useThrottleFn(
        () => {
            const lastItem = getDepartment().slice(-1)
            const offsetId: number = lastItem.length > 0 ? lastItem[0].key : 0
            update(offsetId)
        },
        {wait: 500}
    )
    // 删除
    const onRemove = (id: number, pid?: number) => {
        NetWorkApi<DepartmentRemoveProps, API.ActionSucceeded>({
            method: "delete",
            url: "department",
            params: {
                id
            }
        })
            .then((res: API.ActionSucceeded) => {
                if (res.ok) {
                    success("删除成功")
                    // 重置回显示全部
                    setSelectItemId(undefined)
                    setSelectTitle(undefined)
                    noUpdate()
                    if (pid) {
                        onLoadData({key: pid})
                    } else {
                        // 操作数据 仅动态删除一条
                        const filterArr = department.filter((item) => item.key !== id)
                        setDepartment(filterArr)
                    }
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }
    // 修改名称
    const resetName = (name, id, pid = 0) => {
        const params: ResetNameProps = {
            name,
            pid
        }
        if (id) {
            params.id = id
        }
        NetWorkApi<ResetNameProps, API.ActionSucceeded>({
            method: "post",
            url: "department",
            data: params
        })
            .then((res: API.ActionSucceeded) => {
                if (res) {
                    success("修改成功")
                    // 第一层更新
                    if (pid === 0) {
                        setDepartment((origin) =>
                            origin.map((node) => {
                                if (node.key === id) {
                                    return {
                                        ...node,
                                        title: name
                                    }
                                }
                                return node
                            })
                        )
                    }
                    // 内部更新
                    else {
                        onLoadData({key: pid})
                    }
                }
            })
            .catch((err) => {
                failed("失败：" + err)
            })
            .finally(() => {})
    }

    const updateTreeData = (list: DataSourceProps[], key: React.Key, children: DataSourceProps[]): DataSourceProps[] =>
        list.map((node) => {
            if (node.key === key) {
                return {
                    ...node,
                    isLeaf: false,
                    children
                }
            }
            // 多层递归（如后续升级可用）
            // if (node.children) {
            //     return {
            //         ...node,
            //         children: updateTreeData(node.children, key, children)
            //     }
            // }
            return node
        })
    const onLoadData = ({key, children}: any) => {
        // console.log("key, children", key, children)
        return new Promise<void>((resolve) => {
            if (children) {
                resolve()
                return
            }
            NetWorkApi<DepartmentGetProps, API.DepartmentGroupList>({
                method: "get",
                url: "department/group",
                params: {
                    departmentId: key
                }
            })
                .then((res: API.DepartmentGroupList) => {
                    if (Array.isArray(res.data)) {
                        const newArr = res.data.map((item) => ({
                            title: item.name,
                            key: item.id,
                            userNum: item.userNum,
                            isLeaf: true,
                            pid: key
                        }))
                        setDepartment((origin) => updateTreeData(origin, key, newArr))
                    }
                    // 当获取结果为空 则为删除的最后一个
                    else {
                        setDepartment((origin) =>
                            origin.map((node) => {
                                if (node.key === key) {
                                    return {
                                        ...node,
                                        isLeaf: true,
                                        children: null
                                    }
                                }
                                return node
                            })
                        )
                    }
                })
                .catch((err) => {
                    failed("失败：" + err)
                })
                .finally(() => {
                    resolve()
                })
        })
    }

    return (
        <div className='organization-admin-page'>
            <div className='organization-admin-page-title'>
                <div className='title'>组织架构</div>
                <div
                    className='add-icon'
                    onClick={() => {
                        const m = showModal({
                            title: "添加一级部门",
                            width: 600,
                            content: (
                                <CreateOrganizationForm
                                    onClose={() => {
                                        m.destroy()
                                    }}
                                    refresh={(obj) => {
                                        // 操作数据 仅动态添加一条
                                        if (obj) {
                                            setDepartment((origin) => [
                                                {
                                                    title: obj.name,
                                                    key: obj?.key,
                                                    userNum: 0,
                                                    isLeaf: true,
                                                    isShowAddBtn: true
                                                },
                                                ...origin
                                            ])
                                        }
                                    }}
                                />
                            )
                        })
                    }}
                >
                    <PlusOutlined />
                </div>
            </div>
            <Spin spinning={loading} wrapperClassName='spin-box'>
                <div className='organization-admin-page-content'>
                    <div ref={TreeBoxRef} className='organization-admin-page-content-tree'>
                        <Tree
                            loadData={onLoadData}
                            treeData={realDataSource}
                            blockNode={true}
                            onSelect={(key) => {
                                if (key.length <= 0) {
                                    return
                                }
                                updateSelectTitle(realDataSource, key[0])
                                setSelectItemId(key[0])
                            }}
                            selectedKeys={selectItemId ? [selectItemId] : []}
                            height={treeHeight}
                            expandedKeys={expandedKeys}
                            loadedKeys={loadedKeys}
                            onExpand={(expandedKeys, {expanded, node}) => {
                                setExpandedKeys(expandedKeys)
                            }}
                            onLoad={(loadedKeys, {event, node}) => {
                                setLoadedKeys(loadedKeys)
                            }}
                            titleRender={(nodeData: DataSourceProps) => {
                                const {isShowAllBtn = true} = nodeData
                                return (
                                    <div
                                        className={`department-item ${
                                            nodeData.key === selectItemId ? "click-item" : ""
                                        }`}
                                    >
                                        <div className='department-item-info'>
                                            {nodeData.title}（{nodeData.userNum}）
                                            {/* {nodeData.userNum && `（${nodeData.userNum}）`} */}
                                        </div>
                                        {isShowAllBtn && (
                                            <div className='department-item-operation'>
                                                <Space>
                                                    <Popover
                                                        trigger={"click"}
                                                        title={"修改名称"}
                                                        content={
                                                            <Input
                                                                size={"small"}
                                                                defaultValue={nodeData.title}
                                                                onBlur={(e) => {
                                                                    if (!!e.target.value.length) {
                                                                        resetName(
                                                                            e.target.value,
                                                                            nodeData.key,
                                                                            nodeData.pid
                                                                        )
                                                                    } else {
                                                                        warn("不可为空")
                                                                    }
                                                                }}
                                                            />
                                                        }
                                                    >
                                                        <EditOutlined
                                                            onClick={(e) => {
                                                                // 阻止冒泡
                                                                e?.stopPropagation()
                                                                setSelectItemId(nodeData.key)
                                                            }}
                                                            className='department-item-operation-icon'
                                                        />
                                                    </Popover>
                                                    <Popconfirm
                                                        title={"确定删除此项吗？不可恢复"}
                                                        onConfirm={(e) => {
                                                            onRemove(nodeData.key, nodeData.pid)
                                                        }}
                                                    >
                                                        <DeleteOutlined
                                                            onClick={(e) => {
                                                                // 阻止冒泡
                                                                e?.stopPropagation()
                                                                setSelectItemId(nodeData.key)
                                                            }}
                                                            className='department-item-operation-icon'
                                                        />
                                                    </Popconfirm>
                                                    {nodeData.isShowAddBtn && (
                                                        <PlusOutlined
                                                            className='department-item-operation-add-icon'
                                                            onClick={(e) => {
                                                                // 阻止冒泡
                                                                e?.stopPropagation()
                                                                setSelectItemId(nodeData.key)
                                                                const m = showModal({
                                                                    title: "添加二级部门",
                                                                    width: 600,
                                                                    content: (
                                                                        <CreateOrganizationForm
                                                                            onClose={() => {
                                                                                m.destroy()
                                                                            }}
                                                                            refresh={() => {
                                                                                onLoadData({key: nodeData.key})
                                                                            }}
                                                                            parentId={nodeData.key}
                                                                        />
                                                                    )
                                                                })
                                                            }}
                                                        />
                                                    )}
                                                </Space>
                                            </div>
                                        )}
                                    </div>
                                )
                            }}
                            onScroll={(e) => {
                                const {target} = e
                                const ref: HTMLDivElement = target as unknown as HTMLDivElement
                                if (ref.scrollTop + ref.offsetHeight + 10 >= ref.scrollHeight) {
                                    run()
                                }
                            }}
                        />
                    </div>
                    {/* {dataSource.length > 0 && (
                        <div style={{textAlign: "center"}}>
                            <Pagination
                                size='small'
                                current={pagination.Page}
                                pageSize={pagination?.Limit || 10}
                                showSizeChanger={true}
                                total={total}
                                showTotal={(i) => <Tag>{`Total ${i}`}</Tag>}
                                onChange={(page: number, limit?: number) => update(page, limit)}
                            />
                        </div>
                    )} */}
                </div>
            </Spin>
        </div>
    )
}

export interface AccountAdminPageProps {}

export interface QueryExecResultsParams {
    keywords: string
}

interface QueryProps {}
interface TreeCountProps {
    id: string | number
    count: number
}
interface ResetProps {
    user_name: string
    uid: string
}

interface TreeReduceCountProps {
    // 是否做减法-否则做加法
    reduce: boolean
    // 改变对象
    obj: any
}
interface SelectTitleProps {
    firstTitle: string
    secondTitle?: string
}
const AccountAdminPage: React.FC<AccountAdminPageProps> = (props) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [userInfoForm, setUserInfoForm] = useState<boolean>(false)
    const [params, setParams, getParams] = useGetState<QueryExecResultsParams>({
        keywords: ""
    })
    const [selectedRows, setSelectedRows] = useState<API.UrmUserList[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const [dataSource, setDataSource] = useState<API.UrmUserList[]>([])
    const [total, setTotal] = useState<number>()
    // 编辑项信息
    const [editInfo, setEditInfo] = useState<API.UrmUserList>()
    const [selectItemId, setSelectItemId] = useState<string | number>()
    const [selectTitle, setSelectTitle] = useState<SelectTitleProps>()
    // 根据请求返回Total更改Count
    const [treeCount, setTreeCount] = useState<TreeCountProps>()
    // 根据数据动态处理计算Count条数
    const [treeReduceCount, setTreeReduceCount] = useState<TreeReduceCountProps>({reduce: true, obj: {}})

    const update = (page?: number, limit?: number, addDepartmentId?: number) => {
        setLoading(true)
        const paginationProps = {
            page: page || 1,
            limit: limit || pagination.Limit
        }
        // if (selectItemId) {
        // 处理无归属请求
        const id = selectItemId === -1 ? 0 : selectItemId
        // 创建账号时用于更新组织架构数量
        const departmentId = addDepartmentId || id
        let filterObj: any = {
            ...params,
            ...paginationProps
        }
        if (departmentId) {
            filterObj.departmentId = departmentId
        }
        NetWorkApi<QueryProps, API.UrmUserListResponse>({
            method: "get",
            url: "urm",
            params: {
                ...params,
                ...paginationProps,
                departmentId: departmentId
            }
        })
            .then((res) => {
                // 创建账号 更改组织架构count
                if (addDepartmentId) {
                    setTreeCount({
                        id: addDepartmentId,
                        count: res.pagemeta.total
                    })
                }
                // 正常渲染Table
                else {
                    if (Array.isArray(res.data)) {
                        const newData = res.data.map((item) => ({...item}))
                        setDataSource(newData)
                    } else {
                        setDataSource([])
                    }
                    setPagination({...pagination, Limit: res.pagemeta.limit})
                    setTotal(res.pagemeta.total)
                    selectItemId &&
                        setTreeCount({
                            id: selectItemId,
                            count: res.pagemeta.total
                        })
                }
            })
            .catch((err) => {
                failed("获取账号列表失败：" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
        // }
    }

    useEffect(() => {
        setSelectedRows([])
        setSelectedRowKeys([])
        update()
    }, [selectItemId])

    const rowSelection = {
        onChange: (selectedRowKeys, selectedRows: API.UrmUserList[]) => {
            // let newArr = selectedRowKeys.map((item)=>parseInt(item))
            setSelectedRows(selectedRows)
            setSelectedRowKeys(selectedRowKeys)
        },
        selectedRowKeys
    }

    const onRemove = (uid: string[], department_id?: number) => {
        NetWorkApi<API.DeleteUrm, API.NewUrmResponse>({
            method: "delete",
            url: "urm",
            data: {
                uid
            }
        })
            .then((res) => {
                success("删除用户成功")
                update()
                // 如若是默认展示的所有数据进行删除处理
                if (!selectItemId) {
                    let removeTool = {}
                    if (department_id) {
                        removeTool = {[department_id]: 1}
                    } else {
                        removeTool = selectedRows.reduce((pre, cur) => {
                            if (cur.department_id) {
                                if (cur.department_id in pre) {
                                    pre[cur.department_id]++
                                } else {
                                    pre[cur.department_id] = 1
                                }
                            }
                            return pre
                        }, {})
                    }
                    setTreeReduceCount({obj: removeTool, reduce: true})
                }
            })
            .catch((err) => {
                failed("删除账号失败：" + err)
            })
            .finally(() => {})
    }

    const onReset = (uid, user_name) => {
        NetWorkApi<ResetProps, API.NewUrmResponse>({
            method: "post",
            url: "urm/reset/pwd",
            params: {
                user_name,
                uid
            }
        })
            .then((res) => {
                update()
                const {user_name, password} = res
                const m = showModal({
                    title: "账号信息",
                    content: <ShowUserInfo user_name={user_name} password={password} onClose={() => m.destroy()} />
                })
                return m
            })
            .catch((err) => {
                failed("重置账号失败：" + err)
            })
            .finally(() => {})
    }

    const judgeAvatar = (record) => {
        const {head_img, user_name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={32} src={head_img} />
        ) : (
            <Avatar size={32} style={{backgroundColor: "rgb(245, 106, 0)"}}>
                {user_name.slice(0, 1)}
            </Avatar>
        )
    }

    const columns: ColumnsType<API.UrmUserList> = [
        {
            title: "用户名",
            dataIndex: "user_name",
            render: (text: string, record) => (
                <div>
                    {judgeAvatar(record)}
                    <span style={{marginLeft: 10}}>{text}</span>
                </div>
            )
        },
        {
            title: "组织架构",
            dataIndex: "department_name",
            render: (text, record) => {
                return (
                    <div>
                        {record?.department_parent_name && `${record.department_parent_name} / `}
                        {text}
                    </div>
                )
            }
        },
        {
            title: "角色",
            dataIndex: "role_name"
        },
        {
            title: "创建时间",
            dataIndex: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "操作",
            render: (i) => (
                <Space>
                    <Button
                        size='small'
                        type='primary'
                        onClick={() => {
                            setEditInfo(i)
                            setUserInfoForm(true)
                        }}
                    >
                        编辑
                    </Button>
                    <Popconfirm title={"确定要重置该用户密码吗？"} onConfirm={() => onReset(i.uid, i.user_name)}>
                        <Button size='small' type='primary'>
                            重置密码
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        title={"确定删除该用户吗？"}
                        onConfirm={() => {
                            onRemove([i.uid], i.department_id)
                        }}
                    >
                        <Button size={"small"} danger={true}>
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <div className='account-admin-page'>
            <div className='title-operation'>
                <div className='filter'>
                    <Input.Search
                        placeholder={"请输入用户名进行搜索"}
                        enterButton={true}
                        size={"small"}
                        style={{width: 200}}
                        value={params.keywords}
                        onChange={(e) => {
                            setParams({...getParams(), keywords: e.target.value})
                        }}
                        onSearch={() => {
                            update()
                        }}
                    />
                </div>
                <div className='operation'>
                    <Space>
                        {!!selectedRowKeys.length ? (
                            <Popconfirm
                                title={"确定删除选择的用户吗？不可恢复"}
                                onConfirm={() => {
                                    onRemove(selectedRowKeys)
                                }}
                            >
                                <Button type='primary' htmlType='submit' size='small'>
                                    批量删除
                                </Button>
                            </Popconfirm>
                        ) : (
                            <Button type='primary' size='small' disabled={true}>
                                批量删除
                            </Button>
                        )}
                        <Button
                            type='primary'
                            htmlType='submit'
                            size='small'
                            onClick={() => {
                                setEditInfo(undefined)
                                setUserInfoForm(!userInfoForm)
                            }}
                        >
                            创建账号
                        </Button>
                    </Space>
                </div>
            </div>
            <ResizeBox
                firstNode={
                    <OrganizationAdminPage
                        setSelectItemId={setSelectItemId}
                        selectItemId={selectItemId}
                        treeCount={treeCount}
                        treeReduceCount={treeReduceCount}
                        setSelectTitle={setSelectTitle}
                    />
                }
                firstMinSize={300}
                firstRatio={"300px"}
                secondNode={
                    <div style={{overflowY: "auto", height: "100%"}}>
                        <div className='block-title'>
                            {selectTitle ? (
                                <>
                                    <div className='first-title'>{selectTitle.firstTitle}</div>
                                    {selectTitle?.secondTitle && (
                                        <>
                                        <RightOutlined  className='right-outlined'/>
                                            <div className='second-title'>{selectTitle.secondTitle}</div>
                                        </>
                                    )}
                                </>
                            ) : (
                                "全部成员"
                            )}
                        </div>
                        <Table
                            loading={loading}
                            pagination={{
                                size: "small",
                                defaultCurrent: 1,
                                pageSize: pagination?.Limit || 10,
                                showSizeChanger: true,
                                total,
                                showTotal: (i) => <Tag>{`Total ${i}`}</Tag>,
                                onChange: (page: number, limit?: number) => {
                                    update(page, limit)
                                }
                            }}
                            rowKey={(row) => row.uid}
                            rowSelection={{
                                type: "checkbox",
                                ...rowSelection
                            }}
                            columns={columns}
                            size={"small"}
                            bordered={true}
                            dataSource={dataSource}
                        />
                    </div>
                }
            />

            <Modal
                visible={userInfoForm}
                title={editInfo ? "编辑账号" : "创建账号"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={600}
                onCancel={() => setUserInfoForm(false)}
                footer={null}
            >
                <AccountForm
                    editInfo={editInfo}
                    onCancel={() => setUserInfoForm(false)}
                    refresh={(id, oldId) => {
                        // 当有 selectItemId 时count来源于表总数
                        if (selectItemId) {
                            // 解释：此处新增的话 重新计算新增的count
                            // 编辑时如若更换组织架构则需要更新2处 自己与变动处
                            id === selectItemId ? update() : update(1, undefined, id)
                            id !== selectItemId && oldId && update()
                        } else {
                            // 当没有 selectItemId 时count来源于加减法
                            update()
                            if (oldId) {
                                if (oldId !== id) {
                                    oldId && setTreeReduceCount({obj: {[oldId]: 1}, reduce: true})
                                    id && setTreeReduceCount({obj: {[id]: 1}, reduce: false})
                                }
                            } else {
                                setTreeReduceCount({obj: {[id]: 1}, reduce: false})
                            }
                        }
                    }}
                />
            </Modal>
        </div>
    )
}

export default AccountAdminPage
