import React, {useEffect, useMemo, useRef, useState} from "react"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlusIcon} from "@/assets/newIcon"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import YakitTree from "@/components/yakitUI/YakitTree/YakitTree"
import ReactResizeDetector from "react-resize-detector"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import {
    OutlineChevronrightIcon,
    OutlineDocumentduplicateIcon,
    OutlinePencilaltIcon,
    OutlineRefreshIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {Avatar, Form, Tooltip} from "antd"
import {useControllableValue, useCreation, useDebounceFn, useMemoizedFn, useThrottleFn, useUpdateEffect} from "ahooks"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import moment from "moment"
import {useCampare} from "@/hook/useCompare/useCompare"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {unReadable} from "../dynamicControl/DynamicControl"
import YakitCascader from "@/components/yakitUI/YakitCascader/YakitCascader"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {DefaultOptionType} from "antd/lib/cascader"
import styles from "./AccountAdminPage.module.scss"
import {setClipboardText} from "@/utils/clipboard"
interface QueryAccountAdminRequest {
    departmentId?: number
    keywords: string
    page: number
    limit: number
    orderBy: string
    order: string
}
const defQueryAccountAdminRequest: QueryAccountAdminRequest = {
    departmentId: undefined,
    keywords: "",
    page: 1,
    limit: 20,
    orderBy: "updated_at",
    order: "desc"
}
interface SelectTitleProps {
    firstTitle?: string
    secondTitle?: string
}
interface TreeCount {
    id: string | number
    count: number
}
interface TreeReduceCount {
    // 是否做减法-否则做加法
    reduce: boolean
    // 改变对象
    obj: any
}
export interface AccountAdminPageProp {}
export const AccountAdminPage: React.FC<AccountAdminPageProp> = (props) => {
    const [selectTitle, setSelectTitle] = useState<SelectTitleProps>()
    const [tableQuery, setTableQuery] = useState<QueryAccountAdminRequest>(defQueryAccountAdminRequest)

    const [treeCount, setTreeCount] = useState<TreeCount>()
    const [treeReduceCount, setTreeReduceCount] = useState<TreeReduceCount>({reduce: true, obj: {}})

    const onSelectDepartmentId = useMemoizedFn((departmentId) => {
        setTableQuery((prevQuery) => ({
            ...prevQuery,
            departmentId: departmentId === -1 ? 0 : departmentId
        }))
    })

    return (
        <div className={styles["accountAdminPage"]}>
            <YakitCard
                className={styles["card"]}
                headStyle={{
                    background: "#fff",
                    height: 32,
                    minHeight: 32,
                    boxSizing: "content-box",
                    borderBottom: "1px solid var(--yakit-border-color)",
                    paddingLeft: 0,
                    paddingRight: 0
                }}
                bodyStyle={{padding: 0, width: "100%", height: "calc(100% - 32px)"}}
                title={
                    <div className={styles["card-title"]}>
                        <YakitInput.Search
                            style={{width: 180}}
                            placeholder='请输入用户名进行搜索'
                            onSearch={(value) => {
                                setSelectTitle(undefined)
                                setTableQuery((prevQuery) => ({...prevQuery, departmentId: undefined, keywords: value}))
                            }}
                        ></YakitInput.Search>
                    </div>
                }
                extra={<div className={styles["card-extra"]}></div>}
            >
                <YakitResizeBox
                    isVer={false}
                    lineDirection='left'
                    firstNode={
                        <OrganizationAdmin
                            selectDepartmentId={tableQuery.departmentId === 0 ? -1 : tableQuery.departmentId}
                            onSelectDepartmentId={onSelectDepartmentId}
                            onSetSelectTitle={setSelectTitle}
                            treeCount={treeCount}
                            treeReduceCount={treeReduceCount}
                        />
                    }
                    firstRatio='30%'
                    firstMinSize='400px'
                    firstNodeStyle={{padding: 0}}
                    secondNode={
                        <AccountList
                            selectTitle={selectTitle}
                            onSetSelectTitle={setSelectTitle}
                            query={tableQuery}
                            onSetQuery={setTableQuery}
                            onSetTreeCount={setTreeCount}
                            onSetTreeReduceCount={setTreeReduceCount}
                        />
                    }
                    secondRatio='70%'
                    secondMinSize='500px'
                ></YakitResizeBox>
            </YakitCard>
        </div>
    )
}

interface DepartmentListRequest {
    offsetId?: number
    page: number
    limit: number
    orderBy: string
    order: string
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
interface DepartmentGroupListRequest {
    departmentId: number
}
interface DepartmentRemoveProps {
    id: number
}
interface ResetNameProps {
    pid: number
    name: string
    id?: number
}
interface OrganizationAdminProps {
    selectDepartmentId?: number
    onSelectDepartmentId: (selectDepartmentId?: number) => void
    onSetSelectTitle: (selectTitle?: SelectTitleProps) => void
    treeCount?: TreeCount
    treeReduceCount: TreeReduceCount
}
const OrganizationAdmin: React.FC<OrganizationAdminProps> = (props) => {
    const {selectDepartmentId, onSelectDepartmentId, onSetSelectTitle, treeCount, treeReduceCount} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [treeHeight, setTreeHeight] = useState<number>()
    const [treeQuery, setTreeQuery] = useState<DepartmentListRequest>({
        offsetId: 0,
        page: 1,
        limit: 50,
        orderBy: "updated_at",
        order: "desc"
    })
    // 正常 - 组织架构
    const [department, setDepartment] = useState<DataSourceProps[]>([])
    // 无归属 - 组织架构数量
    const [noDepartmentNum, setNoDepartmentNum] = useState<number>()
    const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([])

    useEffect(() => {
        getTreeData()
    }, [])

    const getTreeData = () => {
        // 获取正常组织架构
        getNomalOrganization(0)
        // 获取无归属组织架构
        noVestingOrganizationNum()
    }
    const getNomalOrganization = (offsetId: number) => {
        setLoading(true)
        const params: DepartmentListRequest = {
            ...treeQuery,
            offsetId
        }
        NetWorkApi<DepartmentListRequest, API.DepartmentListResponse>({
            method: "get",
            url: "department",
            params: params
        })
            .then((res) => {
                const newData = (res?.data || [])
                    .filter((item) => item.name || item.userNum > 0)
                    .map((item) => ({
                        title: item.name,
                        key: item.id,
                        userNum: item.userNum,
                        isLeaf: item.exist_group ? false : true,
                        isShowAddBtn: true
                    }))
                setDepartment((prev) => [...prev, ...newData])
            })
            .catch((err) => {
                yakitNotify("error", "获取组织架构失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    }
    const getNextNomalOrganization = useThrottleFn(
        () => {
            const lastItem = department.slice(-1)
            const offsetId: number = lastItem.length > 0 ? lastItem[0].key : 0
            getNomalOrganization(offsetId)
        },
        {wait: 500}
    ).run
    const noVestingOrganizationNum = () => {
        NetWorkApi<any, API.DepartmentList>({
            method: "get",
            url: "noDepartment",
            params: {}
        })
            .then((res: API.DepartmentList) => {
                setNoDepartmentNum(res.userNum)
            })
            .catch((err) => {
                yakitNotify("error", "获取无归属组织架构：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const refreshChildrenByParent = (origin: DataSourceProps[], parentKey: number, nodes: DataSourceProps[]) => {
        const arr: DataSourceProps[] = origin.map((node) => {
            if (node.key == parentKey) {
                return {
                    ...node,
                    children: nodes
                } as DataSourceProps
            }
            // if (node.children) {
            //     return {
            //         ...node,
            //         children: refreshChildrenByParent(node.children, parentKey, nodes)
            //     } as DataSourceProps
            // }
            return node
        })
        return arr
    }
    const onLoadData = ({key, children, data}: any) => {
        return new Promise<DataSourceProps[] | undefined>((resolve, reject) => {
            if (children) {
                resolve(undefined)
                return
            }
            NetWorkApi<DepartmentGroupListRequest, API.DepartmentGroupList>({
                method: "get",
                url: "department/group",
                params: {
                    departmentId: key
                }
            })
                .then((res) => {
                    if (Array.isArray(res.data)) {
                        const newArr = res.data.map((item) => ({
                            title: item.name,
                            key: item.id,
                            userNum: item.userNum,
                            isLeaf: true,
                            pid: key
                        }))
                        const newDepartment = refreshChildrenByParent(department, key, newArr)
                        setDepartment(newDepartment)
                        resolve(newDepartment)
                    } else {
                        // 当获取结果为空 则为删除的最后一个
                        const newDepartment = department.map((node) => {
                            if (node.key === key) {
                                return {
                                    ...node,
                                    isLeaf: true,
                                    children: null
                                }
                            }
                            return node
                        })
                        setDepartment(newDepartment)
                        resolve(newDepartment)
                    }
                })
                .catch((err) => {
                    reject(err)
                    yakitNotify("error", "失败：" + err)
                })
        })
    }

    const updateSelectTitle = (list: DataSourceProps[], key: number, firstTitle?: string) =>
        list.map((node) => {
            if (node.key === key) {
                if (firstTitle) {
                    onSetSelectTitle({
                        firstTitle,
                        secondTitle: node.title
                    })
                } else {
                    onSetSelectTitle({
                        firstTitle: node.title
                    })
                }
            }
            if (node.children) {
                updateSelectTitle(node.children, key, node.title)
            }
        })

    const treeData = useMemo(() => {
        if (noDepartmentNum) {
            return [
                {
                    title: "无归属",
                    key: -1,
                    userNum: noDepartmentNum,
                    isLeaf: true,
                    isShowAllBtn: false
                },
                ...department
            ]
        } else {
            return department
        }
    }, [noDepartmentNum, department])

    const refreshTreeData = (newDepartment: DataSourceProps[]) => {
        if (noDepartmentNum) {
            return [
                {
                    title: "无归属",
                    key: -1,
                    userNum: noDepartmentNum,
                    isLeaf: true,
                    isShowAllBtn: false
                },
                ...newDepartment
            ]
        } else {
            return newDepartment
        }
    }

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
                    yakitNotify("success", "删除成功")
                    setLoading(true)
                    // 重置回显示全部
                    onSelectDepartmentId(undefined)
                    onSetSelectTitle(undefined)
                    noVestingOrganizationNum()

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
                yakitNotify("error", "删除失败：" + err)
            })
    }

    const resetName = (name: string, id: number, pid = 0) => {
        const params: ResetNameProps = {
            name,
            pid
        }
        if (id) {
            params.id = id
        }
        NetWorkApi<ResetNameProps, number>({
            method: "post",
            url: "department",
            data: params
        })
            .then((res) => {
                if (res) {
                    yakitNotify("success", "修改成功")
                    // 第一层更新
                    if (pid === 0) {
                        const newDepartment = department.map((node) => {
                            if (node.key === id) {
                                return {
                                    ...node,
                                    title: name
                                }
                            }
                            return node
                        })
                        setDepartment(newDepartment)
                        updateSelectTitle(refreshTreeData(newDepartment), id)
                        onSelectDepartmentId(id)
                    }
                    // 内部更新
                    else {
                        onLoadData({key: pid}).then((newDepartment) => {
                            if (newDepartment) {
                                updateSelectTitle(refreshTreeData(newDepartment), id)
                            }
                            onSelectDepartmentId(id)
                        })
                    }
                }
            })
            .catch((err) => {
                yakitNotify("error", "修改失败：" + err)
            })
    }

    const updateTreeCount = (list: DataSourceProps[], treeCount: TreeCount): DataSourceProps[] =>
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
    useUpdateEffect(() => {
        if (treeCount) {
            setDepartment((origin) => updateTreeCount(origin, treeCount))
            noVestingOrganizationNum()
        }
    }, [treeCount])
    const updateTreeReduceCount = (list: DataSourceProps[], treeCountObj: TreeReduceCount): DataSourceProps[] => {
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
    useUpdateEffect(() => {
        setDepartment((origin) => updateTreeReduceCount(origin, treeReduceCount))
        noVestingOrganizationNum()
    }, [treeReduceCount])

    return (
        <YakitCard
            className={styles["card"]}
            headStyle={{
                background: "#fff",
                height: 32,
                minHeight: 32,
                boxSizing: "content-box",
                borderBottom: "1px solid var(--yakit-border-color)",
                paddingLeft: 0
            }}
            bodyStyle={{padding: 12, paddingLeft: 0, width: "100%", height: "calc(100% - 32px)"}}
            title={
                <div className={styles["card-title"]}>
                    <span className={styles["card-title-text"]}>组织架构</span>
                </div>
            }
            extra={
                <div className={styles["card-extra"]}>
                    <YakitButton
                        icon={<OutlinePlusIcon />}
                        type='text'
                        onClick={() => {
                            const m = showYakitModal({
                                title: "添加一级部门",
                                width: 500,
                                content: (
                                    <CreateOrganizationForm
                                        onClose={() => {
                                            m.destroy()
                                        }}
                                        refresh={(obj) => {
                                            // 操作数据 仅动态添加一条
                                            if (obj) {
                                                setDepartment((prev) => [
                                                    {
                                                        title: obj.name,
                                                        key: obj?.key,
                                                        userNum: 0,
                                                        isLeaf: true,
                                                        isShowAddBtn: true
                                                    },
                                                    ...prev
                                                ])
                                            }
                                        }}
                                    />
                                ),
                                footer: null
                            })
                        }}
                    ></YakitButton>
                </div>
            }
        >
            <div className={styles["card-body"]}>
                <YakitSpin spinning={loading}>
                    <ReactResizeDetector
                        onResize={(w, h) => {
                            if (!w || !h) {
                                return
                            }
                            setTreeHeight(h)
                        }}
                    />
                    <YakitTree
                        classNameWrapper={styles["department-tree"]}
                        blockNode={true}
                        showLine={false}
                        height={treeHeight}
                        treeData={treeData}
                        loadData={onLoadData}
                        titleRender={(nodeData) => {
                            const {
                                isShowAllBtn = true,
                                isShowAddBtn,
                                title,
                                userNum,
                                key,
                                pid
                            } = nodeData as DataSourceProps
                            return (
                                <div
                                    className={classNames(styles["department-item"], {
                                        [styles["department-item-select"]]: selectDepartmentId === key
                                    })}
                                >
                                    <div className={classNames(styles["department-item-info"], "content-ellipsis")}>
                                        {title}（{userNum}）
                                    </div>
                                    {isShowAllBtn && (
                                        <div className={styles["department-item-extra"]}>
                                            <YakitPopover
                                                title={"修改名称"}
                                                trigger={"click"}
                                                destroyTooltipOnHide
                                                content={
                                                    <YakitInput
                                                        size='small'
                                                        defaultValue={title}
                                                        onBlur={(e) => {
                                                            if (!!e.target.value.length) {
                                                                if (e.target.value !== title) {
                                                                    resetName(e.target.value, key, pid)
                                                                }
                                                            } else {
                                                                yakitNotify("warning", "不可为空")
                                                            }
                                                        }}
                                                    ></YakitInput>
                                                }
                                            >
                                                <YakitButton
                                                    icon={<OutlinePencilaltIcon className={styles["edit-icon"]} />}
                                                    type='text'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        updateSelectTitle(treeData, key)
                                                        if (selectDepartmentId !== key) {
                                                            onSelectDepartmentId(key)
                                                        }
                                                    }}
                                                ></YakitButton>
                                            </YakitPopover>
                                            <YakitPopconfirm
                                                title={"确定删除此项吗？不可恢复"}
                                                onConfirm={(e) => {
                                                    onRemove(key, pid)
                                                }}
                                            >
                                                <YakitButton
                                                    icon={<OutlineTrashIcon className={styles["del-icon"]} />}
                                                    type='text'
                                                    colors='danger'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        updateSelectTitle(treeData, key)
                                                        onSelectDepartmentId(key)
                                                    }}
                                                ></YakitButton>
                                            </YakitPopconfirm>
                                            {isShowAddBtn && (
                                                <YakitButton
                                                    icon={<OutlinePlusIcon className={styles["plus-icon"]} />}
                                                    type='text'
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        updateSelectTitle(treeData, key)
                                                        if (selectDepartmentId !== key) {
                                                            onSelectDepartmentId(key)
                                                        }
                                                        const m = showYakitModal({
                                                            title: "添加二级部门",
                                                            width: 500,
                                                            content: (
                                                                <CreateOrganizationForm
                                                                    onClose={() => {
                                                                        m.destroy()
                                                                    }}
                                                                    refresh={() => {
                                                                        onLoadData({key: key}).then(() => {
                                                                            setDepartment((prev) =>
                                                                                prev.map((item) => {
                                                                                    if (item.key === key) {
                                                                                        item.isLeaf = false
                                                                                    }
                                                                                    return item
                                                                                })
                                                                            )
                                                                            setExpandedKeys((prev) => [
                                                                                ...new Set(prev.concat(key))
                                                                            ])
                                                                        })
                                                                    }}
                                                                    parentId={key}
                                                                />
                                                            ),
                                                            footer: null
                                                        })
                                                    }}
                                                ></YakitButton>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        }}
                        selectedKeys={selectDepartmentId ? [selectDepartmentId] : []}
                        onSelect={(key) => {
                            if (key.length <= 0) {
                                return
                            }
                            updateSelectTitle(treeData, key[0] as number)
                            onSelectDepartmentId(key[0] as number)
                        }}
                        expandedKeys={expandedKeys}
                        onExpand={(expandedKeys, {expanded, node}) => {
                            setExpandedKeys(expandedKeys)
                        }}
                        onScroll={(e) => {
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 10 >= ref.scrollHeight) {
                                getNextNomalOrganization()
                            }
                        }}
                    ></YakitTree>
                </YakitSpin>
            </div>
        </YakitCard>
    )
}

interface DepartmentPostProps {
    name: string
    pid: number
}
interface CreateOrganizationFormProps {
    parentId?: number
    onClose: () => void
    refresh: (v?: {name: string; key: number}) => void
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
        NetWorkApi<DepartmentPostProps, number>({
            method: "post",
            url: "department",
            data: params
        })
            .then((res: number) => {
                if (res) {
                    yakitNotify("success", "新建成功")
                    refresh({name: values.name, key: res})
                    onClose()
                }
            })
            .catch((err) => {
                yakitNotify("error", "新建失败：" + err)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    return (
        <div style={{margin: 24}}>
            <Form labelCol={{span: 5}} wrapperCol={{span: 16}} form={form} onFinish={onFinish}>
                <Form.Item name='name' label='部门名称' rules={[{required: true, message: "该项为必填"}]}>
                    <YakitInput placeholder='请输入部门名称' allowClear />
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

interface ResetPwdProps {
    user_name: string
    uid: string
}
interface AccountListProps {
    selectTitle?: SelectTitleProps
    onSetSelectTitle: (selectTitle?: SelectTitleProps) => void
    query: QueryAccountAdminRequest
    onSetQuery: (query: QueryAccountAdminRequest) => void
    onSetTreeCount: (treeCount: TreeCount) => void
    onSetTreeReduceCount: (treeReduceCount: TreeReduceCount) => void
}
const AccountList: React.FC<AccountListProps> = (props) => {
    const {selectTitle, onSetSelectTitle, onSetTreeCount, onSetTreeReduceCount} = props
    const [creatCountVisible, setCreatCountVisible] = useState<boolean>(false)
    const editInfoRef = useRef<API.UrmUserList>()
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<API.UrmUserList[]>([])
    const isInitRequestRef = useRef<boolean>(true)
    const [query, setQuery] = useControllableValue<QueryAccountAdminRequest>(props, {
        defaultValue: defQueryAccountAdminRequest,
        valuePropName: "query",
        trigger: "onSetQuery"
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<API.UrmUserListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    useEffect(() => {
        update(1)
    }, [])

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

    const judgeAvatar = (record: API.UrmUserList) => {
        const {head_img, user_name} = record
        return head_img && !!head_img.length ? (
            <Avatar size={20} src={head_img} />
        ) : (
            <span className={styles["userNameAvatar"]}>{user_name.slice(0, 1)}</span>
        )
    }
    const columns: ColumnsTypeProps[] = [
        {
            title: "用户名",
            dataKey: "user_name",
            render: (text, record) => (
                <div className={styles['userNameWrapper']}>
                    {judgeAvatar(record)}
                    <span style={{marginLeft: 10}}>{text}</span>
                </div>
            )
        },
        {
            title: "组织架构",
            dataKey: "department_name",
            render: (text, record) => (
                <div>
                    {record?.department_parent_name && `${record.department_parent_name} / `}
                    {text}
                </div>
            )
        },
        {
            title: "角色",
            dataKey: "role_name"
        },
        {
            title: "创建时间",
            dataKey: "created_at",
            render: (text) => <span>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</span>
        },
        {
            title: "操作",
            dataKey: "action",
            width: 170,
            fixed: "right",
            render: (_, record: API.UrmUserList) => (
                <div className={styles["table-action-icon"]}>
                    <OutlinePencilaltIcon
                        className={styles["action-icon"]}
                        onClick={() => {
                            editInfoRef.current = record
                            setCreatCountVisible(true)
                        }}
                    />
                    <YakitPopconfirm
                        title={"确定要重置该用户密码吗？"}
                        onConfirm={() => onResetPwd(record.uid, record.user_name)}
                    >
                        <Tooltip title='重置用户密码' align={{targetOffset: [0, -15]}}>
                            <OutlineRefreshIcon className={styles["action-icon"]} onClick={() => {}} />
                        </Tooltip>
                    </YakitPopconfirm>
                    <Tooltip title='复制远程连接' align={{targetOffset: [0, -15]}}>
                        <OutlineDocumentduplicateIcon
                            className={styles["action-icon"]}
                            onClick={() => copySecretKey(record.user_name)}
                        />
                    </Tooltip>
                    <YakitPopconfirm
                        title={"确定删除该用户吗？"}
                        onConfirm={() => onRemoveSingle(record.uid, record.department_id)}
                        placement='right'
                    >
                        <OutlineTrashIcon className={styles["del-icon"]} />
                    </YakitPopconfirm>
                </div>
            )
        }
    ]

    const compareSelectList = useCampare(selectList)
    const selectedRowKeys = useCreation(() => {
        return selectList.map((item) => item.uid)
    }, [compareSelectList])
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, compareSelectList, response.pagemeta.total])
    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: API.UrmUserList[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(response.data)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })
    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: API.UrmUserList) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setAllCheck(false)
            setSelectList((s) => s.filter((ele) => ele.uid !== selectedRows.uid))
        }
    })

    const update = useMemoizedFn((page: number, addDepartmentId?: number) => {
        isInitRequestRef.current = false
        const isInit = page === 1
        const params: QueryAccountAdminRequest = {
            ...query,
            page
        }
        if (addDepartmentId) {
            params.departmentId = addDepartmentId
        } else {
            if (isInit) {
                setLoading(true)
            }
        }
        NetWorkApi<QueryAccountAdminRequest, API.UrmUserListResponse>({
            method: "get",
            url: "urm",
            params: params
        })
            .then((res) => {
                if (addDepartmentId) {
                    onSetTreeCount({
                        id: addDepartmentId,
                        count: res.pagemeta.total
                    })
                } else {
                    const data = res.data || []
                    const d = isInit ? data : response.data.concat(data)
                    setResponse({
                        ...res,
                        data: d
                    })
                    if (isInit) {
                        setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                        setSelectList([])
                        setAllCheck(false)
                        handleTreeCount(res.pagemeta.total)
                    } else {
                        if (allCheck) {
                            setSelectList(d)
                        }
                    }
                }

                // 无归属列表数据全部被删除 展示全部数据
                if (query.departmentId === 0 && response.pagemeta.total === 0) {
                    setQuery((prevQuery) => ({...prevQuery, departmentId: undefined}))
                    onSetSelectTitle(undefined)
                }
            })
            .catch((e) => {
                yakitNotify("error", "获取账号列表失败：" + e)
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onResetPwd = (uid: string, user_name: string) => {
        NetWorkApi<ResetPwdProps, API.NewUrmResponse>({
            method: "post",
            url: "urm/reset/pwd",
            params: {
                user_name,
                uid
            }
        })
            .then((res) => {
                update(1)
                const {user_name, password} = res
                showYakitModal({
                    title: "账号信息",
                    content: (
                        <div style={{padding: 15}}>
                            <div>
                                用户名：<span>{user_name}</span>
                            </div>
                            <div>
                                密码：<span>{password}</span>
                            </div>
                            <div style={{textAlign: "center", marginTop: 10}}>
                                <YakitButton
                                    type='primary'
                                    onClick={() => setClipboardText(`用户名：${user_name}\n密码：${password}`)}
                                >
                                    复制
                                </YakitButton>
                            </div>
                        </div>
                    ),
                    footer: null
                })
            })
            .catch((err) => {
                yakitNotify("error", "重置账号失败：" + err)
            })
            .finally(() => {})
    }

    const copySecretKey = (note: string) => {
        NetWorkApi<any, API.RemoteOperationResponse>({
            url: "remote/operation",
            method: "get",
            params: {
                note
            }
        })
            .then((res) => {
                const {data} = res
                if (Array.isArray(data) && data.length > 0) {
                    const {auth, id, note, port, host} = data[0]
                    const {pubpem, secret} = JSON.parse(auth)
                    let resultObj = {
                        id,
                        note,
                        port,
                        host,
                        pubpem,
                        secret
                    }
                    const showData = unReadable(resultObj)
                    setClipboardText(showData, {hintText: "复制远程连接成功"})
                } else {
                    yakitNotify("error", `暂无最新连接信息，请该用户发起远程连接后再操作`)
                }
            })
            .catch((err) => {
                yakitNotify("error", `复制远程连接失败: ${err}`)
            })
            .finally(() => {})
    }

    const onRemoveMultiple = () => {
        setLoading(true)
        NetWorkApi<API.DeleteUrm, API.NewUrmResponse>({
            method: "delete",
            url: "urm",
            data: {
                uid: selectedRowKeys
            }
        })
            .then((res) => {
                yakitNotify("success", "删除用户成功")
                update(1)
                setSelectList([])
                setAllCheck(false)
                handleTreeReduceCount()
            })
            .catch((err) => {
                yakitNotify("error", "删除账号失败：" + err)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }

    const onRemoveSingle = (uid: string, department_id?: number) => {
        NetWorkApi<API.DeleteUrm, API.NewUrmResponse>({
            method: "delete",
            url: "urm",
            data: {
                uid: [uid]
            }
        })
            .then((res) => {
                yakitNotify("success", "删除用户成功")
                setSelectList((s) => s.filter((ele) => ele.uid !== uid))
                const total = response.pagemeta.total - 1 > 0 ? response.pagemeta.total - 1 : 0
                setResponse({
                    data: response.data.filter((item) => item.uid !== uid),
                    pagemeta: {
                        ...response.pagemeta,
                        total: total
                    }
                })
                handleTreeCount(total)
                handleTreeReduceCount(department_id)
                // 无归属列表数据全部被删除 展示全部数据
                if (query.departmentId === 0 && total === 0) {
                    setQuery((prevQuery) => ({...prevQuery, departmentId: undefined}))
                    onSetSelectTitle(undefined)
                }
            })
            .catch((err) => {
                yakitNotify("error", "删除账号失败：" + err)
            })
    }

    const handleTreeCount = (count: number) => {
        if (query.departmentId) {
            onSetTreeCount({
                id: query.departmentId,
                count: count
            })
        }
    }

    const handleTreeReduceCount = (department_id?: number) => {
        if (!query.departmentId) {
            let removeTool = {}
            if (department_id) {
                removeTool = {[department_id]: 1}
            } else {
                removeTool = selectList.reduce((pre, cur) => {
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
            onSetTreeReduceCount({obj: removeTool, reduce: true})
        }
    }

    return (
        <div className={styles["accountList"]}>
            <div className={styles["block-title"]}>
                {selectTitle ? (
                    <>
                        <div className={styles["first-title"]}>{selectTitle.firstTitle}</div>
                        {selectTitle?.secondTitle && (
                            <>
                                <OutlineChevronrightIcon className={styles["right-outlined"]} />
                                <div className={styles["second-title"]}>{selectTitle.secondTitle}</div>
                            </>
                        )}
                    </>
                ) : query.keywords ? (
                    ""
                ) : (
                    "全部成员"
                )}
            </div>
            <TableVirtualResize<API.UrmUserList>
                loading={loading}
                query={query}
                isRefresh={isRefresh}
                titleHeight={42}
                isShowTotal={true}
                extra={
                    <div className={styles["accountList-table-extra"]}>
                        <YakitButton
                            size='small'
                            onClick={() => {
                                setCreatCountVisible(true)
                            }}
                        >
                            创建账号
                        </YakitButton>
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
                    </div>
                }
                data={response.data}
                enableDrag={false}
                renderKey='uid'
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
                visible={creatCountVisible}
                title={editInfoRef.current ? "编辑账号" : "创建账号"}
                destroyOnClose={true}
                maskClosable={false}
                width={600}
                onCancel={() => {
                    setCreatCountVisible(false)
                    editInfoRef.current = undefined
                }}
                footer={null}
            >
                <AccountForm
                    editInfo={editInfoRef.current}
                    onCancel={() => {
                        setCreatCountVisible(false)
                        editInfoRef.current = undefined
                    }}
                    refresh={(id, oldId) => {
                        if (query.departmentId) {
                            id === query.departmentId ? update(1) : update(1, id)
                            id !== query.departmentId && oldId && update(1)
                        } else {
                            update(1)
                            if (oldId) {
                                if (oldId !== id) {
                                    oldId && onSetTreeReduceCount({obj: {[oldId]: 1}, reduce: true})
                                    id && onSetTreeReduceCount({obj: {[id]: 1}, reduce: false})
                                }
                            } else {
                                onSetTreeReduceCount({obj: {[id]: 1}, reduce: false})
                            }
                        }
                    }}
                />
            </YakitModal>
        </div>
    )
}

interface DepData {
    value: number
    label: string
    children?: DepData[]
    isLeaf?: boolean
    loading?: boolean
}
interface UrmEditListRequest {
    uid: string
}
interface AccountFormProps {
    editInfo?: API.UrmUserList
    onCancel: () => void
    // 第一个参数为更新其他架构ID 第二个参数为自己ID
    refresh: (v: number, b?: number) => void
}
const AccountForm: React.FC<AccountFormProps> = (props) => {
    const {onCancel, refresh, editInfo} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [form] = Form.useForm()
    const [depData, setDepData] = useState<DepData[]>([])
    // 组织架构请求参数
    const [depTreeQuery, setDepTreeQuery] = useState<DepartmentListRequest>({
        page: 1,
        limit: 10000,
        orderBy: "updated_at",
        order: "desc"
    })
    // 角色分页
    const [rolePagination, setRolePagination] = useState({
        page: 1,
        limit: 20,
        order: "desc",
        orderBy: "updated_at"
    })
    const [roleData, setRoleData] = useState<API.RoleList[]>([])
    const [selectLoading, setSelectLoading] = useState<boolean>(true)

    useEffect(() => {
        getRolesData(1)
        if (editInfo?.uid) {
            NetWorkApi<UrmEditListRequest, API.UrmEditListResponse>({
                method: "get",
                url: "/urm/edit",
                params: {
                    uid: editInfo?.uid
                }
            })
                .then((res: API.UrmEditListResponse) => {
                    if (res.data) {
                        const {user_name, department_parent_id, department_id, role_id, role_name} = res.data
                        const department = department_parent_id
                            ? [department_parent_id, department_id]
                            : [department_id]
                        getDepartmentData(department_parent_id)
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
                    yakitNotify("error", "加载数据失败：" + err)
                })
        } else {
            getDepartmentData()
        }
    }, [])

    const getDepartmentData = (id?: number) => {
        // 获取全部数据
        NetWorkApi<DepartmentListRequest, API.DepartmentListResponse>({
            method: "get",
            url: "department",
            params: depTreeQuery
        })
            .then((res) => {
                const data = res.data.map((item) => ({
                    value: item.id,
                    label: item.name,
                    isLeaf: item.exist_group ? false : true
                }))
                if (id) {
                    initLoadData(data, id)
                } else {
                    setDepData(data)
                }
            })
            .catch((err) => {
                yakitNotify("error", "失败：" + err)
            })
            .finally(() => {})
    }
    const loadData = (selectedOptions: DefaultOptionType[]) => {
        const targetOption = selectedOptions[selectedOptions.length - 1]
        targetOption.loading = true
        if (targetOption.value) {
            NetWorkApi<DepartmentGroupListRequest, API.DepartmentGroupList>({
                method: "get",
                url: "department/group",
                params: {
                    departmentId: +targetOption.value
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
                    yakitNotify("error", "失败：" + err)
                })
                .finally(() => {})
        }
    }
    const initLoadData = (data, id) => {
        NetWorkApi<DepartmentGroupListRequest, API.DepartmentGroupList>({
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
                yakitNotify("error", "失败：" + err)
            })
            .finally(() => {})
    }

    const getRolesData = (page: number) => {
        setSelectLoading(true)
        const paginationProps = {
            ...rolePagination,
            page: page
        }
        const isInit = page === 1
        NetWorkApi<any, API.RoleListResponse>({
            method: "get",
            url: "roles",
            params: paginationProps
        })
            .then((res) => {
                let data = res.data || []
                if (data.length > 0) {
                    setRolePagination((v) => ({...v, page: paginationProps.page}))
                }
                const newData = res.data.map((item) => ({...item}))
                const opsd = isInit ? newData : roleData.concat(newData)
                setRoleData(opsd)
            })
            .catch((err) => {
                yakitNotify("error", "获取角色列表失败：" + err)
            })
            .finally(() => {
                setSelectLoading(false)
            })
    }
    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <YakitSpin spinning={selectLoading}>{originNode}</YakitSpin>
            </div>
        )
    })

    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const {user_name, department, role_id} = values
        // 编辑
        const departmentId: number = department[department.length - 1]
        if (editInfo) {
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
                    yakitNotify("error", "修改账号失败：" + err)
                })
                .finally(() => {
                    setLoading(false)
                })
        }
        // 新增
        else {
            const params: API.NewUrmRequest = {
                user_name,
                department: departmentId,
                role_id
            }
            NetWorkApi<API.NewUrmRequest, API.NewUrmResponse>({
                method: "post",
                url: "urm",
                data: params
            })
                .then((res: API.NewUrmResponse) => {
                    const {user_name, password} = res
                    onCancel()
                    refresh(departmentId)
                    showYakitModal({
                        title: "账号信息",
                        content: (
                            <div style={{padding: 15}}>
                                <div>
                                    用户名：<span>{user_name}</span>
                                </div>
                                <div>
                                    密码：<span>{password}</span>
                                </div>
                                <div style={{textAlign: "center", marginTop: 10}}>
                                    <YakitButton
                                        type='primary'
                                        onClick={() => setClipboardText(`用户名：${user_name}\n密码：${password}`)}
                                    >
                                        复制
                                    </YakitButton>
                                </div>
                            </div>
                        ),
                        footer: null
                    })
                })
                .catch((err) => {
                    yakitNotify("error", "创建账号失败：" + err)
                })
                .finally(() => {
                    setLoading(false)
                })
        }
    })

    return (
        <Form labelCol={{span: 5}} wrapperCol={{span: 16}} form={form} onFinish={onFinish}>
            <Form.Item name='user_name' label='用户名' rules={[{required: true, message: "该项为必填"}]}>
                <YakitInput placeholder='请输入用户名' allowClear />
            </Form.Item>
            <Form.Item name='department' label='组织架构' rules={[{required: true, message: "该项为必填"}]}>
                <YakitCascader options={depData} loadData={loadData} placeholder='请选择组织架构' changeOnSelect />
            </Form.Item>
            <Form.Item name='role_id' label='角色' rules={[{required: true, message: "该项为必填"}]}>
                <YakitSelect
                    showSearch
                    placeholder='请选择角色'
                    optionFilterProp='children'
                    filterOption={(input, option) =>
                        (option!.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                    onPopupScroll={(e) => {
                        const {target} = e
                        const ref: HTMLDivElement = target as unknown as HTMLDivElement
                        if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight && !selectLoading) {
                            getRolesData(rolePagination.page + 1)
                        }
                    }}
                    dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                >
                    {roleData.map((item) => (
                        <YakitSelect.Option key={item.id} value={item.id}>
                            {item.name}
                        </YakitSelect.Option>
                    ))}
                </YakitSelect>
            </Form.Item>
            <div style={{textAlign: "center"}}>
                <YakitButton style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                    确认
                </YakitButton>
            </div>
        </Form>
    )
}
