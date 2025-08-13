import React, {useEffect, useRef, useState} from "react"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {AIToolListItemProps, AIToolListProps, ToolQueryType} from "./AIToolListType"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {grpcGetAIToolList, grpcToggleAIToolFavorite} from "./utils"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {SolidStarIcon, SolidToolIcon} from "@/assets/icon/solid"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineStarIcon} from "@/assets/icon/outline"
import styles from "./AIToolList.module.scss"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {AITool, GetAIToolListRequest, GetAIToolListResponse, ToggleAIToolFavoriteRequest} from "../type/aiChat"

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
    return (
        <div className={styles["ai-tool-list-wrapper"]} ref={toolListRef}>
            <div className={styles["ai-tool-list-header"]}>
                <YakitRadioButtons
                    size='small'
                    buttonStyle='solid'
                    value={toolQueryType}
                    options={toolTypeOptions}
                    onChange={onToolQueryTypeChange}
                />
                <div className={styles["ai-tool-list-total"]}>{response.Total}</div>
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
                                <AIToolListItem item={rowData} onSetData={onSetData} />
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

const colors: YakitTagColor[] = [
    "blue",
    "bluePurple",
    "cyan",
    "green",
    "info",
    "purple",
    "success",
    "warning",
    "yellow"
]
const AIToolListItem: React.FC<AIToolListItemProps> = React.memo((props) => {
    const {item, onSetData} = props
    const onFavorite = useMemoizedFn((e) => {
        e.stopPropagation()
        const params: ToggleAIToolFavoriteRequest = {
            ToolName: item.Name
        }
        grpcToggleAIToolFavorite(params).then(() => {
            onSetData({
                ...item,
                IsFavorite: !item.IsFavorite
            })
        })
    })
    const tags = useCreation(() => {
        return (
            <div className={styles["ai-tool-list-item-keywords"]}>
                {item.Keywords.map((keyword) => {
                    const number = Math.floor(Math.random() * colors.length)
                    return (
                        <YakitTag
                            size='small'
                            key={keyword}
                            className={styles["ai-tool-list-item-keywords-tag"]}
                            color={colors[number]}
                        >
                            {keyword}
                        </YakitTag>
                    )
                })}
            </div>
        )
    }, [item.Keywords])
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
                            <span className={styles["ai-tool-list-item-heard-name-text"]}>{item.Name}</span>
                        </div>
                        <div className={styles["ai-tool-list-item-heard-extra"]}>
                            <CopyComponents
                                copyText={item.Name}
                                iconColor='var(--Colors-Use-Neutral-Text-3-Secondary)'
                            />
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
                        </div>
                    </div>
                    <div className={styles["ai-tool-list-item-description"]}>{item.Description}</div>
                    {tags}
                </div>
            </YakitPopover>
        </>
    )
})
