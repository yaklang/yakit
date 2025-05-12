import React, {useEffect, useRef, useState} from "react"
import {NotepadLocalActionProps, NotepadManageLocalListProps, NotepadManageLocalProps} from "./NotepadManageLocalType"
import {
    DeleteNoteRequest,
    Note,
    NoteFilter,
    QueryNoteRequest,
    QueryNoteResponse,
    grpcDeleteNote,
    grpcQueryNote,
    grpcQueryNoteById
} from "../utils"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {cloneDeep} from "lodash"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondownIcon,
    OutlineChevronupIcon,
    OutlineExportIcon,
    OutlineImportIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineSearchIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {useCreation, useDebounceFn, useInViewport, useMemoizedFn} from "ahooks"
import styles from "./NotepadManageLocal.module.scss"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {defaultNoteFilter} from "@/defaultConstants/ModifyNotepad"
import {Divider} from "antd"
import {timeMap} from "../NotepadManage"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import SearchResultEmpty from "@/assets/search_result_empty.png"
import {YakitVirtualList} from "@/components/yakitUI/YakitVirtualList/YakitVirtualList"
import {VirtualListColumns} from "@/components/yakitUI/YakitVirtualList/YakitVirtualListType"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {NotepadExport, NotepadImport} from "./NotepadImportAndExport"
import {usePageInfo} from "@/store/pageInfo"
import {YakitRoute} from "@/enums/yakitRoute"
import {shallow} from "zustand/shallow"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakitTabsProps} from "@/components/yakitSideTab/YakitSideTabType"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {useGoEditNotepad} from "../../hook/useGoEditNotepad"

const NotepadLocalSearch = React.lazy(() => import("./NotepadLocalSearch"))

const yakitTab: YakitTabsProps[] = [
    {
        icon: <OutlineSearchIcon />,
        label: "全文搜索",
        value: "全文搜索"
    }
]
const NotepadManageLocal: React.FC<NotepadManageLocalProps> = React.memo((props) => {
    const [activeKey, setActiveKey] = useState<string>("全文搜索")
    const [show, setShow] = useState<boolean>(true)
    return (
        <>
            <YakitResizeBox
                freeze={show}
                lineDirection='right'
                firstRatio={show ? "260px" : "25px"}
                firstNodeStyle={show ? {padding: 0} : {padding: 0, maxWidth: 25}}
                firstMinSize={show ? 260 : 25}
                secondMinSize={600}
                firstNode={
                    <div className={styles["note-local-left"]}>
                        <YakitSideTab
                            show={show}
                            setShow={setShow}
                            yakitTabs={yakitTab}
                            activeKey={activeKey}
                            onActiveKey={setActiveKey}
                        />
                        <NotepadLocalSearch />
                    </div>
                }
                secondNodeStyle={show ? {overflow: "unset", padding: 0} : {padding: 0, minWidth: "calc(100% - 25px)"}}
                secondNode={<NotepadManageLocalList />}
            />
        </>
    )
})
export default NotepadManageLocal

const defaultQueryNoteRequest = {
    Filter: cloneDeep(defaultNoteFilter),
    Pagination: genDefaultPagination(20)
}

const timeShow = {
    created_at: "CreateAt",
    updated_at: "UpdateAt"
}
const NotepadManageLocalList: React.FC<NotepadManageLocalListProps> = (props) => {
    const {goAddNotepad} = useGoEditNotepad()
    const [pageLoading, setPageLoading] = useState<boolean>(false)

    const [refresh, setRefresh] = useState<boolean>(true)
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

    const [keyWord, setKeyWord] = useState<string>("")
    const [query, setQuery] = useState<QueryNoteRequest>(cloneDeep(defaultQueryNoteRequest))
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [listLoading, setListLoading] = useState<boolean>(true)
    const [response, setResponse] = useState<QueryNoteResponse>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })

    const [sorterKey, setSorterKey] = useState<string>("updated_at")
    const [timeSortVisible, setTimeSortVisible] = useState<boolean>(false)

    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [importVisible, setImportVisible] = useState<boolean>(false)

    const totalRef = useRef<number>(0)
    const notepadRef = useRef<HTMLDivElement>(null)

    const [inViewPort = true] = useInViewport(notepadRef)

    useEffect(() => {
        getList()
        fetchInitTotal()
    }, [inViewPort, refresh])

    const getFilter = useCreation(() => {
        return {
            ...query.Filter,
            Keyword: [keyWord]
        }
    }, [keyWord])
    const actionFilter = useCreation(() => {
        const filter = allCheck ? getFilter : cloneDeep(defaultNoteFilter)
        return allCheck
            ? {
                  ...filter,
                  Id: []
              }
            : {
                  ...filter,
                  Id: selectedRowKeys.map((ele) => +ele)
              }
    }, [getFilter, allCheck, selectedRowKeys])

    const columns: VirtualListColumns<Note>[] = useCreation(() => {
        return [
            {
                title: "标题",
                dataIndex: "Title"
            },
            {
                title: "最近更新时间",
                dataIndex: timeShow[sorterKey],
                render: (text, record: Note) => <div className={styles["time-cell"]}>{formatTimestamp(text)}</div>,
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
                                    setRefresh(!refresh)
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
                render: (_, record: Note) => (
                    <>
                        <NotepadLocalAction
                            record={record}
                            onSingleRemoveAfter={() => {
                                setResponse((prev) => ({
                                    ...prev,
                                    Data: prev.Data.filter((ele) => ele.Id !== record.Id),
                                    Total: +prev.Total - 1
                                }))
                            }}
                        />
                    </>
                )
            }
        ]
    }, [sorterKey, timeSortVisible])

    const selectNumber = useCreation(() => {
        if (allCheck) {
            return +response.Total
        } else {
            return selectedRowKeys.length
        }
    }, [allCheck, selectedRowKeys.length, response.Total])

    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], selected: Note[], checked: boolean) => {
        setAllCheck(checked)
        setSelectedRowKeys(newSelectedRowKeys)
    })

    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, key: string, selectedRows: Note) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, key])
        } else {
            setAllCheck(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== key)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })

    const fetchInitTotal = useMemoizedFn(() => {
        grpcQueryNote({
            ...defaultQueryNoteRequest,
            Pagination: {
                ...genDefaultPagination(1, 1)
            }
        })
            .then((res) => {
                totalRef.current = +res.Total
            })
            .catch(() => {})
    })

    const getList = useDebounceFn(
        useMemoizedFn(async (page?: number) => {
            setListLoading(true)
            const newQuery: QueryNoteRequest = {
                Filter: getFilter,
                Pagination: {
                    ...query.Pagination,
                    OrderBy: sorterKey,
                    Page: page || 1
                }
            }
            try {
                const res = await grpcQueryNote(newQuery)
                if (!res.Data) res.Data = []
                const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                let newRes: QueryNoteResponse = {
                    Data: +res?.Pagination.Page === 1 ? res?.Data : [...response.Data, ...(res?.Data || [])],
                    Pagination: res?.Pagination || {
                        ...genDefaultPagination(20)
                    },
                    Total: res.Total
                }
                setResponse(newRes)
                if (+res.Pagination.Page === 1) {
                    onSelectAll([], [], false)
                } else {
                    if (allCheck) {
                        const newSelectedRowKeys: string[] = response.Data.map((ele) => `${ele.Id}`)
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

    const loadMoreData = useDebounceFn(
        () => {
            getList(+response.Pagination.Page + 1)
        },
        {wait: 200, leading: true}
    ).run

    const onBatchRemove = useMemoizedFn(() => {
        let removeParams: DeleteNoteRequest = {
            Filter: actionFilter
        }

        setPageLoading(true)
        grpcDeleteNote(removeParams)
            .then(() => {
                setRefresh(!refresh)
            })
            .finally(() =>
                setTimeout(() => {
                    setPageLoading(false)
                }, 200)
            )
    })
    /** 搜索内容 */
    const onSearch = useMemoizedFn((val: string) => {
        setKeyWord(val)
        setRefresh(!refresh)
    })

    const onBatchExport = useMemoizedFn(() => {
        setExportVisible(true)
    })

    const onBatchImport = useMemoizedFn(() => {
        setImportVisible(true)
    })

    return (
        <YakitSpin spinning={pageLoading}>
            <div className={styles["notepad-manage"]} ref={notepadRef}>
                <div className={styles["notepad-manage-heard"]}>
                    <div className={styles["heard-title"]}>
                        <span className='content-ellipsis'>记事本管理</span>
                        <TableTotalAndSelectNumber total={response.Total} selectNum={selectNumber} />
                    </div>
                    <div className={styles["heard-extra"]}>
                        <YakitInput.Search
                            value={keyWord}
                            onChange={(e) => setKeyWord(e.target.value)}
                            onSearch={onSearch}
                        />
                        <Divider type='vertical' style={{margin: 0}} />
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
                            icon={<OutlineExportIcon />}
                            disabled={totalRef.current === 0}
                            onClick={onBatchExport}
                            loading={pageLoading}
                        >
                            批量导出
                        </YakitButton>
                        <YakitButton type='outline2' icon={<OutlineImportIcon />} onClick={onBatchImport}>
                            导入
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton type='primary' icon={<OutlinePlusIcon />} onClick={() => goAddNotepad()}>
                            新建
                        </YakitButton>
                    </div>
                </div>
                {totalRef.current === 0 || +response.Total === 0 ? (
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
                    <YakitVirtualList<Note>
                        loading={listLoading}
                        hasMore={hasMore}
                        columns={columns}
                        data={response.Data}
                        page={+(response.Pagination.Page || 1)}
                        loadMoreData={loadMoreData}
                        renderKey='Id'
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys,
                            onSelectAll: onSelectAll,
                            onChangeCheckboxSingle
                        }}
                    />
                )}
            </div>
            {exportVisible && <NotepadExport filter={actionFilter} onClose={() => setExportVisible(false)} />}
            {importVisible && (
                <NotepadImport
                    onClose={() => setImportVisible(false)}
                    onImportSuccessAfter={() => setRefresh(!refresh)}
                />
            )}
        </YakitSpin>
    )
}

const NotepadLocalAction: React.FC<NotepadLocalActionProps> = React.memo((props) => {
    const {record, onSingleRemoveAfter} = props
    const [removeItemLoading, setRemoveItemLoading] = useState<boolean>(false)
    const [editLoading, setEditLoading] = useState<boolean>(false)
    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const {goEditNotepad} = useGoEditNotepad()
    const filterRef = useRef<NoteFilter>({
        ...cloneDeep(defaultNoteFilter),
        Id: [record.Id]
    })

    const onEdit = useMemoizedFn(() => {
        setEditLoading(true)
        grpcQueryNoteById(record.Id)
            .then((res) => {
                goEditNotepad({notepadHash: `${res.Id}`, title: res.Title})
            })
            .finally(() => {
                setTimeout(() => {
                    setEditLoading(false)
                }, 200)
            })
    })

    const onExport = useMemoizedFn(() => {
        setExportVisible(true)
    })

    const onSingleRemove = useMemoizedFn(() => {
        const removeParams: DeleteNoteRequest = {
            Filter: filterRef.current
        }
        setRemoveItemLoading(true)
        grpcDeleteNote(removeParams)
            .then(() => {
                onSingleRemoveAfter()
            })
            .finally(() =>
                setTimeout(() => {
                    setRemoveItemLoading(false)
                }, 200)
            )
    })

    return (
        <div>
            <YakitButton
                type='text2'
                icon={<OutlinePencilaltIcon />}
                onClick={onEdit}
                loading={editLoading}
                disabled={removeItemLoading}
            />

            <Divider type='vertical' style={{margin: "0 8px"}} />

            <YakitButton type='text2' icon={<OutlineExportIcon />} onClick={onExport} />

            <Divider type='vertical' style={{margin: "0 8px"}} />
            <YakitPopconfirm title='确定要删掉该文档吗' onConfirm={() => onSingleRemove()}>
                <YakitButton type='text' danger loading={removeItemLoading} icon={<OutlineTrashIcon />} />
            </YakitPopconfirm>
            {exportVisible && <NotepadExport filter={filterRef.current} onClose={() => setExportVisible(false)} />}
        </div>
    )
})
