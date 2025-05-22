import React, {useEffect, useRef, useState} from "react"
import {NotepadLocalListProps} from "./NotepadLocalListType"
import styles from "./NotepadLocalList.module.scss"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {useInViewport, useMemoizedFn} from "ahooks"
import {
    grpcQueryNote,
    grpcQueryNoteById,
    Note,
    QueryNoteRequest,
    QueryNoteResponse} from "@/pages/notepadManage/notepadManage/utils"
import {defaultNoteFilter} from "@/defaultConstants/ModifyNotepad"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {RemoteGV} from "@/yakitGV"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import classNames from "classnames"
import {useGoEditNotepad} from "@/pages/notepadManage/hook/useGoEditNotepad"

const NotepadLocalList: React.FC<NotepadLocalListProps> = React.memo((props) => {
    const {noteId} = props

    const {goEditNotepad} = useGoEditNotepad()

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

    const searchKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const notepadLocalListRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(notepadLocalListRef)

    useEffect(() => {
        getList()
    }, [inViewPort, refresh])
    const getList = useMemoizedFn(async (page?: number) => {
        setLoading(true)
        const newQuery: QueryNoteRequest = {
            Filter: {
                ...defaultNoteFilter,
                Title: keyWord ? [keyWord] : []
            },
            Pagination: {
                ...genDefaultPagination(20),
                OrderBy: "created_at",
                Page: page || 1
            }
        }
        if (newQuery.Pagination.Page === 1) {
            setSpinning(true)
        }
        try {
            const res = await grpcQueryNote(newQuery)
            if (!res.Data) res.Data = []
            const newPage = +res.Pagination.Page
            const length = newPage === 1 ? res.Data.length : res.Data.length + response.Data.length
            setHasMore(length < +res.Total)
            let newRes: QueryNoteResponse = {
                Data: newPage === 1 ? res?.Data : [...response.Data, ...(res?.Data || [])],
                Pagination: res?.Pagination || {
                    ...genDefaultPagination(20)
                },
                Total: res.Total
            }
            setResponse(newRes)
            if (newPage === 1) {
                setIsRef(!isRef)
            }
        } catch (error) {}
        setTimeout(() => {
            setLoading(false)
            setSpinning(false)
        }, 300)
    })
    /**@description 列表加载更多 */
    const loadMoreData = useMemoizedFn(() => {
        getList(+response.Pagination.Page + 1)
    })
    const onSearch = useMemoizedFn((value) => {
        if (value) {
            searchKeywordsRef.current?.onSetRemoteValues(value)
        }
        setRefresh(!refresh)
    })
    const onSetKeyWord = useMemoizedFn((e) => {
        const value = e.target.value
        setKeyWord(value)
    })
    const onSelectKeywords = useMemoizedFn((value) => {
        setKeyWord(value)
        onSearch(value)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const goNotepadDetail = useMemoizedFn((rowData: Note) => {
        if (noteId === rowData.Id) return
        setSpinning(true)
        grpcQueryNoteById(rowData.Id)
            .then((res) => {
                goEditNotepad({
                    notepadHash: `${res.Id}`,
                    title: res.Title
                })
            })
            .finally(() => {
                setTimeout(() => {
                    setSpinning(false)
                }, 200)
            })
    })
    return (
        <div className={styles["notepad-local-list-body"]} ref={notepadLocalListRef}>
            <YakitAutoComplete
                ref={searchKeywordsRef}
                isCacheDefaultValue={false}
                cacheHistoryDataKey={RemoteGV.NotepadLocalListSearch}
                onSelect={onSelectKeywords}
                value={keyWord}
                style={{flex: 1, paddingRight: 4}}
                isInit={false}
            >
                <YakitInput.Search
                    value={keyWord}
                    onChange={onSetKeyWord}
                    onSearch={onSearch}
                    onPressEnter={onPressEnter}
                    size='large'
                />
            </YakitAutoComplete>
            <YakitSpin spinning={spinning}>
                <RollingLoadList<Note>
                    data={response.Data}
                    loadMoreData={loadMoreData}
                    renderRow={(rowData: Note, index: number) => {
                        return (
                            <div
                                className={classNames(styles["notepad-row-content"], "content-ellipsis")}
                                onClick={() => goNotepadDetail(rowData)}
                            >
                                {rowData.Title}
                            </div>
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
        </div>
    )
})

export default NotepadLocalList
