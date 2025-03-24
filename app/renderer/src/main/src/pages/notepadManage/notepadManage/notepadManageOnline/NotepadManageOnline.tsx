import React, {useEffect, useRef, useState} from "react"
import {NotepadOnlineProps} from "./NotepadManageOnlineType"
import {useStore} from "@/store"
import {
    OutlineChevronupIcon,
    OutlineChevrondownIcon,
    OutlineTrashIcon,
    OutlineClouddownloadIcon
} from "@/assets/icon/outline"
import {OutlinePlusIcon} from "@/assets/newIcon"
import {DownFilesModal} from "@/components/MilkdownEditor/CustomFile/CustomFile"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitVirtualList} from "@/components/yakitUI/YakitVirtualList/YakitVirtualList"
import {VirtualListColumns} from "@/components/yakitUI/YakitVirtualList/YakitVirtualListType"
import {PluginListPageMeta} from "@/pages/plugins/baseTemplateType"
import {FuncSearch} from "@/pages/plugins/funcTemplate"
import {API} from "@/services/swagger/resposeType"
import {useInViewport, useCreation, useMemoizedFn, useDebounceFn} from "ahooks"
import {Divider} from "antd"
import {NotepadAction, timeMap} from "../NotepadManage"
import {
    SaveDialogResponse,
    SearchParamsProps,
    apiGetNotepadList,
    GetNotepadRequestProps,
    convertGetNotepadRequest,
    apiDeleteNotepadDetail,
    onBaseNotepadDown,
    onOpenLocalFileByPath
} from "../utils"
import styles from "./NotepadManageOnline.module.scss"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import {formatTimestamp} from "@/utils/timeUtil"
import {useGoEditNotepad} from "../../hook/useGoEditNotepad"

const NotepadManageOnline: React.FC<NotepadOnlineProps> = React.memo((props) => {
    const userInfo = useStore((s) => s.userInfo)
    const {goAddNotepad} = useGoEditNotepad()
    const [listLoading, setListLoading] = useState<boolean>(true)
    const [pageLoading, setPageLoading] = useState<boolean>(false)

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
    const actionHashMapRef = useRef<Map<string, string>>(new Map())

    const [inViewPort = true] = useInViewport(notepadRef)

    const columns: VirtualListColumns<API.GetNotepadList>[] = useCreation(() => {
        return [
            {
                title: "文件名称",
                dataIndex: "title"
            },
            {
                title: "作者",
                dataIndex: "userName"
            },
            {
                title: "协作人",
                dataIndex: "collaborator",
                render: (text, record) =>
                    (!!record.collaborator?.length && (
                        <YakitPopover
                            content={
                                <div className={styles["collaborators-popover-content"]}>
                                    {(record.collaborator || []).map((ele) => ele.user_name).join(",")}
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
                render: (text) => <div className={styles["time-cell"]}>{formatTimestamp(text)}</div>,
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
                                    getList()
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
                render: (text, record) => {
                    return (
                        <NotepadAction
                            record={record}
                            userInfo={userInfo}
                            onSingleDownAfter={setBatchDownInfo}
                            onShareAfter={() => {
                                setRefresh(!refresh)
                            }}
                            onSingleRemoveAfter={() => {
                                setResponse((prev) => ({
                                    ...prev,
                                    data: prev.data.filter((ele) => ele.hash !== record.hash),
                                    pagemeta: {
                                        ...prev.pagemeta,
                                        total: +prev.pagemeta.total - 1
                                    }
                                }))
                            }}
                        />
                    )
                }
            }
        ]
    }, [actionHashMapRef.current, sorterKey, timeSortVisible])
    useEffect(() => {
        if (!userInfo.isLogin) return
        getList()
        fetchInitTotal()
    }, [userInfo.isLogin, inViewPort, refresh])
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
            setListLoading(true)
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
                } else {
                    if (isAllSelect) {
                        const newSelectedRowKeys: string[] = response.data.map((ele) => `${ele.id}`)
                        setSelectedRowKeys((v) => [...v, ...newSelectedRowKeys])
                    }
                }
            } catch (error) {}
            setTimeout(() => {
                setListLoading(false)
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
    const onSelectChange = useMemoizedFn((c: boolean, key: string, rows) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, key])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== key)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })

    const onBatchRemove = useMemoizedFn(() => {
        const filter = isAllSelect ? convertGetNotepadRequest(search) : {}
        const removeParams: API.DeleteNotepadRequest = {
            ...filter,
            hash: isAllSelect ? "" : selectedRowKeys?.join(",")
        }
        setPageLoading(true)
        apiDeleteNotepadDetail(removeParams)
            .then(() => {
                setRefresh(!refresh)
            })
            .finally(() =>
                setTimeout(() => {
                    setPageLoading(false)
                }, 200)
            )
    })

    const onBatchDown = useMemoizedFn(() => {
        const filter = isAllSelect ? convertGetNotepadRequest(search) : {}
        const downParams: API.NotepadDownloadRequest = {
            ...filter,
            hash: isAllSelect ? "" : selectedRowKeys?.join(",")
        }
        setPageLoading(true)
        onBaseNotepadDown(downParams)
            .then((res) => {
                setBatchDownInfo(res)
            })
            .finally(() =>
                setTimeout(() => {
                    setPageLoading(false)
                }, 200)
            )
    })

    // 下载成功打开本地文件
    const onSuccessDownload = useMemoizedFn(() => {
        if (batchDownInfo) {
            onOpenLocalFileByPath(batchDownInfo?.path)
            setBatchDownInfo(undefined)
        }
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
        <YakitSpin spinning={pageLoading}>
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
                        <YakitPopconfirm
                            title={selectNumber > 0 ? "确定要删除勾选文档吗?" : "确定要删除所有文档吗?"}
                            onConfirm={onBatchRemove}
                        >
                            <YakitButton
                                type='outline2'
                                danger
                                icon={<OutlineTrashIcon />}
                                disabled={totalRef.current === 0}
                                loading={pageLoading}
                            >
                                删除
                            </YakitButton>
                        </YakitPopconfirm>
                        <YakitButton
                            type='outline2'
                            icon={<OutlineClouddownloadIcon />}
                            disabled={totalRef.current === 0}
                            onClick={onBatchDown}
                            loading={pageLoading}
                        >
                            批量下载
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton type='primary' icon={<OutlinePlusIcon />} onClick={() => goAddNotepad()}>
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
                        loading={listLoading}
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
                        isDeleteOOSAfterEnd={true}
                        url={batchDownInfo.url}
                        path={batchDownInfo.path}
                        onCancelDownload={onCancelDownload}
                        onSuccess={onSuccessDownload}
                        visible={!!batchDownInfo.url}
                        setVisible={onCancelDownload}
                        isEncodeURI={false}
                    />
                )}
            </div>
        </YakitSpin>
    )
})

export default NotepadManageOnline
