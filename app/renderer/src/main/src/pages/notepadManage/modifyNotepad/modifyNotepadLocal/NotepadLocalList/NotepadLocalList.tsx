import React, {useEffect, useRef, useState} from "react"
import {NotepadLocalListProps} from "./NotepadLocalListType"
import styles from "./NotepadLocalList.module.scss"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {
    grpcQueryNote,
    grpcQueryNoteById,
    grpcDeleteNote,
    Note,
    NoteFilter,
    QueryNoteResponse
} from "@/pages/notepadManage/notepadManage/utils"
import {defaultNoteFilter} from "@/defaultConstants/ModifyNotepad"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import classNames from "classnames"
import {useGoEditNotepad} from "@/pages/notepadManage/hook/useGoEditNotepad"
import {NotepadRemoteGV} from "@/enums/notepad"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineExportIcon, OutlineImportIcon, OutlinePlusIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {Dropdown, Tooltip} from "antd"
import {
    NotepadExport,
    NotepadImport
} from "@/pages/notepadManage/notepadManage/notepadManageLocal/NotepadImportAndExport"
import {formatTimestamp} from "@/utils/timeUtil"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {cloneDeep} from "lodash"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const NotepadLocalList: React.FC<NotepadLocalListProps> = React.memo((props) => {
    const {noteId} = props
    const {goEditNotepad, goAddNotepad} = useGoEditNotepad()

    const [keyWord, setKeyWord] = useState<string>("")
    const [refresh, setRefresh] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [response, setResponse] = useState<QueryNoteResponse>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })
    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [exportFilter, setExportFilter] = useState<NoteFilter>(cloneDeep(defaultNoteFilter))
    const [importVisible, setImportVisible] = useState<boolean>(false)

    const searchKeywordsRef = useRef<YakitAutoCompleteRefProps>({...defYakitAutoCompleteRef})
    const notepadLocalListRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(notepadLocalListRef)
    const isLoadedRef = useRef(false)
    const {t, i18n} = useI18nNamespaces(["yakitUi", "notepad"])

    /** 首次可见时加载数据 */
    useEffect(() => {
        if (!inViewPort || isLoadedRef.current) return
        isLoadedRef.current = true
        getList()
    }, [inViewPort])

    /** 事件/搜索等触发的刷新 */
    useEffect(() => {
        if (!isLoadedRef.current) return
        getList()
    }, [refresh])

    useEffect(() => {
        const onRefreshList = () => setRefresh((v) => !v)
        emiter.on("refreshNotepadLocalList", onRefreshList)
        return () => {
            emiter.off("refreshNotepadLocalList", onRefreshList)
        }
    }, [])

    const getList = useMemoizedFn(async (page?: number) => {
        const currentPage = page || 1
        if (currentPage === 1) setSpinning(true)
        setLoading(true)
        try {
            const res = await grpcQueryNote({
                Filter: {...defaultNoteFilter, Keyword: keyWord ? [keyWord] : []},
                Pagination: {...genDefaultPagination(20), OrderBy: "updated_at", Page: currentPage}
            })
            if (!res.Data) res.Data = []
            const newPage = +res.Pagination.Page
            const data = newPage === 1 ? res.Data : [...response.Data, ...res.Data]
            setHasMore(data.length < +res.Total)
            setResponse({Data: data, Pagination: res.Pagination, Total: res.Total})
            if (newPage === 1) {
                setIsRef(!isRef)
                setAllCheck(false)
                setSelectedRowKeys([])
            }
        } catch (error) {}
        setTimeout(() => {
            setLoading(false)
            setSpinning(false)
        }, 300)
    })

    const loadMoreData = useMemoizedFn(() => getList(+response.Pagination.Page + 1))

    const onSearch = useMemoizedFn((value) => {
        if (value) searchKeywordsRef.current?.onSetRemoteValues(value)
        setRefresh((v) => !v)
    })

    const goNotepadDetail = useMemoizedFn((rowData: Note) => {
        if (noteId === rowData.Id) return
        setSpinning(true)
        grpcQueryNoteById(rowData.Id)
            .then((res) => goEditNotepad({notepadHash: `${res.Id}`, title: res.Title}))
            .finally(() => setTimeout(() => setSpinning(false), 200))
    })

    const selectNumber = useCreation(() => {
        return allCheck ? +response.Total : selectedRowKeys.length
    }, [allCheck, selectedRowKeys.length, response.Total])

    const getActionFilter = useMemoizedFn((): NoteFilter => {
        if (allCheck) return {...defaultNoteFilter, Title: keyWord ? [keyWord] : [], Id: []}
        return {...cloneDeep(defaultNoteFilter), Id: selectedRowKeys}
    })

    const onToggleSelect = useMemoizedFn((id: number) => {
        if (selectedRowKeys.includes(id)) {
            setAllCheck(false)
            setSelectedRowKeys((prev) => prev.filter((k) => k !== id))
        } else {
            setSelectedRowKeys((prev) => [...prev, id])
        }
    })

    const onToggleAllCheck = useMemoizedFn(() => {
        setAllCheck((prev) => {
            setSelectedRowKeys(prev ? [] : response.Data.map((item) => item.Id))
            return !prev
        })
    })

    const onRemove = useMemoizedFn((filter: NoteFilter) => {
        setSpinning(true)
        grpcDeleteNote({Filter: filter})
            .then(() => setRefresh((v) => !v))
            .finally(() => setTimeout(() => setSpinning(false), 200))
    })

    const onExport = useMemoizedFn((filter: NoteFilter) => {
        setExportFilter(filter)
        setExportVisible(true)
    })

    const singleFilter = useMemoizedFn((record: Note): NoteFilter => {
        return {...cloneDeep(defaultNoteFilter), Id: [record.Id]}
    })

    const getContainer = useMemoizedFn(() => {
        return document.getElementById(`main-operator-page-body-${YakitRoute.Modify_Notepad}`) || undefined
    })

    return (
        <div className={styles["notepad-local-list-body"]} ref={notepadLocalListRef}>
            <div className={styles["notepad-list-header"]}>
                <YakitAutoComplete
                    ref={searchKeywordsRef}
                    isCacheDefaultValue={false}
                    cacheHistoryDataKey={NotepadRemoteGV.NotepadLocalListSearch}
                    onSelect={(v) => {
                        setKeyWord(v)
                        onSearch(v)
                    }}
                    value={keyWord}
                    isInit={false}
                >
                    <YakitInput.Search
                        value={keyWord}
                        onChange={(e) => setKeyWord(e.target.value)}
                        onSearch={onSearch}
                        size='small'
                    />
                </YakitAutoComplete>
                <div className={styles["notepad-list-header-btns"]}>
                    <Tooltip title={t("YakitButton.import")}>
                        <YakitButton
                            className={styles["icon-16"]}
                            type='text2'
                            icon={<OutlineImportIcon />}
                            size='small'
                            onClick={() => setImportVisible(true)}
                        />
                    </Tooltip>
                    <YakitPopconfirm
                        title={
                            selectNumber > 0
                                ? t("NotepadManageLocalList.confirmDeleteSelected")
                                : t("NotepadManageLocalList.confirmDeleteAll")
                        }
                        onConfirm={() => onRemove(getActionFilter())}
                    >
                        <Tooltip title={t("YakitButton.delete")}>
                            <YakitButton
                                className={styles["icon-16"]}
                                type='text'
                                danger
                                icon={<OutlineTrashIcon />}
                                disabled={!response.Total}
                            />
                        </Tooltip>
                    </YakitPopconfirm>
                    <Tooltip title={t("YakitButton.export")}>
                        <YakitButton
                            className={styles["icon-16"]}
                            type='text2'
                            icon={<OutlineExportIcon />}
                            size='small'
                            onClick={() => onExport(getActionFilter())}
                            disabled={!response.Total}
                        />
                    </Tooltip>
                    <Tooltip title={t("YakitButton.new")}>
                        <YakitButton
                            className={styles["icon-16"]}
                            type='primary'
                            icon={<OutlinePlusIcon />}
                            size='small'
                            onClick={() => goAddNotepad()}
                        />
                    </Tooltip>
                </div>
            </div>
            {+response.Total > 0 && (
                <div className={styles["notepad-list-table-header"]}>
                    <YakitCheckbox checked={allCheck} onChange={onToggleAllCheck} />
                    <span className={styles["notepad-col-title"]}>{t("NotepadLocalList.title")}</span>
                    <span className={styles["notepad-col-time"]}>{t("NotepadLocalList.lastUpdateTime")}</span>
                </div>
            )}
            <YakitSpin spinning={spinning}>
                <RollingLoadList<Note>
                    data={response.Data}
                    loadMoreData={loadMoreData}
                    renderRow={(rowData: Note) => {
                        const isSelected = allCheck || selectedRowKeys.includes(rowData.Id)
                        const isActive = noteId === rowData.Id
                        return (
                            <Dropdown
                                overlay={
                                    <YakitMenu
                                        data={[
                                            {
                                                key: "export",
                                                label: t("YakitButton.export"),
                                                itemIcon: <OutlineExportIcon />
                                            },
                                            {
                                                key: "delete",
                                                label: t("YakitButton.delete"),
                                                type: "danger",
                                                itemIcon: <OutlineTrashIcon />
                                            }
                                        ]}
                                        onClick={({key}) => {
                                            key === "export" && onExport(singleFilter(rowData))
                                            key === "delete" && onRemove(singleFilter(rowData))
                                        }}
                                    />
                                }
                                trigger={["contextMenu"]}
                            >
                                <div
                                    className={classNames(styles["notepad-row-item"], {
                                        [styles["notepad-row-item-active"]]: isActive
                                    })}
                                    onClick={() => goNotepadDetail(rowData)}
                                >
                                    <YakitCheckbox
                                        checked={isSelected}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => onToggleSelect(rowData.Id)}
                                    />
                                    <Tooltip title={rowData.Title}>
                                        <span className={classNames(styles["notepad-col-title"], "content-ellipsis")}>
                                            {rowData.Title}
                                        </span>
                                    </Tooltip>
                                    <span className={styles["notepad-col-time"]}>
                                        {formatTimestamp(rowData.UpdateAt)}
                                    </span>
                                </div>
                            </Dropdown>
                        )
                    }}
                    classNameRow={styles["notepad-row"]}
                    classNameList={styles["notepad-list"]}
                    page={response.Pagination.Page}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={40}
                    rowKey='id'
                    isRef={isRef}
                />
            </YakitSpin>
            {exportVisible && (
                <NotepadExport
                    filter={exportFilter}
                    onClose={() => setExportVisible(false)}
                    getContainer={getContainer()}
                />
            )}
            {importVisible && (
                <NotepadImport
                    onClose={() => setImportVisible(false)}
                    onImportSuccessAfter={() => setRefresh((v) => !v)}
                    getContainer={getContainer()}
                />
            )}
        </div>
    )
})

export default NotepadLocalList
