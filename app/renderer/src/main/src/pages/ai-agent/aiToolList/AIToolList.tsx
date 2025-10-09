import React, {useEffect, useRef, useState} from "react"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {AIToolListItemProps, AIToolListProps, ToolQueryType} from "./AIToolListType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {grpcDeleteAITool, grpcGetAIToolList, grpcToggleAIToolFavorite} from "./utils"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {SolidStarIcon, SolidToolIcon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineDotsverticalIcon,
    OutlinePencilaltIcon,
    OutlinePlussmIcon,
    OutlineStarIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import styles from "./AIToolList.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {AITool, GetAIToolListRequest, GetAIToolListResponse, ToggleAIToolFavoriteRequest} from "../type/aiChat"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitMenuItemType} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {setClipboardText} from "@/utils/clipboard"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import {tagColors} from "../defaultConstant"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {yakitNotify} from "@/utils/notification"
import {AIToolEditorPageInfoProps} from "@/store/pageInfo"

const toolTypeOptions = [
    {
        label: "全部",
        value: "all"
    },
    {
        label: "收藏",
        value: "collect"
    }
]
const AIToolList: React.FC<AIToolListProps> = React.memo((props) => {
    const [toolQueryType, setToolQueryType] = useState<ToolQueryType>("all")
    const [keyWord, setKeyWord] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [recalculation, setRecalculation] = useState<boolean>(false)
    const [response, setResponse] = useState<GetAIToolListResponse>({
        Tools: [],
        Pagination: genDefaultPagination(20),
        Total: 0
    })

    const toolListRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(toolListRef)

    useEffect(() => {
        getList()
    }, [inViewPort])
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
            OnlyFavorites: toolQueryType === "collect"
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
    const onSearch = useMemoizedFn((value) => {
        setKeyWord(value)
        setTimeout(() => {
            getList()
        }, 200)
    })
    const onPressEnter = useMemoizedFn((e) => {
        onSearch(e.target.value)
    })
    const loadMoreData = useMemoizedFn(() => {
        getList(+response.Pagination.Page + 1)
    })
    const onToolQueryTypeChange = useMemoizedFn((e) => {
        setToolQueryType(e.target.value as ToolQueryType)
        setKeyWord("")
        setTimeout(() => {
            getList()
        }, 200)
    })
    const onSetData = useMemoizedFn((item: AITool) => {
        setResponse((preV) => ({
            ...preV,
            Tools: preV.Tools.map((ele) => {
                if (ele.Name === item.Name) {
                    return {...ele, IsFavorite: item.IsFavorite}
                }
                return {...ele}
            })
        }))
        setRecalculation((v) => !v)
    })
    // 新建 forge 模板
    const handleNewAIForge = useMemoizedFn(() => {
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AddAITool}))
    })
    return (
        <div className={styles["ai-tool-list-wrapper"]} ref={toolListRef}>
            <div className={styles["ai-tool-list-header"]}>
                <div className={styles["ai-tool-list-header-left"]}>
                    <YakitRadioButtons
                        size='small'
                        buttonStyle='solid'
                        value={toolQueryType}
                        options={toolTypeOptions}
                        onChange={onToolQueryTypeChange}
                    />
                    <YakitRoundCornerTag>{response.Total}</YakitRoundCornerTag>
                </div>
                <YakitButton icon={<OutlinePlussmIcon />} onClick={handleNewAIForge} />
            </div>
            <YakitInput.Search
                value={keyWord}
                onChange={(e) => setKeyWord(e.target.value)}
                onSearch={onSearch}
                onPressEnter={onPressEnter}
                wrapperStyle={{margin: "0 12px"}}
                allowClear
            />
            <YakitSpin spinning={spinning}>
                <RollingLoadList<AITool>
                    data={response.Tools}
                    loadMoreData={loadMoreData}
                    renderRow={(rowData: AITool, index: number) => {
                        return (
                            <React.Fragment key={rowData.Name}>
                                <AIToolListItem item={rowData} onSetData={onSetData} onRefresh={getList} />
                            </React.Fragment>
                        )
                    }}
                    classNameRow={styles["ai-tool-list-item"]}
                    classNameList={styles["ai-tool-list"]}
                    page={+response.Pagination.Page}
                    hasMore={hasMore}
                    loading={loading}
                    defItemHeight={120}
                    rowKey='Name'
                    isRef={isRef}
                    recalculation={recalculation}
                />
            </YakitSpin>
        </div>
    )
})
export default AIToolList

const AIToolListItem: React.FC<AIToolListItemProps> = React.memo((props) => {
    const {item, onSetData, onRefresh} = props
    const [visible, setVisible] = useState<boolean>(false)
    const onFavorite = useMemoizedFn(() => {
        // e.stopPropagation()
        const params: ToggleAIToolFavoriteRequest = {
            ID: item.ID
        }
        grpcToggleAIToolFavorite(params).then(() => {
            onSetData({
                ...item,
                IsFavorite: !item.IsFavorite
            })
        })
    })
    const tags = useCreation(() => {
        const length = tagColors.length
        return (
            <div className={styles["ai-tool-list-item-keywords"]}>
                {[...new Set(item.Keywords)].map((keyword) => {
                    const number = Math.floor(Math.random() * length)
                    return (
                        <YakitTag
                            size='small'
                            key={keyword}
                            className={styles["ai-tool-list-item-keywords-tag"]}
                            color={tagColors[number]}
                        >
                            {keyword}
                        </YakitTag>
                    )
                })}
            </div>
        )
    }, [item.Keywords])
    const toolMenu: YakitMenuItemType[] = useCreation(() => {
        return [
            {
                key: "copy",
                label: "复制",
                itemIcon: <OutlineTrashIcon />
            },
            {
                key: "delete",
                label: "删除",
                type: "danger",
                itemIcon: <OutlineTrashIcon />
            }
        ]
    }, [item.IsFavorite])
    const menuSelect = useMemoizedFn((key: string) => {
        switch (key) {
            case "copy":
                setClipboardText(item.Name)
                break
            case "delete":
                onRemove()
                break
            default:
                break
        }
    })
    const onRemove = useMemoizedFn(() => {
        grpcDeleteAITool({IDs: [item.ID]}).then(() => {
            onRefresh()
            yakitNotify("success", "删除成功")
        })
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        if (!item.ID) {
            yakitNotify("error", `该模板 ID('${item.ID}') 异常, 无法编辑`)
            return
        }
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.ModifyAITool,
                params: {id: item.ID, source: YakitRoute.AI_Agent} as AIToolEditorPageInfoProps
            })
        )
    })
    return (
        <>
            <YakitPopover
                placement='right'
                overlayClassName={styles["terminal-popover"]}
                content={<YakitEditor type={"yak"} value={item.Content} readOnly={true} />}
            >
                <div className={styles["ai-tool-list-item-content"]}>
                    <div className={styles["ai-tool-list-item-heard"]}>
                        <div className={styles["ai-tool-list-item-heard-name"]}>
                            <SolidToolIcon className={styles["tool-icon"]} />
                            <span className={styles["ai-tool-list-item-heard-name-text"]}>{item.VerboseName||item.Name}</span>
                        </div>
                        <div className={styles["ai-tool-list-item-heard-extra"]}>
                            {item.IsFavorite ? (
                                <YakitButton
                                    type='text2'
                                    icon={<SolidStarIcon className={styles["star-icon-active"]} />}
                                    onClick={onFavorite}
                                />
                            ) : (
                                <YakitButton
                                    type='text2'
                                    icon={<OutlineStarIcon className={styles["star-icon"]} />}
                                    onClick={onFavorite}
                                />
                            )}
                            <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={onEdit} />
                            <YakitDropdownMenu
                                menu={{
                                    data: toolMenu,
                                    onClick: ({key}) => menuSelect(key)
                                }}
                                dropdown={{
                                    trigger: ["click", "contextMenu"],
                                    placement: "bottomLeft",
                                    visible: visible,
                                    onVisibleChange: setVisible
                                }}
                            >
                                <YakitButton
                                    isActive={visible}
                                    type='text2'
                                    size='small'
                                    icon={<OutlineDotsverticalIcon />}
                                />
                            </YakitDropdownMenu>
                        </div>
                    </div>
                    <div className={styles["ai-tool-list-item-description"]}>{item.Description}</div>
                    {tags}
                </div>
            </YakitPopover>
        </>
    )
})
