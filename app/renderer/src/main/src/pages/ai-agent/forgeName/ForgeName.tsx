import React, {memo, useEffect, useRef, useState} from "react"
import {ForgeNameProps} from "./type"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useDebounceEffect, useMemoizedFn, useThrottleFn, useVirtualList} from "ahooks"
import {AIForge, QueryAIForgeRequest, QueryAIForgeResponse} from "../type/aiChat"
import {grpcQueryAIForge} from "../grpc"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidToolIcon} from "@/assets/icon/solid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import emiter from "@/utils/eventBus/eventBus"

import classNames from "classnames"
import styles from "./ForgeName.module.scss"

const ForgeName: React.FC<ForgeNameProps> = memo((props) => {
    // const {} = props

    // #region AI-Forge 列表数据
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [data, setData, getData] = useGetSetState<QueryAIForgeResponse>({
        Pagination: {
            Page: 1,
            Limit: 20,
            Order: "desc",
            OrderBy: "id"
        },
        Data: [],
        Total: 0
    })
    const isMore = useRef(true)

    const wrapperRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [list] = useVirtualList(data.Data, {
        containerTarget: wrapperRef,
        wrapperTarget: containerRef,
        itemHeight: 41,
        overscan: 5
    })

    // 获取 AI-Forge 总数
    const fetchDataTotal = useMemoizedFn(() => {
        grpcQueryAIForge(
            {
                Pagination: {
                    Page: 1,
                    Limit: 1,
                    Order: "desc",
                    OrderBy: "id"
                }
            },
            true
        )
            .then((res) => {
                setTotal(Number(res.Total) || 0)
            })
            .catch(() => {})
    })
    // 获取 AI-Forge 列表
    const fetchData = useMemoizedFn((isInit?: boolean) => {
        if (!isMore.current) return
        const pageInfo = getData().Pagination
        const request: QueryAIForgeRequest = {
            Pagination: {
                ...pageInfo,
                Page: isInit ? 1 : ++pageInfo.Page
            }
        }
        if (search) request.Filter = {Keyword: search}

        setLoading(true)
        grpcQueryAIForge(request)
            .then((res) => {
                const newLength = res.Data?.length || 0
                if (newLength < request.Pagination.Limit) isMore.current = false
                else isMore.current = true

                const newArr = isInit ? res.Data : getData().Data.concat(res.Data)
                console.log("res", request, res, newArr, getData().Data)
                setData({...res, Pagination: request.Pagination, Data: newArr})
                if (isInit) {
                    setTimeout(() => {
                        handleFillList()
                    }, 100)
                }
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })
    // 判断数据是否填充满列表
    const handleFillList = useMemoizedFn(() => {
        if (wrapperRef && wrapperRef.current && containerRef && containerRef.current) {
            const {scrollHeight} = wrapperRef.current
            const {height} = containerRef.current.getBoundingClientRect()
            if (scrollHeight - height > -20) {
                fetchData()
            }
        }
    })

    useEffect(() => {
        fetchDataTotal()
    }, [])

    const [search, setSearch] = useState("")
    useDebounceEffect(
        () => {
            fetchData(true)
        },
        [search],
        {wait: 300}
    )

    // 滚动加载更多
    const onScrollCapture = useThrottleFn(
        () => {
            if (!isMore.current) return
            if (loading) return
            if (wrapperRef && wrapperRef.current) {
                const {height} = wrapperRef.current.getBoundingClientRect()
                const {scrollHeight, scrollTop} = wrapperRef.current
                console.log("onScrollCapture", scrollHeight, scrollTop, height)

                const scrollBottom = scrollHeight - scrollTop - height
                if (scrollBottom > -10) {
                    fetchData()
                }
            }
        },
        {wait: 200, leading: false}
    ).run
    // #endregion

    const handleOnClick = useMemoizedFn((info: AIForge) => {
        emiter.emit(
            "onServerChatEvent",
            JSON.stringify({
                type: "open-forge-form",
                params: {value: info}
            })
        )
    })

    return (
        <div className={styles["forge-name"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["haeder-first"]}>
                    <div className={styles["first-title"]}>
                        模板库
                        <YakitRoundCornerTag>{total}</YakitRoundCornerTag>
                    </div>
                    {/* <YakitButton icon={<OutlinePlussmIcon />} /> */}
                </div>

                <div className={styles["header-second"]}>
                    <YakitInput
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        allowClear={true}
                        placeholder='请输入关键词搜索'
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles["forge-name-list"]}>
                <div ref={wrapperRef} className={styles["list-wrapper"]} onScroll={onScrollCapture}>
                    <div ref={containerRef}>
                        {list.map(({data, index}) => {
                            const {Id, ForgeName, Description, ToolNames} = data
                            const key = Number(Id) || index
                            const tools = ToolNames ? ToolNames.filter(Boolean) : []

                            return (
                                <React.Fragment key={key}>
                                    <YakitPopover
                                        overlayClassName={styles["forge-opt-popover"]}
                                        placement='right'
                                        content={
                                            <div className={styles["forge-detail"]}>
                                                <div
                                                    className={classNames(
                                                        styles["detail-name"],
                                                        "yakit-content-single-ellipsis"
                                                    )}
                                                    title={ForgeName}
                                                >
                                                    {ForgeName}
                                                </div>

                                                <div className={styles["detail-content"]}>
                                                    <div className={styles["content-description"]}>
                                                        {Description || "暂无更多说明"}
                                                    </div>

                                                    {tools.length > 0 && (
                                                        <div className={styles["content-tools"]}>
                                                            <div className={styles["tools-header"]}>
                                                                <SolidToolIcon />
                                                                关联工具
                                                            </div>

                                                            <div className={styles["tools-body"]}>
                                                                {tools.map((tool) => {
                                                                    return (
                                                                        <YakitTag
                                                                            key={tool}
                                                                            className={styles["tool-tag"]}
                                                                        >
                                                                            {tool}
                                                                        </YakitTag>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        }
                                    >
                                        <div className={styles["forge-list-opt"]} onClick={() => handleOnClick(data)}>
                                            <div>{ForgeName}</div>
                                        </div>
                                    </YakitPopover>
                                </React.Fragment>
                            )
                        })}

                        {!isMore.current && !loading && (
                            <div className={styles["forge-list-no-more"]}>
                                <div className={styles["no-more-title"]}>已经到底了</div>
                            </div>
                        )}
                        {loading && (
                            <div className={styles["forge-list-loading"]}>
                                <YakitSpin wrapperClassName={styles["loading-style"]} spinning={true} tip='' />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
})

export default ForgeName
