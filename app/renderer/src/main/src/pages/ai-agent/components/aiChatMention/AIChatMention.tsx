import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    AIChatMentionListRefProps,
    AIChatMentionProps,
    AIMentionSelectItemProps,
    FileSystemTreeOfMentionProps,
    FocusModeOfMentionProps,
    ForgeNameListOfMentionProps,
    KnowledgeBaseListOfMentionProps,
    ToolListOfMentionProps
} from "./type"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./AIChatMention.module.scss"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {
    useCreation,
    useDebounceEffect,
    useDebounceFn,
    useInViewport,
    useKeyPress,
    useMemoizedFn,
    useSafeState
} from "ahooks"
import {AIMentionTabsEnum, AIForgeListDefaultPagination, AIMentionTabs} from "../../defaultConstant"
import {RollingLoadList, RollingLoadListRef} from "@/components/RollingLoadList/RollingLoadList"
import {AIFocus, AIForge, QueryAIFocusResponse, QueryAIForgeRequest, QueryAIForgeResponse} from "../../type/forge"
import {grpcQueryAIFocus, grpcQueryAIForge} from "../../grpc"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AITool, GetAIToolListRequest, GetAIToolListResponse} from "../../type/aiTool"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {grpcGetAIToolList} from "../../aiToolList/utils"
import {failed} from "@/utils/notification"
import useSwitchSelectByKeyboard from "./useSwitchSelectByKeyboard"
import classNames from "classnames"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {useCustomFolder} from "../aiFileSystemList/store/useCustomFolder"
import FileTreeSystemList from "../aiFileSystemList/FileTreeSystemList/FileTreeSystemList"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {KnowledgeBaseItem, useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"
import {InputRef} from "antd"

const defaultRef: AIChatMentionListRefProps = {
    onRefresh: () => {}
}
// 所有字母和数字的键代码
const alphanumericKeys = [
    ...Array.from({length: 26}, (_, i) => `${String.fromCharCode(65 + i)}`),
    ...Array.from({length: 10}, (_, i) => `${i}`),
    ...Array.from({length: 10}, (_, i) => `numpad${i}`) //小键盘数字键
]
export const AIChatMention: React.FC<AIChatMentionProps> = React.memo((props) => {
    const {onSelect, defaultActiveTab} = props
    const [activeKey, setActiveKey, getActiveKey] = useGetSetState<AIMentionTabsEnum>(
        defaultActiveTab || AIMentionTabsEnum.Forge_Name
    )
    const [keyWord, setKeyWord] = useState<string>("")
    const [focus, setFocus] = useState<boolean>(false)

    const forgeRef = useRef<AIChatMentionListRefProps>(defaultRef)
    const toolRef = useRef<AIChatMentionListRefProps>(defaultRef)
    const knowledgeBaseRef = useRef<AIChatMentionListRefProps>(defaultRef)
    const focusModeRef = useRef<AIChatMentionListRefProps>(defaultRef)

    const searchRef = useRef<InputRef>(null)

    const mentionRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(mentionRef)

    useEffect(() => {
        if (inViewport) mentionFocus()
    }, [inViewport])
    useEffect(() => {
        if (activeKey === AIMentionTabsEnum.File_System) {
            // 文件系统没有输入框 当焦点聚焦在输入框中的时候切换tab，在这个情况下需要把焦点聚焦在提及的容器上
            setFocus(false)
            mentionFocus()
        }
    }, [activeKey])
    useDebounceEffect(
        () => {
            onSearch()
        },
        [keyWord],
        {wait: 300}
    )
    useKeyPress(
        "leftarrow",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onLeftArrow()
        },
        {
            target: mentionRef,
            exactMatch: true,
            useCapture: true
        }
    )
    useKeyPress(
        "rightarrow",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onRightArrow()
        },
        {
            target: mentionRef,
            exactMatch: true,
            useCapture: true
        }
    )
    useKeyPress(
        focus ? () => false : alphanumericKeys, //A-Z 0-9
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onFocusSearchInput()
        },
        {
            target: mentionRef,
            exactMatch: true,
            useCapture: true
        }
    )
    const onLeftArrow = useDebounceFn(
        () => {
            if (!inViewport) return
            let newValue = getActiveKey()
            const index = getActiveIndex()
            if (index >= 0 && index < AIMentionTabs.length) {
                newValue = (AIMentionTabs[index - 1]?.value as AIMentionTabsEnum) || getActiveKey()
            }
            setActiveKey(newValue)
        },
        {wait: 100, leading: true}
    ).run

    const onRightArrow = useDebounceFn(
        () => {
            if (!inViewport) return
            let newValue = getActiveKey()
            const index = getActiveIndex()
            if (index >= 0 && index < AIMentionTabs.length) {
                newValue = (AIMentionTabs[index + 1]?.value as AIMentionTabsEnum) || getActiveKey()
            }
            setActiveKey(newValue)
        },
        {wait: 100, leading: true}
    ).run
    const getActiveIndex = useMemoizedFn(() => {
        return AIMentionTabs.findIndex((ele) => ele.value === getActiveKey())
    })
    const onActiveKey = useMemoizedFn((k) => {
        setKeyWord("")
        setActiveKey(k as AIMentionTabsEnum)
    })
    const onSelectForge = useMemoizedFn((forgeItem: AIForge) => {
        onSelect("forge", {
            id: `${forgeItem.Id}`,
            name: forgeItem.ForgeVerboseName || forgeItem.ForgeName
        })
    })
    const onSelectTool = useMemoizedFn((toolItem: AITool) => {
        onSelect("tool", {
            id: `${toolItem.ID}`,
            name: toolItem.VerboseName || toolItem.Name
        })
    })
    const onSelectKnowledgeBase = useMemoizedFn((knowledgeBaseItem: KnowledgeBaseItem) => {
        onSelect("knowledgeBase", {
            id: `${knowledgeBaseItem.ID}`,
            name: knowledgeBaseItem.KnowledgeBaseName
        })
    })
    const onSelectFile = useMemoizedFn((path: string, isFolder: boolean) => {
        onSelect(isFolder ? "folder" : "file", {
            id: path,
            name: path
        })
    })
    const onSelectFocusMode = useMemoizedFn((focusMode: AIFocus) => {
        onSelect("focusMode", {
            id: `${focusMode.Name}`,
            name: focusMode.Name || ""
        })
    })
    const renderTabContent = useMemoizedFn((key: AIMentionTabsEnum) => {
        switch (key) {
            case AIMentionTabsEnum.Forge_Name:
                return (
                    <ForgeNameListOfMention
                        ref={forgeRef}
                        keyWord={keyWord}
                        onSelect={onSelectForge}
                        getContainer={getContainer}
                    />
                )
            case AIMentionTabsEnum.Tool:
                return (
                    <ToolListOfMention
                        ref={toolRef}
                        keyWord={keyWord}
                        onSelect={onSelectTool}
                        getContainer={getContainer}
                    />
                )
            case AIMentionTabsEnum.KnowledgeBase:
                return (
                    <KnowledgeBaseListOfMention
                        ref={knowledgeBaseRef}
                        keyWord={keyWord}
                        onSelect={onSelectKnowledgeBase}
                        getContainer={getContainer}
                    />
                )
            case AIMentionTabsEnum.File_System:
                return <FileSystemTreeOfMention onSelect={onSelectFile} />
            case AIMentionTabsEnum.FocusMode:
                return (
                    <FocusModeOfMention
                        ref={focusModeRef}
                        keyWord={keyWord}
                        onSelect={onSelectFocusMode}
                        getContainer={getContainer}
                    />
                )
            default:
                return null
        }
    })
    const onSearch = useMemoizedFn(() => {
        switch (activeKey) {
            case AIMentionTabsEnum.Forge_Name:
                forgeRef.current.onRefresh()
                break
            case AIMentionTabsEnum.Tool:
                toolRef.current.onRefresh()
                break
            case AIMentionTabsEnum.KnowledgeBase:
                knowledgeBaseRef.current.onRefresh()
                break
            case AIMentionTabsEnum.FocusMode:
                focusModeRef.current.onRefresh()
                break
            default:
                return null
        }
    })
    const onSearchInputChange = useMemoizedFn(() => {
        onSearch()
    })
    const onFocusSearchInput = useMemoizedFn(() => {
        if (!focus) {
            searchRef.current?.focus()
        }
        setFocus(true)
    })

    const onSearchBlur = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        setFocus(false)
    })
    const onSearchFocus = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        setFocus(true)
    })
    const getContainer = useMemoizedFn(() => {
        return mentionRef.current
    })

    const mentionFocus = useMemoizedFn(() => {
        mentionRef.current?.focus()
    })

    // 用户文件夹
    const customFolder = useCustomFolder()
    const mentionTabs = useCreation(() => {
        if (!customFolder?.length) {
            return AIMentionTabs.filter((item) => item.value !== AIMentionTabsEnum.File_System)
        }
        return AIMentionTabs
    }, [customFolder.length])
    return (
        <div className={styles["ai-chat-mention"]} tabIndex={0} ref={mentionRef} onClick={(e) => e.stopPropagation()}>
            <YakitSideTab
                className={styles["tab-wrapper"]}
                type='horizontal'
                activeKey={activeKey}
                yakitTabs={mentionTabs}
                onActiveKey={onActiveKey}
            >
                {activeKey !== AIMentionTabsEnum.File_System && (
                    <YakitInput.Search
                        ref={searchRef}
                        wrapperClassName={styles["mention-search"]}
                        value={keyWord}
                        onChange={(e) => setKeyWord(e.target.value)}
                        onSearch={onSearchInputChange}
                        allowClear={true}
                        onFocus={onSearchFocus}
                        onBlur={onSearchBlur}
                    />
                )}
                <div className={styles["list-body"]}>{renderTabContent(activeKey)}</div>
            </YakitSideTab>
        </div>
    )
})

const ForgeNameListOfMention: React.FC<ForgeNameListOfMentionProps> = React.memo(
    forwardRef((props, ref) => {
        const {keyWord, onSelect, getContainer} = props
        const [loading, setLoading] = useState<boolean>(false)
        const [spinning, setSpinning] = useState<boolean>(false)
        const [isRef, setIsRef] = useState<boolean>(false)
        const [hasMore, setHasMore] = useState<boolean>(true)
        const [response, setResponse] = useState<QueryAIForgeResponse>({
            Pagination: {...AIForgeListDefaultPagination},
            Data: [],
            Total: 0
        })
        const [selected, setSelected] = useState<AIForge>()

        const forgeListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(forgeListRef)

        const listRef = useRef<RollingLoadListRef>({
            containerRef: null,
            scrollTo: () => {}
        })

        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    getList()
                }
            }),
            []
        )
        useEffect(() => {
            // 获取模板列表
            getList()
        }, [])
        const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
            if (value >= 0 && value < response.Data.length) {
                setSelected(response.Data[value])
                if (isScroll) {
                    listRef.current.scrollTo(value)
                }
            }
        })
        useSwitchSelectByKeyboard<AIForge>(listRef.current.containerRef, {
            data: response.Data,
            selected,
            rowKey: (item) => `AIMentionSelectItem-${item.Id}`,
            onSelectNumber: onKeyboardSelect,
            onEnter: () => onEnter(),
            getContainer
        })

        const onEnter = useMemoizedFn(() => {
            if (selected && inViewport) onSelect(selected)
        })
        const getList = useMemoizedFn(async (page?: number) => {
            setLoading(true)
            const newQuery: QueryAIForgeRequest = {
                Pagination: {
                    ...response.Pagination,
                    Page: page || 1
                },
                Filter: {
                    Keyword: keyWord
                }
            }
            if (newQuery.Pagination.Page === 1) {
                setSpinning(true)
            }
            try {
                const res = await grpcQueryAIForge(newQuery)
                if (!res.Data) res.Data = []
                const newPage = +res.Pagination.Page
                const length = newPage === 1 ? res.Data.length : res.Data.length + response.Data.length
                setHasMore(length < +res.Total)
                let newRes: QueryAIForgeResponse = {
                    Data: newPage === 1 ? res?.Data : [...response.Data, ...(res?.Data || [])],
                    Pagination: res?.Pagination || {
                        ...AIForgeListDefaultPagination
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

        return (
            <div className={styles["forge-name-list-of-mention"]} ref={forgeListRef} tabIndex={0}>
                <YakitSpin spinning={spinning}>
                    <RollingLoadList<AIForge>
                        ref={listRef}
                        data={response.Data}
                        loadMoreData={loadMoreData}
                        renderRow={(rowData: AIForge, index: number) => {
                            return (
                                <AIMentionSelectItem
                                    item={{
                                        id: `${rowData.Id}`,
                                        name: rowData.ForgeVerboseName || rowData.ForgeName
                                    }}
                                    onSelect={() => onSelect(rowData)}
                                    isActive={selected?.Id === rowData.Id}
                                />
                            )
                        }}
                        classNameRow={styles["ai-forge-list-row"]}
                        classNameList={styles["ai-forge-list"]}
                        page={+response.Pagination.Page}
                        hasMore={hasMore}
                        loading={loading}
                        defItemHeight={24}
                        rowKey='Id'
                        isRef={isRef}
                    />
                </YakitSpin>
            </div>
        )
    })
)

const ToolListOfMention: React.FC<ToolListOfMentionProps> = React.memo(
    forwardRef((props, ref) => {
        const {keyWord, onSelect, getContainer} = props
        const [loading, setLoading] = useState<boolean>(false)
        const [spinning, setSpinning] = useState<boolean>(false)
        const [hasMore, setHasMore] = useState<boolean>(false)
        const [isRef, setIsRef] = useState<boolean>(false)
        const [response, setResponse] = useState<GetAIToolListResponse>({
            Tools: [],
            Pagination: genDefaultPagination(20),
            Total: 0
        })
        const [selected, setSelected] = useState<AITool>()
        const toolListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(toolListRef)

        const listRef = useRef<RollingLoadListRef>({
            containerRef: null,
            scrollTo: () => {}
        })

        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    getList()
                }
            }),
            []
        )
        useEffect(() => {
            getList()
        }, [])
        const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
            if (value >= 0 && value < response.Tools.length) {
                setSelected(response.Tools[value])
                if (isScroll) {
                    listRef.current.scrollTo(value)
                }
            }
        })
        useSwitchSelectByKeyboard<AITool>(listRef.current.containerRef, {
            data: response.Tools,
            selected,
            rowKey: (item) => `AIMentionSelectItem-${item.ID}`,
            onSelectNumber: onKeyboardSelect,
            onEnter: () => onEnter(),
            getContainer
        })

        const onEnter = useMemoizedFn(() => {
            if (selected && inViewport) onSelect(selected)
        })
        const getList = useMemoizedFn(async (page?: number) => {
            setLoading(true)
            const newQuery: GetAIToolListRequest = {
                Query: keyWord,
                ToolName: "",
                Pagination: {
                    ...genDefaultPagination(20),
                    OrderBy: "created_at",
                    Page: page || 1
                },
                OnlyFavorites: false
            }
            if (newQuery.Pagination.Page === 1) {
                setSpinning(true)
            }
            try {
                const res = await grpcGetAIToolList(newQuery)
                if (!res.Tools) res.Tools = []
                const newPage = +res.Pagination.Page
                const length = newPage === 1 ? res.Tools.length : res.Tools.length + response.Tools.length
                setHasMore(length < +res.Total)
                let newRes: GetAIToolListResponse = {
                    Tools: newPage === 1 ? res?.Tools : [...response.Tools, ...(res?.Tools || [])],
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
        const loadMoreData = useMemoizedFn(() => {
            getList(+response.Pagination.Page + 1)
        })
        return (
            <div className={styles["tool-list-of-mention"]} ref={toolListRef}>
                <YakitSpin spinning={spinning}>
                    <RollingLoadList<AITool>
                        ref={listRef}
                        data={response.Tools}
                        loadMoreData={loadMoreData}
                        renderRow={(rowData: AITool, index: number) => {
                            return (
                                <AIMentionSelectItem
                                    item={{
                                        id: `${rowData.ID}`,
                                        name: rowData.VerboseName || rowData.Name
                                    }}
                                    onSelect={() => onSelect(rowData)}
                                    isActive={selected?.ID === rowData.ID}
                                />
                            )
                        }}
                        classNameRow={styles["ai-tool-list-row"]}
                        classNameList={styles["ai-tool-list"]}
                        page={+response.Pagination.Page}
                        hasMore={hasMore}
                        loading={loading}
                        defItemHeight={24}
                        rowKey='ID'
                        isRef={isRef}
                    />
                </YakitSpin>
            </div>
        )
    })
)

const KnowledgeBaseListOfMention: React.FC<KnowledgeBaseListOfMentionProps> = React.memo(
    forwardRef((props, ref) => {
        const {knowledgeBases} = useKnowledgeBase()

        const {keyWord, onSelect, getContainer} = props
        const [selected, setSelected] = useState<KnowledgeBaseItem>()
        const toolListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(toolListRef)

        const listRef = useRef<RollingLoadListRef>({
            containerRef: null,
            scrollTo: () => {}
        })

        const [knowledgeBaseList, setKnowledgeBaseList] = useSafeState<KnowledgeBaseItem[]>([])
        const knowledgeList = useCreation(() => {
            const value: KnowledgeBaseItem = {
                ID: "@所有知识库",
                KnowledgeBaseName: "@所有知识库",
                Description: "",
                KnowledgeBaseFile: [],
                KnowledgeBaseType: "",
                KnowledgeBaseDescription: "",
                KnowledgeBaseLength: 0,
                streamToken: "",
                streamstep: 1,
                Tags: [],
                IsImported: false,
                addManuallyItem: false,
                historyGenerateKnowledgeList: [],
                Type: "",
                Name: "",
                BaseID: 0,
                BaseIndex: "",
                Attributes: [],
                Rationale: "",
                HiddenIndex: "",
                KnowledgeBaseId: 0,
                KnowledgeTitle: "",
                KnowledgeType: "",
                ImportanceScore: 0,
                Keywords: [],
                KnowledgeDetails: "",
                Summary: "",
                SourcePage: 0,
                PotentialQuestions: [],
                PotentialQuestionsVector: [],
                RelatedEntityUUIDS: "",
                disableERM: false
            }
            return [value, ...(knowledgeBaseList || [])]
        }, [knowledgeBaseList])
        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    getList()
                }
            }),
            []
        )
        useEffect(() => {
            setKnowledgeBaseList(knowledgeBases)
        }, [knowledgeBases])

        const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
            if (value >= 0 && value < (knowledgeList || []).length) {
                setSelected(knowledgeList?.[value])
                if (isScroll) {
                    listRef.current.scrollTo(value)
                }
            }
        })

        useSwitchSelectByKeyboard<KnowledgeBaseItem>(listRef.current.containerRef, {
            data: knowledgeList,
            selected,
            rowKey: (item) => `AIMentionSelectItem-${item.ID}`,
            onSelectNumber: onKeyboardSelect,
            onEnter: () => onEnter(),
            getContainer
        })

        const onEnter = useMemoizedFn(() => {
            if (selected && inViewport) onSelect(selected)
        })
        const getList = useMemoizedFn(async () => {
            try {
                setKnowledgeBaseList(
                    knowledgeBases.filter(
                        (it) =>
                            it?.KnowledgeBaseName === "@所有知识库" ||
                            it?.KnowledgeBaseName?.toLowerCase().includes(keyWord.toLowerCase())
                    )
                )
            } catch (error) {
                failed(error + "")
            }
        })

        return (
            <div className={styles["knowledge-base-list-of-mention"]}>
                <RollingLoadList<KnowledgeBaseItem>
                    ref={listRef}
                    data={knowledgeList}
                    loadMoreData={() => {}}
                    renderRow={(rowData: KnowledgeBaseItem, index: number) => {
                        return (
                            <AIMentionSelectItem
                                item={{
                                    id: `${rowData.ID}`,
                                    name: rowData.KnowledgeBaseName
                                }}
                                onSelect={() => onSelect(rowData)}
                                isActive={selected?.ID === rowData.ID}
                            />
                        )
                    }}
                    classNameRow={styles["ai-knowledge-base-list-row"]}
                    classNameList={styles["ai-knowledge-base-list"]}
                    page={1}
                    hasMore={false}
                    loading={false}
                    defItemHeight={24}
                    rowKey='ID'
                />
            </div>
        )
    })
)

const AIMentionSelectItem: React.FC<AIMentionSelectItemProps> = React.memo((props) => {
    const {item, isActive, onSelect} = props
    return (
        <div
            className={classNames(styles["row-item"], {
                [styles["row-item-active"]]: isActive
            })}
            onClick={onSelect}
            id={`AIMentionSelectItem-${item.id}`}
        >
            <span className='content-ellipsis'>{item.name}</span>
        </div>
    )
})

const FileSystemTreeOfMention: React.FC<FileSystemTreeOfMentionProps> = React.memo((props) => {
    const {onSelect} = props
    const [selected, setSelected] = useState<FileNodeProps>()
    // 用户文件夹
    const customFolder = useCustomFolder()

    const onSetCheckedKeys = useMemoizedFn((c: boolean, nodeData: FileNodeProps) => {
        if (!nodeData) return
        onSelect(nodeData.path, nodeData.isFolder)
    })
    return (
        <div className={styles["file-system-tree-of-mention"]}>
            {customFolder.map((item) => (
                <FileTreeSystemList
                    key={item.path}
                    path={item.path}
                    isOpen={false}
                    isShowRightMenu={false}
                    checkable={true}
                    isFolder={item.isFolder}
                    selected={selected}
                    setSelected={setSelected}
                    checkedKeys={[]}
                    // checkedKeys={checkedKeys}
                    setCheckedKeys={onSetCheckedKeys}
                />
            ))}
        </div>
    )
})

const FocusModeOfMention: React.FC<FocusModeOfMentionProps> = React.memo(
    forwardRef((props, ref) => {
        const {keyWord, onSelect, getContainer} = props
        const [spinning, setSpinning] = useState<boolean>(false)
        const [response, setResponse] = useState<QueryAIFocusResponse>({
            Data: []
        })
        const [selected, setSelected] = useState<AIFocus>()
        const toolListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(toolListRef)

        const listRef = useRef<RollingLoadListRef>({
            containerRef: null,
            scrollTo: () => {}
        })

        useImperativeHandle(
            ref,
            () => ({
                onRefresh: () => {
                    getList()
                }
            }),
            []
        )
        useEffect(() => {
            getList()
        }, [])
        const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
            if (value >= 0 && value < response.Data.length) {
                setSelected(response.Data[value])
                if (isScroll) {
                    listRef.current.scrollTo(value)
                }
            }
        })
        useSwitchSelectByKeyboard<AIFocus>(listRef.current.containerRef, {
            data: response.Data,
            selected,
            rowKey: (item) => `AIMentionSelectItem-${item.Name}`,
            onSelectNumber: onKeyboardSelect,
            onEnter: () => onEnter(),
            getContainer
        })

        const onEnter = useMemoizedFn(() => {
            if (selected && inViewport) onSelect(selected)
        })
        const getList = useMemoizedFn(async (page?: number) => {
            setSpinning(true)
            try {
                const res = await grpcQueryAIFocus()
                let newRes: QueryAIFocusResponse = {
                    Data: (res?.Data || []).filter((it) => it?.Name?.toLowerCase().includes(keyWord.toLowerCase()))
                }
                setResponse(newRes)
            } catch (error) {}
            setTimeout(() => {
                setSpinning(false)
            }, 300)
        })
        return (
            <div className={styles["focus-mode-list-of-mention"]} ref={toolListRef}>
                <YakitSpin spinning={spinning}>
                    <RollingLoadList<AIFocus>
                        ref={listRef}
                        data={response.Data}
                        loadMoreData={() => {}}
                        renderRow={(rowData: AIFocus, index: number) => {
                            return (
                                <AIMentionSelectItem
                                    item={{
                                        id: `${rowData.Name}`,
                                        name: rowData.Name || ""
                                    }}
                                    onSelect={() => onSelect(rowData)}
                                    isActive={selected?.Name === rowData.Name}
                                />
                            )
                        }}
                        classNameRow={styles["ai-focus-mode-list-row"]}
                        classNameList={styles["ai-focus-mode-list"]}
                        page={1}
                        hasMore={false}
                        loading={false}
                        defItemHeight={24}
                        rowKey='Name'
                    />
                </YakitSpin>
            </div>
        )
    })
)
