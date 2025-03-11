import React, {useEffect, useState} from "react"
import {NotepadLocalSearchItemProps, NotepadLocalSearchProps} from "./NotepadManageLocalType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {
    NoteContent,
    SearchNoteContentRequest,
    SearchNoteContentResponse,
    grpcQueryNoteById,
    grpcSearchNoteContent
} from "../utils"
import {genDefaultPagination} from "@/pages/invoker/schema"
import styles from "./NotepadLocalSearch.module.scss"
import classNames from "classnames"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {toEditNotepad} from "../NotepadManage"
import {YakitRoute} from "@/enums/yakitRoute"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"

const NotepadLocalSearch: React.FC<NotepadLocalSearchProps> = React.memo((props) => {
    const {notepadPageList} = usePageInfo(
        (s) => ({
            notepadPageList: s.pages.get(YakitRoute.Modify_Notepad)?.pageList || []
        }),
        shallow
    )

    const [keyWord, setKeyWord] = useState<string>(props.keyWord || "5")
    const [spinning, setSpinning] = useState<boolean>(false)

    const [isRef, setIsRef] = useState<boolean>(true)
    const [refresh, setRefresh] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)
    const [response, setResponse] = useState<SearchNoteContentResponse>({
        Data: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })

    useEffect(() => {
        getList()
    }, [refresh])

    const getList = useMemoizedFn(async (page?: number) => {
        setLoading(true)
        const newQuery: SearchNoteContentRequest = {
            Keyword: keyWord,
            Pagination: {
                ...genDefaultPagination(20),
                Page: page || 1
            }
        }
        try {
            console.log("newQuery", newQuery)
            const res = await grpcSearchNoteContent(newQuery)
            if (!res.Data) res.Data = []
            console.log("res.Data", res.Data)
            const length = +res.Pagination.Page === 1 ? res.Data.length : res.Data.length + response.Data.length
            setHasMore(length < +res.Total)
            let newRes: SearchNoteContentResponse = {
                Data: +res?.Pagination.Page === 1 ? res?.Data : [...response.Data, ...(res?.Data || [])],
                Pagination: res?.Pagination || {
                    ...genDefaultPagination(20)
                },
                Total: res.Total
            }
            setResponse(newRes)
            if (+newQuery.Pagination.Page === 1) {
                setIsRef(!isRef)
            }
        } catch (error) {}
        setTimeout(() => {
            setLoading(false)
            setSpinning(false)
        }, 300)
    })
    const loadMoreData = useMemoizedFn(() => {
        getList(+response.Pagination.Page + 1)
    })

    const onSearch = useMemoizedFn(() => {
        setSpinning(true)
        setRefresh(!refresh)
    })
    const onEdit = useMemoizedFn((data: NoteContent) => {
        setSpinning(true)
        grpcQueryNoteById(data.Note.Id)
            .then((res) => {
                toEditNotepad({notepadHash: `${res.Id}`, title: res.Title, notepadPageList})
            })
            .finally(() => {
                setTimeout(() => {
                    setSpinning(false)
                }, 200)
            })
    })
    return (
        <div className={styles["note-local-search"]}>
            <YakitInput.Search
                value={keyWord}
                onChange={(e) => setKeyWord(e.target.value)}
                onSearch={onSearch}
                onPressEnter={onSearch}
            />
            {keyWord ? (
                <YakitSpin spinning={spinning}>
                    <RollingLoadList<NoteContent>
                        isRef={isRef}
                        rowKey='Id'
                        data={response.Data}
                        loadMoreData={loadMoreData}
                        renderRow={(data: NoteContent, index) => (
                            <NotepadLocalSearchItem record={data} onClick={() => onEdit(data)} />
                        )}
                        page={+response.Pagination.Page}
                        hasMore={hasMore}
                        loading={loading}
                        defItemHeight={44}
                        classNameList={styles["note-local-list"]}
                        classNameRow={styles["note-search-row"]}
                    />
                </YakitSpin>
            ) : (
                <div className={styles["empty-text"]}>请输入关键字搜索</div>
            )}
        </div>
    )
})

export default NotepadLocalSearch

const NotepadLocalSearchItem: React.FC<NotepadLocalSearchItemProps> = React.memo((props) => {
    const {record, onClick} = props
    return (
        <div className={styles["note-search-item"]} onClick={onClick}>
            <div className={styles["note-search-item-title"]}>{record.Note.Title}</div>
            <div className={styles["note-search-item-content"]}>{record.LineContent}</div>
        </div>
    )
})
