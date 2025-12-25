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
import {
    useCreation,
    useDebounceFn,
    useFocusWithin,
    useInViewport,
    useKeyPress,
    useMemoizedFn,
    useRequest,
    useSafeState
} from "ahooks"
import {AIMentionTabsEnum, AIForgeListDefaultPagination, AIMentionTabs} from "../../defaultConstant"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {AIForge, QueryAIForgeRequest, QueryAIForgeResponse} from "../../type/forge"
import {grpcQueryAIForge} from "../../grpc"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AITool, GetAIToolListRequest, GetAIToolListResponse} from "../../type/aiTool"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {grpcGetAIToolList} from "../../aiToolList/utils"
import {CreateKnowledgeBaseData, KnowledgeBaseContentProps} from "@/pages/KnowledgeBase/TKnowledgeBase"
import {KnowledgeBase} from "@/components/playground/knowlegeBase/types"
import {failed} from "@/utils/notification"
import useSwitchSelectByKeyboard from "./useSwitchSelectByKeyboard"
import classNames from "classnames"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {OutlineCheckIcon} from "@/assets/icon/outline"
import {useCustomFolder} from "../aiFileSystemList/store/useCustomFolder"
import {FileTreeSystemList} from "../aiFileSystemList/FileTreeSystemList/FileTreeSystemList"
import {FileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {
    FileListStoreKey,
    FileToChatQuestionList,
    fileToChatQuestionStore,
    useFileToQuestion
} from "@/pages/ai-re-act/aiReActChat/store"

const {ipcRenderer} = window.require("electron")
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
    const isFocusWithin = useFocusWithin(mentionRef)
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
            if (!inViewport || !isFocusWithin) return
            let newValue = getActiveKey()
            const index = getActiveIndex()
            if (index >= 0 && index < AIMentionTabs.length) {
                newValue = (AIMentionTabs[index - 1]?.value as AIMentionTabsEnum) || getActiveKey()
            }
            setActiveKey(newValue)
        },
        {wait: 200, leading: true}
    ).run

    const onRightArrow = useDebounceFn(
        () => {
            if (!inViewport || !isFocusWithin) return
            let newValue = getActiveKey()
            const index = getActiveIndex()
            if (index >= 0 && index < AIMentionTabs.length) {
                newValue = (AIMentionTabs[index + 1]?.value as AIMentionTabsEnum) || getActiveKey()
            }
            setActiveKey(newValue)
        },
        {wait: 200, leading: true}
    ).run
    const getActiveIndex = useMemoizedFn(() => {
        return AIMentionTabs.findIndex((ele) => ele.value === getActiveKey())
    })
    const onActiveKey = useMemoizedFn((k) => {
        setKeyWord("")
        setActiveKey(k as AIMentionTabsEnum)
    })
    const onSelectForge = useMemoizedFn((forgeItem: AIForge) => {
        onSelect(AIMentionTabsEnum.Forge_Name, {
            id: `${forgeItem.Id}`,
            name: forgeItem.ForgeVerboseName || forgeItem.ForgeName
        })
    })
    const onSelectTool = useMemoizedFn((toolItem: AITool) => {
        onSelect(AIMentionTabsEnum.Tool, {
            id: `${toolItem.ID}`,
            name: toolItem.VerboseName || toolItem.Name
        })
    })
    const onSelectKnowledgeBase = useMemoizedFn((knowledgeBaseItem: KnowledgeBase) => {
        onSelect(AIMentionTabsEnum.KnowledgeBase, {
            id: `${knowledgeBaseItem.ID}`,
            name: knowledgeBaseItem.KnowledgeBaseName
        })
    })
    const onSelectFile = useMemoizedFn(() => {
        onSelect(AIMentionTabsEnum.KnowledgeBase)
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
    const onMentionClick = useMemoizedFn((e) => {
        e.stopPropagation()
        e.preventDefault()
        onFocusMention()
    })
    useEffect(() => {
        if (inViewport) onFocusMention()
    }, [inViewport])
    const onFocusMention = useMemoizedFn(() => {
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
        <div className={styles["ai-chat-mention"]} onClick={onMentionClick} tabIndex={0} ref={mentionRef}>
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
                        onPressEnter={onPressEnter}
                        allowClear={true}
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
        const [scrollToNumber, setScrollToNumber] = useState<number>(0)

        const forgeListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(forgeListRef)
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

        useSwitchSelectByKeyboard<AIForge>(forgeListRef, {
            data: response.Data,
            selected,
            rowKey: "Id",
            onSelectNumber: (v) => onKeyboardSelect(v),
            onEnter: () => onEnter()
        })

        const onKeyboardSelect = useMemoizedFn((value: number) => {
            if (value >= 0 && value < response.Data.length) {
                setSelected(response.Data[value])
                setScrollToNumber(value)
            }
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
                        rowKey='ID'
                        isRef={isRef}
                        numberRoll={scrollToNumber}
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
        const [scrollToNumber, setScrollToNumber] = useState<number>(0)
        const toolListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(toolListRef)
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
        useSwitchSelectByKeyboard<AITool>(toolListRef, {
            data: response.Tools,
            selected,
            rowKey: "ID",
            onSelectNumber: (v) => onKeyboardSelect(v),
            onEnter: () => onEnter()
        })

        const onKeyboardSelect = useMemoizedFn((value: number) => {
            if (value >= 0 && value < response.Tools.length) {
                setSelected(response.Tools[value])
                setScrollToNumber(value)
            }
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
                        numberRoll={scrollToNumber}
                    />
                </YakitSpin>
            </div>
        )
    })
)

const KnowledgeBaseListOfMention: React.FC<KnowledgeBaseListOfMentionProps> = React.memo(
    forwardRef((props, ref) => {
        const {selectList, keyWord, onSelect} = props
        const [knowledgeBaseID, setKnowledgeBaseID] = useSafeState("")
        const createKnwledgeDataRef = useRef<CreateKnowledgeBaseData>()
        const [selected, setSelected] = useState<KnowledgeBase>()
        const [scrollToNumber, setScrollToNumber] = useState<number>(0)
        const toolListRef = useRef<HTMLDivElement>(null)
        const [inViewport = true] = useInViewport(toolListRef)
        const {
            loading,
            data: existsKnowledgeBase,
            runAsync: existsKnowledgeBaseAsync
        } = useRequest(
            async (Keyword?: string) => {
                const result: KnowledgeBaseContentProps<number> = await ipcRenderer.invoke("GetKnowledgeBase", {
                    Keyword,
                    Pagination: {Limit: 9999, Page: 1}
                })
                const {KnowledgeBases} = result

                const resultData = KnowledgeBases?.map((it) => ({
                    ...createKnwledgeDataRef.current,
                    ...it
                }))
                return resultData
            },
            {
                manual: true,
                onSuccess: (value) => {
                    const FirstknowledgeBaseID = value?.find((item) => item.IsImported === false)?.ID
                    if (FirstknowledgeBaseID) {
                        !knowledgeBaseID && setKnowledgeBaseID(`${FirstknowledgeBaseID}`)
                    }
                }
            }
        )
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
        useSwitchSelectByKeyboard<KnowledgeBase>(toolListRef, {
            data: existsKnowledgeBase || [],
            selected,
            rowKey: "ID",
            onSelectNumber: (v) => onKeyboardSelect(v),
            onEnter: () => onEnter()
        })

        const onKeyboardSelect = useMemoizedFn((value: number) => {
            if (value >= 0 && value < (existsKnowledgeBase || []).length) {
                setSelected(existsKnowledgeBase?.[value])
                setScrollToNumber(value)
            }
        })
        const onEnter = useMemoizedFn(() => {
            if (selected && inViewport) onSelect(selected)
        })
        const getList = useMemoizedFn(async () => {
            try {
                await existsKnowledgeBaseAsync(keyWord)
            } catch (error) {
                failed(error + "")
            }
        })
        return (
            <div className={styles["knowledge-base-list-of-mention"]}>
                <YakitSpin spinning={loading}>
                    <RollingLoadList<KnowledgeBase>
                        data={existsKnowledgeBase || []}
                        loadMoreData={() => {}}
                        renderRow={(rowData: KnowledgeBase, index: number) => {
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
                        loading={loading}
                        defItemHeight={24}
                        rowKey='ID'
                        numberRoll={scrollToNumber}
                    />
                </YakitSpin>
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
        >
            <span className='content-ellipsis'>{item.name}</span>
            {isSelect && <OutlineCheckIcon />}
        </div>
    )
})

const FileSystemTreeOfMention: React.FC<FileSystemTreeOfMentionProps> = React.memo((props) => {
    const {onSelect} = props
    const fileToQuestion = useFileToQuestion(FileListStoreKey.FileList)
    const [selected, setSelected] = useState<FileNodeProps>()
    const [checkedKeys, setCheckedKeys] = useState<FileToChatQuestionList[]>(fileToQuestion)
    // 用户文件夹
    const customFolder = useCustomFolder()

    const onSetCheckedKeys = useMemoizedFn((c: boolean, nodeData: FileNodeProps) => {
        if (!nodeData) return
        let newCheckedKeys = [...checkedKeys]
        if (c) {
            newCheckedKeys.push({
                path: nodeData.path,
                isFolder: nodeData.isFolder
            })
            fileToChatQuestionStore.add(FileListStoreKey.FileList, {
                path: nodeData.path,
                isFolder: nodeData.isFolder
            })
        } else {
            newCheckedKeys = newCheckedKeys.filter((key) => key?.path !== nodeData.path)
            fileToChatQuestionStore.remove(FileListStoreKey.FileList, nodeData.path)
        }
        setCheckedKeys(newCheckedKeys)
        onSelect()
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
                    checkedKeys={checkedKeys}
                    setCheckedKeys={onSetCheckedKeys}
                />
            ))}
        </div>
    )
})
