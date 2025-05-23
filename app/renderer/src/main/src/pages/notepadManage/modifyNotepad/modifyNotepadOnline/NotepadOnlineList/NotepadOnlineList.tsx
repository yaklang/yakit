import React, {useEffect, useRef, useState} from "react"
import {NotepadOnlineListProps} from "./NotepadOnlineListType"
import styles from "./NotepadOnlineList.module.scss"
import {defYakitAutoCompleteRef, YakitAutoComplete} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"
import {API} from "@/services/swagger/resposeType"
import {useInViewport, useMemoizedFn} from "ahooks"
import {useStore} from "@/store"
import {PluginListPageMeta} from "@/pages/plugins/baseTemplateType"
import {
    apiGetNotepadDetail,
    apiGetNotepadList,
    convertGetNotepadRequest,
    GetNotepadRequestProps
} from "@/pages/notepadManage/notepadManage/utils"
import classNames from "classnames"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {useGoEditNotepad} from "@/pages/notepadManage/hook/useGoEditNotepad"
import {NotepadRemoteGV} from "@/enums/notepad"

const NotepadOnlineList: React.FC<NotepadOnlineListProps> = React.memo((props) => {
    const {notepadHash} = props
    const userInfo = useStore((s) => s.userInfo)
    const {goEditNotepad} = useGoEditNotepad()
    const [keyWord, setKeyWord] = useState<string>("")
    const [refresh, setRefresh] = useState<boolean>(true)
    const [loading, setLoading] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [response, setResponse] = useState<API.GetNotepadResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })

    const searchKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const notepadOnlineListRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(notepadOnlineListRef)

    useEffect(() => {
        if (!userInfo.isLogin) return
        getList()
    }, [userInfo.isLogin, inViewPort, refresh])

    const getList = useMemoizedFn(async (page?: number) => {
        setLoading(true)
        const params: PluginListPageMeta = !page
            ? {page: 1, limit: 20, order_by: "created_at", order: "desc"}
            : {
                  page: +response.pagemeta.page + 1,
                  limit: +response.pagemeta.limit || 20,
                  order: "desc",
                  order_by: "created_at"
              }
        const newQuery: GetNotepadRequestProps = convertGetNotepadRequest(
            {keyword: keyWord, userName: "", type: "keyword"},
            params
        )
        if (newQuery.page === 1) {
            setSpinning(true)
        }
        try {
            const res = await apiGetNotepadList(newQuery)
            if (!res.data) res.data = []
            const newPage = +res.pagemeta.page
            const length = newPage === 1 ? res.data.length : res.data.length + response.data.length
            setHasMore(length < +res.pagemeta.total)
            let newRes: API.GetNotepadResponse = {
                data: newPage === 1 ? res?.data : [...response.data, ...(res?.data || [])],
                pagemeta: res.pagemeta || {
                    limit: 20,
                    page: 1,
                    total: 0,
                    total_page: 1
                }
            }
            if (newPage === 1) {
                setIsRef(!isRef)
            }
            setResponse(newRes)
        } catch (error) {}
        setTimeout(() => {
            setLoading(false)
            setSpinning(false)
        }, 300)
    })
    /**@description 列表加载更多 */
    const loadMoreData = useMemoizedFn(() => {
        getList(+response.pagemeta.page + 1)
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

    const goNotepadDetail = useMemoizedFn((rowData: API.GetNotepadList) => {
        if (notepadHash === rowData.hash) return
        setSpinning(true)
        apiGetNotepadDetail(rowData.hash)
            .then((res) => {
                goEditNotepad({
                    notepadHash: res.hash,
                    title: res.title
                })
            })
            .finally(() => {
                setTimeout(() => {
                    setSpinning(false)
                }, 200)
            })
    })
    return (
        <div className={styles["notepad-online-list-body"]} ref={notepadOnlineListRef}>
            <YakitAutoComplete
                ref={searchKeywordsRef}
                isCacheDefaultValue={false}
                cacheHistoryDataKey={NotepadRemoteGV.NotepadOnlineListSearch}
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
                <RollingLoadList<API.GetNotepadList>
                    data={response.data}
                    loadMoreData={loadMoreData}
                    renderRow={(rowData: API.GetNotepadList, index: number) => {
                        return (
                            <div
                                className={classNames(styles["notepad-row-content"], "content-ellipsis")}
                                onClick={() => goNotepadDetail(rowData)}
                            >
                                {rowData.title}
                            </div>
                        )
                    }}
                    classNameRow={styles["notepad-row"]}
                    classNameList={styles["notepad-list"]}
                    page={response.pagemeta.page}
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

export default NotepadOnlineList
