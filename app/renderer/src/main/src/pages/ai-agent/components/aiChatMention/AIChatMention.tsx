import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from "react"
import {
    AIChatMentionListRefProps,
    AIChatMentionProps,
    AIMentionSelectItemProps,
    FileSystemTreeOfMentionProps,
    ForgeNameListOfMentionProps,
    KnowledgeBaseListOfMentionProps,
    ToolListOfMentionProps
} from "./type"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import styles from "./AIChatMention.module.scss"
import {YakitSideTab} from "@/components/yakitSideTab/YakitSideTab"
import {useCreation, useDebounceFn, useInViewport, useKeyPress, useMemoizedFn, useSafeState} from "ahooks"
import {AIMentionTabsEnum, AIForgeListDefaultPagination, AIMentionTabs} from "../../defaultConstant"
import {RollingLoadList, RollingLoadListRef} from "@/components/RollingLoadList/RollingLoadList"
import {AIForge, QueryAIForgeRequest, QueryAIForgeResponse} from "../../type/forge"
import {grpcQueryAIForge} from "../../grpc"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AITool, GetAIToolListRequest, GetAIToolListResponse} from "../../type/aiTool"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {grpcGetAIToolList} from "../../aiToolList/utils"
import {failed} from "@/utils/notification"
import useSwitchSelectByKeyboard from "./useSwitchSelectByKeyboard"
import classNames from "classnames"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {OutlineCheckIcon} from "@/assets/icon/outline"
import {useCustomFolder} from "../aiFileSystemList/store/useCustomFolder"
import FileTreeSystemList from "../aiFileSystemList/FileTreeSystemList/FileTreeSystemList"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {useGetStoreKey} from "../../aiChatWelcome/FreeDialogFileList/FreeDialogFileList"
import {KnowledgeBaseItem, useKnowledgeBase} from "@/pages/KnowledgeBase/hooks/useKnowledgeBase"

const defaultRef: AIChatMentionListRefProps = {
    onRefresh: () => {}
}
export const AIChatMention: React.FC<AIChatMentionProps> = React.memo((props) => {
    const {selectForge, selectTool, selectKnowledgeBase, onSelect, defaultActiveTab} = props
    const [activeKey, setActiveKey, getActiveKey] = useGetSetState<AIMentionTabsEnum>(
        defaultActiveTab || AIMentionTabsEnum.Forge_Name
    )
    const [keyWord, setKeyWord] = useState<string>("")
    const forgeRef = useRef<AIChatMentionListRefProps>(defaultRef)
    const toolRef = useRef<AIChatMentionListRefProps>(defaultRef)
    const knowledgeBaseRef = useRef<AIChatMentionListRefProps>(defaultRef)

    const mentionRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(mentionRef)
    useKeyPress(
        "leftarrow",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onLeftArrow()
        },
        {
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
    const renderTabContent = useMemoizedFn((key: AIMentionTabsEnum) => {
        switch (key) {
            case AIMentionTabsEnum.Forge_Name:
                return (
                    <ForgeNameListOfMention
                        selectList={selectForge}
                        ref={forgeRef}
                        keyWord={keyWord}
                        onSelect={onSelectForge}
                    />
                )
            case AIMentionTabsEnum.Tool:
                return (
                    <ToolListOfMention
                        selectList={selectTool}
                        ref={toolRef}
                        keyWord={keyWord}
                        onSelect={onSelectTool}
                    />
                )
            case AIMentionTabsEnum.KnowledgeBase:
                return (
                    <KnowledgeBaseListOfMention
                        selectList={selectKnowledgeBase}
                        ref={knowledgeBaseRef}
                        keyWord={keyWord}
                        onSelect={onSelectKnowledgeBase}
                    />
                )
            case AIMentionTabsEnum.File_System:
                return <FileSystemTreeOfMention onSelect={onSelectFile} />
            default:
                return null
        }
    })
    const onSearch = useMemoizedFn((value) => {
        setKeyWord(value)
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
            default:
                return null
        }
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
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
        <div className={styles["ai-chat-mention"]} tabIndex={0} ref={mentionRef}>
            <YakitSideTab
                className={styles["tab-wrapper"]}
                type='horizontal'
                activeKey={activeKey}
                yakitTabs={mentionTabs}
                onActiveKey={onActiveKey}
            >
                {activeKey !== AIMentionTabsEnum.File_System && (
                    <YakitInput.Search
                        wrapperClassName={styles["mention-search"]}
                        value={keyWord}
                        onChange={(e) => setKeyWord(e.target.value)}
                        onSearch={onSearch}
                        // onPressEnter={onPressEnter}//与select选中enter快捷键冲突，暂时屏蔽搜索的enter快捷键
                        allowClear={true}
                        onFocus={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                        }}
                        onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                        }}
                    />
                )}
                <div className={styles["list-body"]}>{renderTabContent(activeKey)}</div>
            </YakitSideTab>
        </div>
    )
})

const ForgeNameListOfMention: React.FC<ForgeNameListOfMentionProps> = React.memo(
    forwardRef((props, ref) => {
        const {selectList, keyWord, onSelect} = props
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
            onEnter: () => onEnter()
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
                            const isSelect = !!selectList.find((it) => it.id === `${rowData.Id}`)
                            return (
                                <AIMentionSelectItem
                                    item={{
                                        id: `${rowData.Id}`,
                                        name: rowData.ForgeVerboseName || rowData.ForgeName
                                    }}
                                    onSelect={() => onSelect(rowData)}
                                    isActive={selected?.Id === rowData.Id}
                                    isSelect={isSelect}
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
        const {selectList, keyWord, onSelect} = props
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
            onEnter: () => onEnter()
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
                            const isSelect = !!selectList.find((it) => it.id === `${rowData.ID}`)
                            return (
                                <AIMentionSelectItem
                                    item={{
                                        id: `${rowData.ID}`,
                                        name: rowData.VerboseName || rowData.Name
                                    }}
                                    onSelect={() => onSelect(rowData)}
                                    isActive={selected?.ID === rowData.ID}
                                    isSelect={isSelect}
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

        const {selectList, keyWord, onSelect} = props
        const [selected, setSelected] = useState<KnowledgeBaseItem>()
        const toolListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(toolListRef)

        const listRef = useRef<RollingLoadListRef>({
            containerRef: null,
            scrollTo: () => {}
        })

        const [knowledgeBaseList, setKnowledgeBaseList] = useSafeState<KnowledgeBaseItem[]>([])

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
            if (value >= 0 && value < (knowledgeBaseList || []).length) {
                setSelected(knowledgeBaseList?.[value])
                if (isScroll) {
                    listRef.current.scrollTo(value)
                }
            }
        })
        useSwitchSelectByKeyboard<KnowledgeBaseItem>(listRef.current.containerRef, {
            data: knowledgeBaseList || [],
            selected,
            rowKey: (item) => `AIMentionSelectItem-${item.ID}`,
            onSelectNumber: onKeyboardSelect,
            onEnter: () => onEnter()
        })

        const onEnter = useMemoizedFn(() => {
            if (selected && inViewport) onSelect(selected)
        })
        const getList = useMemoizedFn(async () => {
            try {
                setKnowledgeBaseList(
                    knowledgeBases.filter((it) => it?.KnowledgeBaseName?.toLowerCase().includes(keyWord.toLowerCase()))
                )
            } catch (error) {
                failed(error + "")
            }
        })
        return (
            <div className={styles["knowledge-base-list-of-mention"]}>
                <RollingLoadList<KnowledgeBaseItem>
                    ref={listRef}
                    data={knowledgeBaseList || []}
                    loadMoreData={() => {}}
                    renderRow={(rowData: KnowledgeBaseItem, index: number) => {
                        const isSelect = !!selectList.find((it) => it.id === `${rowData.ID}`)
                        return (
                            <AIMentionSelectItem
                                item={{
                                    id: `${rowData.ID}`,
                                    name: rowData.KnowledgeBaseName
                                }}
                                onSelect={() => onSelect(rowData)}
                                isActive={selected?.ID === rowData.ID}
                                isSelect={isSelect}
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
    const {item, isSelect, isActive, onSelect} = props
    return (
        <div
            className={classNames(styles["row-item"], {
                [styles["row-item-active"]]: isActive,
                [styles["row-item-select"]]: isSelect
            })}
            onClick={onSelect}
            id={`AIMentionSelectItem-${item.id}`}
        >
            <span className='content-ellipsis'>{item.name}</span>
            {isSelect && <OutlineCheckIcon />}
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
