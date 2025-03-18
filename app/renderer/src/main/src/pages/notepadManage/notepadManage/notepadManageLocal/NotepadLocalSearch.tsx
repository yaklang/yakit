import React, {useState, useRef} from "react"
import {NotepadLocalSearchProps} from "./NotepadManageLocalType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useCreation, useMemoizedFn, useUpdateEffect, useInViewport} from "ahooks"
import {
    NoteContent,
    SearchNoteContentRequest,
    SearchNoteContentTree,
    SearchNoteContentTreeResponse,
    grpcQueryNoteById,
    grpcSearchNoteContent
} from "../utils"
import ReactResizeDetector from "react-resize-detector"
import styles from "./NotepadLocalSearch.module.scss"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {toEditNotepad} from "../NotepadManage"
import {YakitRoute} from "@/enums/yakitRoute"
import {usePageInfo} from "@/store/pageInfo"
import {shallow} from "zustand/shallow"
import {yakitNotify} from "@/utils/notification"
import YakitTree from "@/components/yakitUI/YakitTree/YakitTree"
import {DataNode} from "antd/lib/tree"
import Highlighter from "react-highlight-words"
import {YakitAutoComplete, defYakitAutoCompleteRef} from "@/components/yakitUI/YakitAutoComplete/YakitAutoComplete"
import {RemoteGV} from "@/yakitGV"
import {YakitAutoCompleteRefProps} from "@/components/yakitUI/YakitAutoComplete/YakitAutoCompleteType"

const NotepadLocalSearch: React.FC<NotepadLocalSearchProps> = React.memo((props) => {
    const {notepadPageList} = usePageInfo(
        (s) => ({
            notepadPageList: s.pages.get(YakitRoute.Modify_Notepad)?.pageList || []
        }),
        shallow
    )

    const [vlistHeigth, setVListHeight] = useState<number>(200)

    const [keyWord, setKeyWord] = useState<string>("")
    const [spinning, setSpinning] = useState<boolean>(false)

    const [refresh, setRefresh] = useState<boolean>(true)
    const [response, setResponse] = useState<SearchNoteContentTreeResponse>({
        Data: [],
        Total: 0,
        keys: []
    })
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])

    const searchKeywordsRef = useRef<YakitAutoCompleteRefProps>({
        ...defYakitAutoCompleteRef
    })
    const notepadLocalSearchRef = useRef<HTMLElement>()
    const [inViewPort = true] = useInViewport(notepadLocalSearchRef)

    useUpdateEffect(() => {
        if (inViewPort) getList()
    }, [refresh, inViewPort])

    const getList = useMemoizedFn(async () => {
        if (!keyWord) return
        setSpinning(true)
        const newQuery: SearchNoteContentRequest = {
            Keyword: keyWord
        }
        try {
            const res = await grpcSearchNoteContent(newQuery)
            if (!res.Data) res.Data = []
            setResponse(res)
            setExpandedKeys(res.keys)
        } catch (error) {}
        setTimeout(() => {
            setSpinning(false)
        }, 300)
    })

    const onSearch = useMemoizedFn((value) => {
        if (!value) {
            yakitNotify("info", "请输入搜索内容")
            return
        }
        searchKeywordsRef.current?.onSetRemoteValues(value)
        setRefresh(!refresh)
    })
    const onSetKeyWord = useMemoizedFn((e) => {
        const value = e.target.value
        if (!value) {
            setExpandedKeys([])
            setResponse({
                Data: [],
                Total: 0,
                keys: []
            })
        }
        setKeyWord(value)
    })
    const onSelectKeywords = useMemoizedFn((value) => {
        setKeyWord(value)
        onSearch(value)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const onEdit = useMemoizedFn((data: NoteContent) => {
        setSpinning(true)
        grpcQueryNoteById(data.Note.Id)
            .then((res) => {
                toEditNotepad({pageInfo: {keyWord, notepadHash: `${res.Id}`, title: res.Title}, notepadPageList})
            })
            .finally(() => {
                setTimeout(() => {
                    setSpinning(false)
                }, 200)
            })
    })

    const onTreeSelect = useMemoizedFn((selectedKeys: React.Key[], info: any) => {
        const {node} = info
        if (node?.children) {
            // 一级节点
            const expanded = !!expandedKeys.find((ele) => ele === node.key)
            if (expanded) {
                setExpandedKeys((v) => v.filter((s) => s !== node.key))
            } else {
                setExpandedKeys((v) => [...v, node.key])
            }
        } else {
            // 二级节点
            onEdit(node.item)
        }
    })
    const onTreeExpand = useMemoizedFn((keys: React.Key[], info) => {
        setExpandedKeys(keys)
    })

    const treeData = useCreation(() => {
        const loop = (data: SearchNoteContentTree[] | NoteContent[]): DataNode[] => {
            return data.map((item) => {
                if (item.children && item.children.length > 0) {
                    const newItem = item as SearchNoteContentTree
                    return {title: newItem.title, key: newItem.key, children: loop(newItem.children)}
                }
                const record = item as NoteContent
                return {
                    title: (
                        <Highlighter
                            highlightClassName={styles["note-search-item-content-highlight"]}
                            searchWords={[keyWord]}
                            textToHighlight={record.LineContent}
                        />
                    ),
                    key: record.Id,
                    item: record
                }
            })
        }

        return loop(response.Data)
    }, [keyWord, response.Data])

    return (
        <div className={styles["note-local-search"]}>
            <YakitAutoComplete
                ref={searchKeywordsRef}
                isCacheDefaultValue={false}
                cacheHistoryDataKey={RemoteGV.NotepadLocalSearch}
                onSelect={onSelectKeywords}
                value={keyWord}
                style={{flex: 1}}
            >
                <YakitInput.Search
                    value={keyWord}
                    onChange={onSetKeyWord}
                    onSearch={onSearch}
                    onPressEnter={onPressEnter}
                />
            </YakitAutoComplete>

            <YakitSpin spinning={spinning}>
                <ReactResizeDetector
                    onResize={(width, height) => {
                        if (!height) {
                            return
                        }
                        setVListHeight(height)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <YakitTree
                    height={vlistHeigth}
                    defaultExpandAll={true}
                    showLine={false}
                    selectedKeys={[]}
                    expandedKeys={expandedKeys}
                    treeData={treeData}
                    onSelect={onTreeSelect}
                    onExpand={onTreeExpand}
                    className={styles["note-search-tree"]}
                />
            </YakitSpin>
        </div>
    )
})

export default NotepadLocalSearch
