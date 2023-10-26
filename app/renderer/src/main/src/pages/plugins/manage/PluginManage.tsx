import React, {memo, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {
    PluginsContainer,
    PluginsLayout,
    aduitStatusToName,
    defaultFilter,
    defaultPagemeta,
    defaultSearch,
    statusTag
} from "../baseTemplate"
import {
    AuthorImg,
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {TypeSelectOpt} from "../funcTemplateType"
import {
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {apiFetchList, ssfilters} from "../test"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {PluginManageDetail} from "./PluginManageDetail"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const StatusType: TypeSelectOpt[] = [
    {key: "0", ...aduitStatusToName["0"]},
    {key: "1", ...aduitStatusToName["1"]},
    {key: "2", ...aduitStatusToName["2"]}
]

interface PluginManageProps {}

export const PluginManage: React.FC<PluginManageProps> = (props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首屏加载 */
    const isLoadingRef = useRef<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    const [filters, setFilters, getFilters] = useGetState<PluginFilterParams>({
        status: [],
        plugin_type: [],
        tags: [],
        plugin_group: []
    })
    const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [hasMore, setHasMore] = useState<boolean>(true)

    useEffect(() => {
        console.log(response.data.length)
    }, [response])

    const fetchList = useMemoizedFn((reset?: boolean) => {
        if (loading) return

        setLoading(true)

        const params: PluginListPageMeta = !!reset
            ? {...defaultPagemeta}
            : {
                  page: response.pagemeta.page + 1,
                  limit: response.pagemeta.limit || 20
              }

        apiFetchList(params)
            .then((res: API.YakitPluginListResponse) => {
                if (!res.data) res.data = []

                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })
                // const isMore = res.data.length < res.pagemeta.limit || data.length === response.pagemeta.total
                // setHasMore(!isMore)

                isLoadingRef.current = false
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })

    // 关键词|作者搜索
    // 触发列表的搜索(未完成)
    const onKeywordAndUser = useDebounceFn(
        (value: PluginSearchParams) => {
            console.log("onKeywordAndUser", value)
        },
        {wait: 300}
    )
    // 过滤条件搜索
    const onFilter = useDebounceFn(
        (value: Record<string, string[] | string>) => {
            setFilters({...value})
        },
        {wait: 300}
    )

    // ----- 选中插件 -----
    const [allCheck, setAllcheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<string[]>([])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])
    // 全选|取消全选
    const onCheck = useMemoizedFn((value: boolean) => {
        setSelectList([])
        setAllcheck(value)
    })

    const [showGroup, setShowGroup] = useState<boolean>(false)
    // 添加至分组
    const onAddGroup = useMemoizedFn(() => {})

    /** 批量修改插件作者 */
    const [showModifyAuthor, setShowModifyAuthor] = useState<boolean>(false)
    const onShowModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(true)
    })
    const onModifyAuthor = useMemoizedFn(() => {
        setShowModifyAuthor(false)
        setAllcheck(false)
        setSelectList([])
        fetchList(true)
    })

    /** 批量下载插件 */
    const [showBatchDownload, setShowBatchDownload] = useState<boolean>(false)
    const onBatchDownload = useMemoizedFn(() => {
        if (allCheck || selectNum === 0) {
            // 全部下载
            setShowBatchDownload(true)
        } else {
            // 批量下载
            console.log("selectlist", selectList)
        }
    })
    /** 单个插件下载 */
    const onDownload = useMemoizedFn((value?: API.YakitPluginDetail) => {})

    /** 批量删除插件 */
    // 原因窗口(删除|不通过)
    const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
        visible: false,
        type: "nopass"
    })
    // 单项插件删除
    const [activeDelPlugin, setActiveDelPlugin] = useState<API.YakitPluginDetail | undefined>()
    const onShowDelPlugin = useMemoizedFn(() => {
        setShowReason({visible: true, type: "del"})
    })
    const onCancelReason = useMemoizedFn(() => {
        setActiveDelPlugin(undefined)
        setShowReason({visible: false, type: "nopass"})
    })
    const onReasonCallback = useMemoizedFn((reason: string) => {
        console.log("reason", reason)
        if (showReason.type === "del") {
            let arr: YakitPluginOnlineDetail[] = []
            if (!!activeDelPlugin) {
                arr = [activeDelPlugin]
            } else {
                if (allCheck || selectNum === 0) arr = [...response.data]
                else
                    arr = [
                        ...(selectList.map((item) => {
                            return {uuid: item}
                        }) as any)
                    ]
                setHasMore(false)
            }

            isLoadingRef.current = true
            setLoading(true)
            dispatch({
                type: "remove",
                payload: {
                    itemList: [...arr]
                }
            })
            onCancelReason()
            setTimeout(() => {
                isLoadingRef.current = false
                setLoading(false)
            }, 2000)
        }
        if (showReason.type === "nopass") {
        }
    })

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(false)

    // 当前展示的插件序列
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    const [plugin, setPlugin] = useState<API.YakitPluginDetail | undefined>()

    // 单项组件-相关操作和展示组件逻辑
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: API.YakitPluginDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
            setAllcheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data.uuid])
        else setSelectList(getSelectList().filter((item) => item !== data.uuid))
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: API.YakitPluginDetail) => {
        return statusTag[`${data.status}`]
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: API.YakitPluginDetail) => {
        return (
            <FuncFilterPopover
                icon={<OutlineDotshorizontalIcon />}
                menu={{
                    data: [
                        {key: "del", label: "删除"},
                        {key: "download", label: "下载"}
                    ],
                    className: styles["func-filter-dropdown-menu"],
                    onClick: ({key}) => {
                        switch (key) {
                            case "del":
                                setActiveDelPlugin(data)
                                setShowReason({visible: true, type: "del"})
                                return
                            case "download":
                                onDownload(data)
                                return
                            default:
                                return
                        }
                    }
                }}
                button={{
                    type: "text2"
                }}
                placement='bottomRight'
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: API.YakitPluginDetail) => {
        setPlugin({...data})
    })
    const pluginStatusSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.status?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.status])
    const onSetActive = useMemoizedFn((status: TypeSelectOpt[]) => {
        const newStatus: API.PluginsSearchData[] = status.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, status: newStatus})
    })
    return (
        <>
            {!!plugin && (
                <PluginManageDetail
                    info={plugin}
                    currentIndex={showPluginIndex.current}
                    setCurrentIndex={setShowPluginIndex}
                    allCheck={allCheck}
                    onCheck={onCheck}
                    selectList={selectList}
                    optCheck={optCheck}
                    data={response}
                    onBack={() => {
                        setPlugin(undefined)
                    }}
                    loadMoreData={onUpdateList}
                />
            )}

            <PluginsLayout
                title='插件管理'
                hidden={!!plugin}
                subTitle={<TypeSelect active={pluginStatusSelect} list={StatusType} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch
                            maxWidth={1000}
                            value={searchs}
                            onSearch={onKeywordAndUser.run}
                            onChange={setSearchs}
                        />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlinePluscircleIcon />}
                                disabled={selectNum === 0}
                                type='outline2'
                                size='large'
                                name={"添加至分组"}
                                onClick={onAddGroup}
                            />
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlinePencilaltIcon />}
                                disabled={selectNum === 0}
                                type='outline2'
                                size='large'
                                name={"修改作者"}
                                onClick={onShowModifyAuthor}
                            />
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={onBatchDownload}
                            />
                            <FuncBtn
                                maxWidth={1150}
                                icon={<OutlineTrashIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "删除" : "清空"}
                                onClick={onShowDelPlugin}
                            />
                        </div>
                    </div>
                }
            >
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={setShowFilter}
                    selecteds={filters as Record<string, API.PluginsSearchData[]>}
                    onSelect={onFilter.run}
                    groupList={ssfilters}
                >
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.pagemeta.total}
                        selected={selectNum}
                        filters={filters}
                        setFilters={setFilters}
                        visible={showFilter}
                        setVisible={setShowFilter}
                    >
                        <ListShowContainer<API.YakitPluginDetail>
                            id='pluginManage'
                            isList={isList}
                            data={response.data}
                            gridNode={(info: {index: number; data: API.YakitPluginDetail}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.uuid)
                                return (
                                    <GridLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        title={data.script_name}
                                        type={data.type}
                                        tags={data.tags}
                                        help={data.help || ""}
                                        img={data.head_img || ""}
                                        user={data.authors || ""}
                                        // prImgs={data.prs}
                                        time={data.updated_at}
                                        isCorePlugin={false}
                                        official={false}
                                        subTitle={optSubTitle}
                                        extraFooter={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            gridHeight={210}
                            listNode={(info: {index: number; data: API.YakitPluginDetail}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.uuid)
                                return (
                                    <ListLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        img={data.head_img}
                                        title={info.index + data.script_name}
                                        help={data.help || ""}
                                        time={data.updated_at}
                                        type={""}
                                        isCorePlugin={false}
                                        official={false}
                                        subTitle={optSubTitle}
                                        extraNode={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            listHeight={73}
                            loading={loading}
                            hasMore={hasMore}
                            updateList={onUpdateList}
                            showIndex={showPluginIndex.current}
                            setShowIndex={setShowPluginIndex}
                        />
                    </PluginsList>
                </PluginsContainer>
                <ModifyAuthorModal
                    visible={showModifyAuthor}
                    setVisible={setShowModifyAuthor}
                    plugins={selectList}
                    total={response.pagemeta.total}
                    onOK={onModifyAuthor}
                />
                <ReasonModal
                    visible={showReason.visible}
                    setVisible={onCancelReason}
                    type={showReason.type}
                    total={!!activeDelPlugin ? 1 : selectNum || response.pagemeta.total}
                    onOK={onReasonCallback}
                />
                {showBatchDownload && (
                    <YakitGetOnlinePlugin
                        visible={showBatchDownload}
                        setVisible={(v) => {
                            setShowBatchDownload(v)
                        }}
                    />
                )}
            </PluginsLayout>
        </>
    )
}

interface ModifyAuthorModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    plugins: string[]
    total: number
    onOK: () => any
}
/** @name 批量修改插件作者 */
const ModifyAuthorModal: React.FC<ModifyAuthorModalProps> = memo((props) => {
    const {visible, setVisible, plugins, total, onOK} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [list, setList] = useState<{img: string; name: string; id: string}[]>([
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子1号",
            id: "1"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子2号",
            id: "2"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子3号",
            id: "3"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子4号",
            id: "4"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子5号",
            id: "5"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子6号",
            id: "6"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子7号",
            id: "7"
        }
    ])
    const [value, setValue] = useState<string>("")
    const {run} = useDebounceFn(
        (value?: string) => {
            setLoading(true)
            setList([])
            console.log("search", value)
            setTimeout(() => {
                setLoading(false)
            }, 1000)
        },
        {
            wait: 500
        }
    )

    const [submitLoading, setSubmitLoading] = useState<boolean>(false)
    const [status, setStatus] = useState<"" | "error">("")
    const submit = useMemoizedFn(() => {
        if (!value) {
            setStatus("error")
            return
        }
        console.log(value)
        setSubmitLoading(true)
        setTimeout(() => {
            onOK()
            setSubmitLoading(false)
        }, 1000)
    })
    const cancel = useMemoizedFn(() => {
        if (submitLoading) return
        setVisible(false)
    })

    useEffect(() => {
        if (!visible) {
            setValue("")
            setStatus("")
            setSubmitLoading(false)
        }
    }, [visible])

    return (
        <YakitModal
            title='批量修改插件作者'
            width={448}
            type='white'
            centered={true}
            closable={true}
            keyboard={false}
            visible={visible}
            cancelButtonProps={{loading: submitLoading}}
            confirmLoading={submitLoading}
            onCancel={cancel}
            onOk={submit}
        >
            <div className={styles["modify-author-modal-body"]}>
                <Form.Item
                    labelCol={{span: 24}}
                    label={<>作者：</>}
                    help={
                        <>
                            共选择了{" "}
                            <span className={styles["modify-author-hint-span"]}>{plugins.length || total}</span> 个插件
                        </>
                    }
                    validateStatus={status}
                >
                    <YakitSelect
                        placeholder='请选择...'
                        showSearch={true}
                        filterOption={false}
                        notFoundContent={loading ? <YakitSpin spinning={true} size='small' /> : "暂无数据"}
                        allowClear={true}
                        value={value}
                        onSearch={run}
                        onChange={(value, option: any) => {
                            setValue(value)
                            if (value) setStatus("")
                        }}
                    >
                        {list.map((item) => (
                            <YakitSelect.Option key={item.name} value={item.id} record={item}>
                                <div className={styles["modify-author-item-wrapper"]}>
                                    <AuthorImg size='small' src={item.img || ""} />
                                    {item.name}
                                </div>
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </Form.Item>
            </div>
        </YakitModal>
    )
})

interface ReasonModalProps {
    visible: boolean
    setVisible: () => any
    type?: string
    total?: number
    onOK: (reason: string) => any
}
/** @name 原因说明 */
export const ReasonModal: React.FC<ReasonModalProps> = memo((props) => {
    const {visible, setVisible, type = "nopass", total, onOK} = props

    const title = useMemo(() => {
        if (type === "nopass") return "不通过原因"
        if (type === "del") return "删除原因"
        return "未知错误窗口,请关闭重试!"
    }, [type])

    useEffect(() => {
        if (!visible) setValue("")
    }, [visible])

    const [value, setValue] = useState<string>("")
    const onSubmit = useMemoizedFn(() => {
        if (!value) {
            yakitNotify("error", "请输入删除原因!")
            return
        }
        onOK(value)
    })

    return (
        <YakitModal
            title={title}
            width={448}
            type='white'
            centered={true}
            closable={true}
            maskClosable={false}
            keyboard={false}
            visible={visible}
            onCancel={setVisible}
            onOk={onSubmit}
        >
            <div className={styles["reason-modal-body"]}>
                <YakitInput.TextArea
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={value}
                    maxLength={150}
                    onChange={(e) => setValue(e.target.value)}
                />
                {total && (
                    <div className={styles["hint-wrapper"]}>
                        共选择了 <span className={styles["total-num"]}>{total || 0}</span> 个插件
                    </div>
                )}
            </div>
        </YakitModal>
    )
})
