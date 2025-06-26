import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {ForgeNameProps} from "./type"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlussmIcon, OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useDebounce, useDebounceEffect, useMemoizedFn, useVirtualList} from "ahooks"
import {AIForge, QueryAIForgeRequest, QueryAIForgeResponse} from "../type/aiChat"
import {grpcQueryAIForge} from "../grpc"
import {PaginationSchema} from "@/pages/invoker/schema"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidToolIcon} from "@/assets/icon/solid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

import classNames from "classnames"
import styles from "./ForgeName.module.scss"

export const ForgeName: React.FC<ForgeNameProps> = memo((props) => {
    const {} = props

    // #region AI-Forge 列表数据
    const [total, setTotal] = useState(0)
    const [data, setData, getData] = useGetSetState<QueryAIForgeResponse>({
        Pagination: {
            Page: 1,
            Limit: 50,
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
    const fetchData = useMemoizedFn((page?: number) => {
        const pageInfo = getData().Pagination
        const request: QueryAIForgeRequest = {
            Pagination: {
                ...pageInfo,
                Page: page ? page : ++pageInfo.Page
            }
        }
        if (search) request.Filter = {Keyword: search}
        grpcQueryAIForge(request)
            .then((res) => {
                console.log("res", request, res)
                setData(res)
            })
            .catch(() => {})
    })

    useEffect(() => {
        fetchData()
    }, [])

    const [search, setSearch] = useState("")
    useDebounceEffect(
        () => {
            fetchData(1)
        },
        [search],
        {wait: 300}
    )
    // #endregion

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
                <div ref={wrapperRef} className={styles["list-wrapper"]}>
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
                                        <div className={styles["forge-list-opt"]}>
                                            <div>{ForgeName}</div>
                                        </div>
                                    </YakitPopover>
                                </React.Fragment>
                            )
                        })}

                        <div className={styles["forge-list-no-more"]}>
                            <div className={styles["no-more-title"]}>已经到底了</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
