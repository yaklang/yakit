import React, {memo, useEffect, useMemo, useReducer, useRef, useState} from "react"
import {
    PluginsContainer,
    PluginsLayout,
    aduitStatusToName,
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
import {useDebounceEffect, useDebounceFn, useGetState, useInViewport, useLatest, useLockFn, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {BackInfoProps, PluginManageDetail} from "./PluginManageDetail"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {initialOnlineState, pluginOnlineReducer} from "../pluginReducer"
import {YakitGetOnlinePlugin} from "@/pages/mitm/MITMServerHijacking/MITMPluginLocalList"
import {yakitNotify} from "@/utils/notification"
import {YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import {
    DownloadOnlinePluginsRequest,
    PluginsQueryProps,
    apiDeletePluginCheck,
    apiDownloadPluginCheck,
    apiFetchCheckList,
    apiFetchGroupStatisticsCheck,
    convertDownloadOnlinePluginBatchRequestParams,
    convertPluginsRequestParams
} from "../utils"
import {isCommunityEdition} from "@/utils/envfile"
import {NetWorkApi} from "@/services/fetch"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

// 首页上方的审核状态搜索条件组件数据
const StatusType: TypeSelectOpt[] = [
    {key: "0", ...aduitStatusToName["0"]},
    {key: "1", ...aduitStatusToName["1"]},
    {key: "2", ...aduitStatusToName["2"]}
]

interface PluginManageProps {}

export const PluginManage: React.FC<PluginManageProps> = (props) => {
    // 判断该页面-用户是否可见状态
    const layoutRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(layoutRef)
    // 初始时，数据是否为空，为空展示空数据时的UI
    const [initTotal, setInitTotal] = useState<number>(0)
    const getInitTotal = useMemoizedFn(() => {
        apiFetchCheckList({page: 1, limit: 50}).then((res) => {
            setInitTotal(+res.pagemeta.total)
        })
    })
    useEffect(() => {
        getInitTotal()
    }, [inViewPort])

    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useGetState<boolean>(false)
    const latestLoadingRef = useLatest(loading)
    /** 是否为首屏加载 */
    const isLoadingRef = useRef<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    const [filters, setFilters] = useState<PluginFilterParams>({
        plugin_type: [],
        status: [],
        tags: [],
        plugin_group: []
    })
    /** 首页顶部的审核状态组件选中情况 */
    const pluginStatusSelect: TypeSelectOpt[] = useMemo(() => {
        return (
            filters.status?.map((ele) => ({
                key: ele.value,
                name: ele.label
            })) || []
        )
    }, [filters.status])
    const [searchs, setSearchs] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, dispatch] = useReducer(pluginOnlineReducer, initialOnlineState)
    const [hasMore, setHasMore] = useState<boolean>(true)

    // 获取插件列表数据
    const fetchList = useMemoizedFn((reset?: boolean) => {
        if (latestLoadingRef.current) return
        if (reset) isLoadingRef.current = true

        setLoading(true)
        const params: PluginListPageMeta = !!reset
            ? {...defaultPagemeta}
            : {
                  page: response.pagemeta.page + 1,
                  limit: response.pagemeta.limit || 20
              }
        // api接口请求参数
        const query: PluginsQueryProps = {...convertPluginsRequestParams({...filters}, searchs, params)}

        apiFetchCheckList(query)
            .then((res) => {
                console.log("data", res.data)
                if (!res.data) res.data = []
                dispatch({
                    type: "add",
                    payload: {
                        response: {...res}
                    }
                })

                const dataLength = response.data.concat(res.data)
                const isMore = res.data.length < res.pagemeta.limit || dataLength.length >= response.pagemeta.total
                setHasMore(!isMore)

                isLoadingRef.current = false
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    const [pluginFilters, setPluginFilters] = useState<API.PluginsSearch[]>([])
    // 获取所有过滤条件统计数据
    const fetchPluginFilters = useMemoizedFn(() => {
        apiFetchGroupStatisticsCheck().then((res) => {
            setPluginFilters(res.data)
        })
    })

    /**
     * @name 数据初始化
     * @param noRefresh 初始化时不刷新列表数据
     */
    const onInit = useMemoizedFn((noRefresh?: boolean) => {
        setShowPluginIndex(0)
        fetchPluginFilters()
        if (!noRefresh) fetchList(true)
    })

    // 页面初始化的首次列表请求
    useEffect(() => {
        onInit()
    }, [])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })

    // 关键词|作者搜索
    // 触发列表的搜索(未完成)
    const onKeywordAndUser = useDebounceFn(
        useMemoizedFn((value: PluginSearchParams) => {
            fetchList(true)
        }),
        {wait: 500}
    )
    // 过滤条件搜索
    useDebounceEffect(
        () => {
            fetchList(true)
        },
        [filters],
        {wait: 500}
    )
    const onFilter = useMemoizedFn((value: Record<string, API.PluginsSearchData[]>) => {
        setFilters({...value})
    })
    const onSetActive = useMemoizedFn((status: TypeSelectOpt[]) => {
        const newStatus: API.PluginsSearchData[] = status.map((ele) => ({
            value: ele.key,
            label: ele.name,
            count: 0
        }))
        setFilters({...filters, status: newStatus})
    })

    // ----- 选中插件 -----
    const [allCheck, setAllcheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<YakitPluginOnlineDetail[]>([])
    // 选中插件的uuid集合
    const selectUUIDs = useMemo(() => {
        return getSelectList().map((item) => item.uuid)
    }, [selectList])
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
    const [downloadLoading, setDownloadLoading] = useState<boolean>(false)
    // 批量下载(首页批量下载和详情批量下载共用一个方法)
    const onBatchDownload = useMemoizedFn((newParams?: BackInfoProps) => {
        // 选中插件数量
        let selectTotal: number = selectNum
        // 选中插件UUID
        let selectUuids: string[] = [...selectUUIDs]
        // 搜索内容
        let downloadSearch: PluginSearchParams = {...searchs}
        // 搜索筛选条件
        let downloadFilter: PluginFilterParams = {...filters}

        if (newParams) {
            selectTotal = newParams.allCheck ? response.pagemeta.total : newParams.selectList.length
            selectUuids = newParams.selectList.map((item) => item.uuid)
            downloadSearch = {...newParams.search}
            downloadFilter = {...newParams.filter}
        }

        if (selectTotal === 0) {
            // 全部下载
            setShowBatchDownload(true)
        } else {
            // 批量下载
            let downloadRequest: DownloadOnlinePluginsRequest = {}
            if (allCheck) {
                downloadRequest = {...convertDownloadOnlinePluginBatchRequestParams(downloadFilter, downloadSearch)}
            } else {
                downloadRequest = {
                    UUID: selectUuids
                }
            }
            if (downloadLoading) return
            setDownloadLoading(true)
            apiDownloadPluginCheck(downloadRequest)
                .then(() => {
                    fetchList(true)
                })
                .finally(() => {
                    setTimeout(() => {
                        setDownloadLoading(false)
                    }, 200)
                })
        }
    })
    /** 单个插件下载 */
    const onDownload = useLockFn(async (value: YakitPluginOnlineDetail) => {
        let downloadRequest: DownloadOnlinePluginsRequest = {
            UUID: [value.uuid]
        }

        apiDownloadPluginCheck(downloadRequest).then(() => {})
    })

    /** 批量删除插件 */
    // 原因窗口(删除|不通过)
    const [showReason, setShowReason] = useState<{visible: boolean; type: "nopass" | "del"}>({
        visible: false,
        type: "nopass"
    })
    // 单项插件删除
    const activeDelPlugin = useRef<YakitPluginOnlineDetail>()
    const onShowDelPlugin = useMemoizedFn(() => {
        setShowReason({visible: true, type: "del"})
    })
    const onCancelReason = useMemoizedFn(() => {
        activeDelPlugin.current = undefined
        activeDetailData.current = undefined
        setShowReason({visible: false, type: "nopass"})
    })
    // 删除插件集合接口
    const apiDelPlugins = useMemoizedFn((params?: API.PluginsWhereDeleteRequest, thenCallback?: () => any) => {
        setLoading(true)
        console.log("plugins method:delete", params)
        apiDeletePluginCheck(params)
            .then(() => {
                if (allCheck) setAllcheck(false)
                setSelectList([])
                setLoading(false)
                if (thenCallback) thenCallback()
            })
            .catch((e) => {
                setLoading(false)
            })
    })
    // 删除插件(首页批量|清空|单个|详情内删除共用一个方法)
    const onReasonCallback = useMemoizedFn((reason: string) => {
        const type = showReason.type
        onCancelReason()

        // 是否全选
        let delAllCheck: boolean = allCheck
        // 选中插件数量
        let selectTotal: number = selectNum
        // 选中插件UUID
        let selectUuids: string[] = [...selectUUIDs]
        // 搜索内容
        let delSearch: PluginSearchParams = {...searchs}
        // 搜索筛选条件
        let delFilter: PluginFilterParams = {...filters}

        // 如果是从详情页过来的回调事件
        if (activeDetailData.current) {
            delAllCheck = activeDetailData.current.allCheck
            selectTotal = activeDetailData.current.allCheck
                ? response.pagemeta.total
                : activeDetailData.current.selectList.length
            selectUuids = activeDetailData.current.selectList.map((item) => item.uuid)
            delSearch = {...activeDetailData.current.search}
            delFilter = {...activeDetailData.current.filter}
        }

        // 删除插件逻辑
        if (type === "del") {
            // 清空操作(无视搜索条件)
            if (selectTotal === 0 && !activeDelPlugin.current) {
                apiDelPlugins({description: reason}, onInit)
            }
            // 单个删除
            else if (!!activeDelPlugin.current) {
                let delRequest: API.PluginsWhereDeleteRequest = {uuid: [activeDelPlugin.current.uuid]}
                apiDelPlugins({...delRequest, description: reason}, () => {
                    if (activeDelPlugin.current) {
                        dispatch({
                            type: "remove",
                            payload: {
                                itemList: [activeDelPlugin.current]
                            }
                        })
                        const index = selectUUIDs.findIndex((item) => item === activeDelPlugin.current?.uuid)
                        if (index > -1) {
                            optCheck(activeDelPlugin.current, false)
                        }
                        onInit(true)
                    }
                })
            }
            // 批量删除
            else if (!activeDelPlugin.current) {
                let delRequest: API.PluginsWhereDeleteRequest = {}
                if (delAllCheck) {
                    delRequest = {...convertPluginsRequestParams(delFilter, delSearch), description: reason}
                } else {
                    delRequest = {uuid: selectUuids, description: reason}
                }
                apiDelPlugins(delRequest, onInit)
            }
        }
    })

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(false)

    // 当前展示的插件序列
    const showPluginIndex = useRef<number>(0)
    const setShowPluginIndex = useMemoizedFn((index: number) => {
        showPluginIndex.current = index
    })

    const [plugin, setPlugin] = useState<YakitPluginOnlineDetail | undefined>()

    // 单项组件-相关操作和展示组件逻辑
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakitPluginOnlineDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.filter((item) => item.uuid !== data.uuid))
            setAllcheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data])
        else setSelectList(getSelectList().filter((item) => item.uuid !== data.uuid))
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        return statusTag[`${data.status}`]
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakitPluginOnlineDetail) => {
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
                                activeDelPlugin.current = data
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
    const optClick = useMemoizedFn((data: YakitPluginOnlineDetail) => {
        setPlugin({...data})
    })

    // 详情页-相关回调逻辑
    /** 返回事件 */
    const onBack = useMemoizedFn((data: BackInfoProps) => {
        setPlugin(undefined)
    })
    /** 搜索事件 */
    const onDetailSearch = useMemoizedFn((detailSearch: PluginSearchParams, detailFilter: PluginFilterParams) => {
        setSearchs({...detailSearch})
        // 延时是防止同时赋值后的搜索拿不到最新的搜索条件数据
        setTimeout(() => {
            setFilters({...detailFilter})
        }, 100)
    })
    /** 删除插件事件 */
    const activeDetailData = useRef<BackInfoProps>()
    const onDetailDel = useMemoizedFn((detail: YakitPluginOnlineDetail | undefined, data: BackInfoProps) => {
        activeDelPlugin.current = detail
        activeDetailData.current = {...data}
        onShowDelPlugin()
    })

    return (
        <div ref={layoutRef} className={styles["plugin-manage-layout"]}>
            <OnlineJudgment isJudgingLogin={true}>
                {!!plugin && (
                    <PluginManageDetail
                        response={response}
                        dispatch={dispatch}
                        info={plugin}
                        defaultAllCheck={allCheck}
                        defaultSelectList={selectList}
                        defaultSearch={searchs}
                        defaultFilter={filters}
                        downloadLoading={downloadLoading}
                        onBatchDownload={onBatchDownload}
                        onPluginDel={onDetailDel}
                        currentIndex={showPluginIndex.current}
                        setCurrentIndex={setShowPluginIndex}
                        onBack={onBack}
                        loadMoreData={onUpdateList}
                        onDetailSearch={onDetailSearch}
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
                                {!isCommunityEdition() && (
                                    <FuncBtn
                                        maxWidth={1150}
                                        icon={<OutlinePluscircleIcon />}
                                        disabled={selectList.length === 0}
                                        type='outline2'
                                        size='large'
                                        name={"添加至分组"}
                                        onClick={onAddGroup}
                                    />
                                )}
                                <FuncBtn
                                    maxWidth={1150}
                                    icon={<OutlinePencilaltIcon />}
                                    disabled={selectList.length === 0}
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
                                    loading={downloadLoading}
                                    name={selectNum > 0 ? "下载" : "一键下载"}
                                    onClick={() => onBatchDownload()}
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
                        onSelect={onFilter}
                        groupList={pluginFilters}
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
                            {initTotal > 0 ? (
                                <ListShowContainer<YakitPluginOnlineDetail>
                                    id='pluginManage'
                                    isList={isList}
                                    data={response.data}
                                    gridNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                        const {data} = info
                                        const check = allCheck || selectUUIDs.includes(data.uuid)
                                        return (
                                            <GridLayoutOpt
                                                data={data}
                                                checked={check}
                                                onCheck={optCheck}
                                                title={info.index + data.script_name}
                                                type={data.type}
                                                tags={data.tags}
                                                help={data.help || ""}
                                                img={data.head_img || ""}
                                                user={data.authors || ""}
                                                time={data.updated_at}
                                                isCorePlugin={!!data.isCorePlugin}
                                                official={data.official}
                                                subTitle={optSubTitle}
                                                extraFooter={optExtraNode}
                                                onClick={optClick}
                                            />
                                        )
                                    }}
                                    gridHeight={210}
                                    listNode={(info: {index: number; data: YakitPluginOnlineDetail}) => {
                                        const {data} = info
                                        const check = allCheck || selectUUIDs.includes(data.uuid)
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
                                                isCorePlugin={!!data.isCorePlugin}
                                                official={data.official}
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
                                    isShowSearchResultEmpty={+response.pagemeta.total === 0}
                                />
                            ) : (
                                <YakitEmpty title='暂无数据' style={{marginTop: 80}} />
                            )}
                        </PluginsList>
                    </PluginsContainer>
                </PluginsLayout>

                <ModifyAuthorModal
                    visible={showModifyAuthor}
                    setVisible={setShowModifyAuthor}
                    plugins={selectUUIDs}
                    onOK={onModifyAuthor}
                />
                <ReasonModal
                    visible={showReason.visible}
                    setVisible={onCancelReason}
                    type={showReason.type}
                    total={!!activeDelPlugin.current ? 1 : selectNum || response.pagemeta.total}
                    onOK={onReasonCallback}
                />
                {showBatchDownload && (
                    <YakitGetOnlinePlugin
                        listType='check'
                        visible={showBatchDownload}
                        setVisible={(v) => {
                            setShowBatchDownload(v)
                        }}
                    />
                )}
            </OnlineJudgment>
        </div>
    )
}

interface ModifyAuthorModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    plugins: string[]
    onOK: () => any
}
/** @name 批量修改插件作者 */
const ModifyAuthorModal: React.FC<ModifyAuthorModalProps> = memo((props) => {
    const {visible, setVisible, plugins, onOK} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [list, setList] = useState<API.UserList[]>([])
    const [value, setValue] = useState<number>()
    const {run} = useDebounceFn(
        (value?: string) => {
            if (!value) {
                setList([])
                return
            }
            if (loading) return

            setLoading(true)
            NetWorkApi<{keywords: string}, API.UserOrdinaryResponse>({
                method: "get",
                url: "user/ordinary",
                params: {keywords: value}
            })
                .then((res) => {
                    setList(res?.data || [])
                })
                .catch((err) => {
                    yakitNotify("error", "获取普通用户失败：" + err)
                })
                .finally(() => {
                    setTimeout(() => setLoading(false), 200)
                })
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

        setSubmitLoading(true)
        NetWorkApi<API.UpPluginsUserRequest, API.ActionSucceeded>({
            method: "post",
            url: "up/plugins/user",
            data: {uuid: plugins, user_id: +value}
        })
            .then((res) => {
                onOK()
            })
            .catch((err) => {
                yakitNotify("error", "批量修改失败，原因:" + err)
            })
            .finally(() => {
                setTimeout(() => setSubmitLoading(false), 200)
            })
    })
    const cancel = useMemoizedFn(() => {
        if (submitLoading) return
        setVisible(false)
    })

    useEffect(() => {
        if (!visible) {
            setList([])
            setValue(undefined)
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
                            共选择了 <span className={styles["modify-author-hint-span"]}>{plugins.length || 0}</span>{" "}
                            个插件
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
                                    <AuthorImg size='small' src={item.head_img || ""} />
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

interface PluginsGroupBtnProps {}
/** */
// const PluginsGroupBtn: React.FC<PluginsGroupBtnProps> = memo((props) => {
//     const {} = props

//     const menuData = [
//         {
//             title: "加入分组",
//             number: 10,
//             onClickBatch: () => {
//                 const m = showModal({
//                     width: "40%",
//                     content: (
//                         <AddPluginGroup
//                             onRefList={onRefList}
//                             onClose={() => m.destroy()}
//                             selectedRowKeysRecordOnline={selectedRowKeysRecordOnline}
//                             isSelectAllOnline={isSelectAllOnline}
//                             queryOnline={queryOnline}
//                         />
//                     )
//                 })
//                 return m
//             }
//         },
//         {
//             title: "编辑分组",
//             number: 10,
//             onClickBatch: () => {
//                 const n = showModal({
//                     width: "35%",
//                     content: (
//                         <RemovePluginGroup
//                             onRefList={onRefList}
//                             onClose={() => n.destroy()}
//                             selectedRowKeysRecordOnline={selectedRowKeysRecordOnline}
//                             isSelectAllOnline={isSelectAllOnline}
//                             queryOnline={queryOnline}
//                         />
//                     )
//                 })
//                 return n
//             }
//         }
//     ]

//     return (
//         <YakitPopover
//             overlayClassName={style["http-history-table-drop-down-popover"]}
//             content={
//                 <Menu className={style["http-history-table-drop-down-batch"]}>
//                     {menuData.map((m) => {
//                         return (
//                             <Menu.Item
//                                 onClick={() => {
//                                     m.onClickBatch()
//                                 }}
//                                 key={m.title}
//                             >
//                                 {m.title}
//                             </Menu.Item>
//                         )
//                     })}
//                 </Menu>
//             }
//             trigger='click'
//             placement='bottomLeft'
//         >
//             <Button
//                 style={{margin: "0 12px 0 0"}}
//                 size='small'
//                 onClick={(e) => {
//                     e.stopPropagation()
//                 }}
//             >
//                 插件分组
//                 <ChevronDownIcon style={{color: "#85899E"}} />
//             </Button>
//         </YakitPopover>
//     )
// })
