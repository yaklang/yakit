import React, {useEffect, useRef, useState} from "react"
import {NotepadManageProps} from "./NotepadManageType"
import styles from "./NotepadManage.module.scss"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondownIcon,
    OutlineChevronupIcon,
    OutlineClouddownloadIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {Divider, Tooltip} from "antd"
import {API} from "@/services/swagger/resposeType"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import moment from "moment"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {FuncSearch} from "@/pages/plugins/funcTemplate"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {
    GetNotepadRequestProps,
    SaveDialogResponse,
    SearchParamsProps,
    apiDeleteNotepadDetail,
    apiDownloadNotepad,
    apiGetNotepadList,
    convertGetNotepadRequest,
    saveDialogAndGetLocalFileInfo
} from "./utils"
import {PluginListPageMeta} from "@/pages/plugins/baseTemplateType"
import {useStore} from "@/store"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitVirtualList} from "@/components/yakitUI/YakitVirtualList/YakitVirtualList"
import {VirtualListColumns} from "@/components/yakitUI/YakitVirtualList/YakitVirtualListType"
import {judgeAvatar} from "@/pages/MainOperator"
import {randomAvatarColor} from "@/components/layout/FuncDomain"
import {yakitNotify} from "@/utils/notification"
import {APIFunc} from "@/apiUtils/type"
import {DownFilesModal} from "@/components/MilkdownEditor/CustomFile/CustomFile"

const NotepadShareModal = React.lazy(() => import("../NotepadShareModal/NotepadShareModal"))

const timeMap = {
    created_at: "最近创建时间",
    updated_at: "最近更新时间"
}

const NotepadManage: React.FC<NotepadManageProps> = React.memo((props) => {
    const userInfo = useStore((s) => s.userInfo)
    const {notepadPageList} = usePageInfo(
        (s) => ({
            notepadPageList: s.pages.get(YakitRoute.Modify_Notepad)?.pageList || []
        }),
        shallow
    )

    const [loading, setLoading] = useState<boolean>(true)
    const [removeItemLoading, setRemoveItemLoading] = useState<boolean>(false)
    const [downItemLoading, setDownItemLoading] = useState<boolean>(false)

    const [hasMore, setHasMore] = useState<boolean>(true)
    const [timeSortVisible, setTimeSortVisible] = useState<boolean>(false)

    const [sorterKey, setSorterKey] = useState<string>("updated_at")

    const [response, setResponse] = useState<API.GetNotepadResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })

    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)

    const [refresh, setRefresh] = useState<boolean>(true)

    const [batchDownInfo, setBatchDownInfo] = useState<SaveDialogResponse>()

    // 搜索条件
    const [search, setSearch] = useState<SearchParamsProps>({keyword: "", userName: "", type: "keyword"})

    const totalRef = useRef<number>(0)
    const notepadRef = useRef<HTMLDivElement>(null)
    const actionItemRef = useRef<API.GetNotepadList>()

    const [inViewPort = true] = useInViewport(notepadRef)

    const columns: VirtualListColumns<API.GetNotepadList>[] = [
        {
            title: "文件名称",
            dataIndex: "title"
        },
        {
            title: "作者",
            dataIndex: "author",
            render: (text, record) => (
                <div className={styles["author-cell"]}>
                    {judgeAvatar(
                        {companyHeadImg: record.headImg, companyName: record.userName},
                        28,
                        randomAvatarColor()
                    )}
                    <span className='content-ellipsis'>{record.userName}</span>
                </div>
            )
        },
        {
            title: "协作人",
            dataIndex: "collaborator",
            render: (text, record) =>
                (!!record.collaborator?.length && (
                    <YakitPopover
                        content={
                            <div className={styles["collaborators-popover-content"]}>
                                {(record.collaborator || []).map((ele) => (
                                    <Tooltip
                                        destroyTooltipOnHide={true}
                                        key={ele.user_id}
                                        title={ele.user_name}
                                        placement='top'
                                    >
                                        {judgeAvatar(
                                            {companyHeadImg: ele.head_img, companyName: ele.user_name},
                                            28,
                                            randomAvatarColor()
                                        )}
                                    </Tooltip>
                                ))}
                            </div>
                        }
                        destroyTooltipOnHide={true}
                        overlayClassName={styles["collaborators-popover"]}
                    >
                        <span className='content-ellipsis'>
                            {(record.collaborator || []).map((ele) => ele.user_name).join(",")}
                        </span>
                    </YakitPopover>
                )) ||
                "-"
        },
        {
            title: "最近更新时间",
            dataIndex: sorterKey,
            render: (text) => <div className={styles["time-cell"]}>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</div>,
            filterProps: {
                filterRender: () => (
                    <YakitDropdownMenu
                        menu={{
                            data: [
                                {
                                    key: "updated_at",
                                    label: "最近更新时间"
                                },
                                {
                                    key: "created_at",
                                    label: "最近创建时间"
                                }
                            ],
                            onClick: ({key}) => {
                                setSorterKey(key)
                                setTimeSortVisible(false)
                            }
                        }}
                        dropdown={{
                            visible: timeSortVisible,
                            onVisibleChange: setTimeSortVisible
                        }}
                    >
                        <YakitButton type='text2'>
                            <span style={{marginRight: 8}}>{timeMap[sorterKey]}</span>
                            {timeSortVisible ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />}
                        </YakitButton>
                    </YakitDropdownMenu>
                )
            }
        },
        {
            title: "操作",
            dataIndex: "action",
            width: 180,
            render: (text, record) => (
                <div>
                    <YakitButton
                        type='text2'
                        icon={<OutlinePencilaltIcon />}
                        onClick={() => toModifyNotepad(record.hash)}
                    />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton type='text2' icon={<OutlineShareIcon />} onClick={() => onShare(record)} />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton
                        type='text2'
                        icon={<OutlineClouddownloadIcon />}
                        onClick={() => onSingleDown(record)}
                        loading={actionItemRef.current === record && downItemLoading}
                    />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton
                        danger
                        type='text'
                        icon={<OutlineTrashIcon />}
                        onClick={() => onSingleRemove(record)}
                        loading={actionItemRef.current === record && removeItemLoading}
                    />
                </div>
            )
        }
    ]
    useEffect(() => {
        getList()
        fetchInitTotal()
    }, [inViewPort, refresh])
    const fetchInitTotal = useMemoizedFn(() => {
        apiGetNotepadList({
            page: 1,
            limit: 1
        })
            .then((res) => {
                totalRef.current = +res.pagemeta.total
            })
            .catch(() => {})
    })
    const getList = useDebounceFn(
        useMemoizedFn(async (page?: number) => {
            setLoading(true)
            const params: PluginListPageMeta = !page
                ? {page: 1, limit: 20, order_by: sorterKey, order: "desc"}
                : {
                      page: +response.pagemeta.page + 1,
                      limit: +response.pagemeta.limit || 20,
                      order: "desc",
                      order_by: sorterKey
                  }
            const newQuery: GetNotepadRequestProps = convertGetNotepadRequest(search, params)
            try {
                const res = await apiGetNotepadList(newQuery)
                if (!res.data) res.data = []
                const length = +res.pagemeta.page === 1 ? res.data.length : res.data.length + response.data.length
                setHasMore(length < +res.pagemeta.total)
                let newRes: API.GetNotepadResponse = {
                    data: +res?.pagemeta.page === 1 ? res?.data : [...response.data, ...(res?.data || [])],
                    pagemeta: res?.pagemeta || {
                        limit: 20,
                        page: 1,
                        total: 0,
                        total_page: 1
                    }
                }
                setResponse(newRes)
                if (+res.pagemeta.page === 1) {
                    onSelectAll([], [], false)
                }
            } catch (error) {}
            setTimeout(() => {
                setLoading(false)
            }, 300)
        }),
        {wait: 200, leading: true}
    ).run
    /** 搜索内容 */
    const onSearch = useDebounceFn(
        useMemoizedFn((val: SearchParamsProps) => {
            setSearch(val)
            setRefresh(!refresh)
        }),
        {wait: 200, leading: true}
    ).run
    const loadMoreData = useDebounceFn(
        () => {
            getList(+response.pagemeta.page + 1)
        },
        {wait: 200, leading: true}
    ).run
    const onSelectAll = useMemoizedFn(
        (newSelectedRowKeys: string[], select: API.GetNotepadList[], checked: boolean) => {
            setIsAllSelect(checked)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    )
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, keys])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== keys)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })
    const toModifyNotepad = useMemoizedFn((notepadHash?: string) => {
        const current =
            notepadHash &&
            notepadPageList.find((ele) => ele.pageParamsInfo.modifyNotepadPageInfo?.notepadHash === notepadHash)
        if (current) {
            emiter.emit("switchSubMenuItem", JSON.stringify({pageId: current.pageId, forceRefresh: true}))
            emiter.emit("switchMenuItem", JSON.stringify({route: YakitRoute.Modify_Notepad}))
        } else {
            const info = {
                route: YakitRoute.Modify_Notepad,
                params: {
                    notepadHash
                }
            }
            emiter.emit("openPage", JSON.stringify(info))
        }
    })
    const onShare = useMemoizedFn((record: API.GetNotepadList) => {
        const m = showYakitModal({
            hiddenHeader: true,
            content: (
                <NotepadShareModal
                    notepadInfo={record}
                    onClose={() => {
                        m.destroy()
                        setRefresh(!refresh)
                    }}
                />
            ),
            onCancel: () => {
                m.destroy()
                setRefresh(!refresh)
            },
            footer: null
        })
    })
    const onSingleRemove = useMemoizedFn((record: API.GetNotepadList) => {
        actionItemRef.current = record
        setRemoveItemLoading(true)
        apiDeleteNotepadDetail({hash: record.hash})
            .then(() => {
                setResponse((prev) => ({
                    ...prev,
                    data: prev.data.filter((ele) => ele.hash !== record.hash)
                }))
            })
            .finally(() => {
                setTimeout(() => {
                    setRemoveItemLoading(false)
                    actionItemRef.current = undefined
                }, 200)
            })
    })
    const onBatchRemove = useMemoizedFn(() => {
        const filter = isAllSelect ? convertGetNotepadRequest(search) : {}
        const removeParams: API.DeleteNotepadRequest = {
            ...filter,
            hash: isAllSelect ? "" : selectedRowKeys?.join(",")
        }
        setLoading(true)
        apiDeleteNotepadDetail(removeParams)
            .then(() => {
                setRefresh(!refresh)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })

    const onSingleDown = useMemoizedFn((record: API.GetNotepadList) => {
        actionItemRef.current = record
        setDownItemLoading(true)
        const downParams: API.NotepadDownloadRequest = {
            hash: record.hash,
            downloadUrl: ""
        }
        onBaseDown(downParams)
            .then((res) => {
                setBatchDownInfo(res)
                yakitNotify("success", "获取下载链接成功")
            })
            .finally(() =>
                setTimeout(() => {
                    setDownItemLoading(false)
                    actionItemRef.current = undefined
                }, 200)
            )
    })

    const onBatchDown = useMemoizedFn(() => {
        const filter = isAllSelect ? convertGetNotepadRequest(search) : {}
        const downParams: API.NotepadDownloadRequest = {
            ...filter,
            hash: isAllSelect ? "" : selectedRowKeys?.join(","),
            downloadUrl: ""
        }
        setLoading(true)
        onBaseDown(downParams)
            .then((res) => {
                setBatchDownInfo(res)
                yakitNotify("success", "下载成功")
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    })
    const onBaseDown: APIFunc<API.NotepadDownloadRequest, SaveDialogResponse> = useMemoizedFn((value) => {
        return new Promise((resolve, reject) => {
            const params: API.NotepadDownloadRequest = {
                ...value
            }
            apiDownloadNotepad(params)
                .then((res) => {
                    //TODO - 等待后端给最新的接口文档
                    console.log("apiDownloadNotepad", res)
                    saveDialogAndGetLocalFileInfo((res as string) || "")
                        .then(resolve)
                        .catch(reject)
                })
                .catch(reject)
        })
    })
    const onCancelDownload = useMemoizedFn(() => {
        setBatchDownInfo(undefined)
    })
    const selectNumber = useCreation(() => {
        if (isAllSelect) {
            return +response.pagemeta.total
        } else {
            return selectedRowKeys.length
        }
    }, [isAllSelect, selectedRowKeys.length, response.pagemeta.total])
    return (
        <div className={styles["notepad-manage"]} ref={notepadRef}>
            <div className={styles["notepad-manage-heard"]}>
                <div className={styles["heard-title"]}>
                    <span>记事本管理</span>
                    <TableTotalAndSelectNumber total={response.pagemeta.total} selectNum={selectNumber} />
                </div>
                <div className={styles["heard-extra"]}>
                    <FuncSearch
                        yakitCombinationSearchProps={{
                            selectProps: {size: "small"},
                            inputSearchModuleTypeProps: {size: "middle"}
                        }}
                        value={search}
                        onChange={setSearch}
                        onSearch={onSearch}
                        includeSearchType={["keyword", "userName"]}
                    />
                    <YakitButton
                        type='outline2'
                        danger
                        icon={<OutlineTrashIcon />}
                        disabled={totalRef.current === 0}
                        onClick={() => onBatchRemove()}
                    >
                        删除
                    </YakitButton>
                    <YakitButton
                        type='outline2'
                        icon={<OutlineClouddownloadIcon />}
                        disabled={totalRef.current === 0}
                        onClick={() => onBatchDown()}
                    >
                        批量下载
                    </YakitButton>
                    <Divider type='vertical' style={{margin: 0}} />
                    <YakitButton type='primary' icon={<OutlinePlusIcon />} onClick={() => toModifyNotepad()}>
                        新建
                    </YakitButton>
                </div>
            </div>
            {totalRef.current === 0 || +response.pagemeta.total === 0 ? (
                totalRef.current === 0 ? (
                    <YakitEmpty style={{paddingTop: 48}} description='请点击右上角【新建】按钮添加数据' />
                ) : (
                    <YakitEmpty
                        image={SearchResultEmpty}
                        imageStyle={{margin: "96px auto 12px", height: 200}}
                        title='搜索结果“空”'
                    />
                )
            ) : (
                <YakitVirtualList<API.GetNotepadList>
                    loading={loading}
                    hasMore={hasMore}
                    columns={columns}
                    data={response.data}
                    page={+(response.pagemeta.page || 1)}
                    loadMoreData={loadMoreData}
                    renderKey='hash'
                    rowSelection={{
                        isAll: isAllSelect,
                        type: "checkbox",
                        selectedRowKeys,
                        onSelectAll: onSelectAll,
                        onChangeCheckboxSingle: onSelectChange,
                        getCheckboxProps: (record) => {
                            return {
                                disabled: record.userName !== userInfo.companyName
                            }
                        }
                    }}
                />
            )}
            {batchDownInfo && (
                <DownFilesModal
                    url={batchDownInfo.url}
                    path={batchDownInfo.path}
                    visible={!!batchDownInfo.url}
                    setVisible={onCancelDownload}
                    onCancelDownload={onCancelDownload}
                />
            )}
        </div>
    )
})

export default NotepadManage
