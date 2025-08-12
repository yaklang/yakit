import React, {memo, useEffect, useRef, useState} from "react"
import {ForgeNameProps} from "./type"
import {YakitRoundCornerTag} from "@/components/yakitUI/YakitRoundCornerTag/YakitRoundCornerTag"
import {OutlinePencilaltIcon, OutlinePlussmIcon, OutlineSearchIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    useDebounceEffect,
    useDebounceFn,
    useInViewport,
    useMemoizedFn,
    useThrottleFn,
    useUpdateEffect,
    useVirtualList
} from "ahooks"
import {AIForge, QueryAIForgeRequest, QueryAIForgeResponse} from "../type/aiChat"
import {grpcDeleteAIForge, grpcGetAIForge, grpcQueryAIForge} from "../grpc"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {SolidToolIcon} from "@/assets/icon/solid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitRoute} from "@/enums/yakitRoute"
import {Tooltip} from "antd"
import {yakitNotify} from "@/utils/notification"
import {AIForgeListDefaultPagination} from "../defaultConstant"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"

import classNames from "classnames"
import styles from "./ForgeName.module.scss"

const ForgeName: React.FC<ForgeNameProps> = memo((props) => {
    // const {} = props

    // #region AIForge 模板增删改功能 使用功能
    // 新建 forge 模板
    const handleNewAIForge = useMemoizedFn(() => {
        emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AddAIForge}))
    })
    // 编辑 forge 模板
    const handleModifyAIForge = useMemoizedFn((info: AIForge) => {
        const id = Number(info.Id) || 0
        if (!id) {
            yakitNotify("error", `该模板 ID('${info.Id}') 异常, 无法编辑`)
            return
        }
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.ModifyAIForge,
                params: {id: id, source: YakitRoute.AI_Agent}
            })
        )
    })

    // 删除的 forge 队列
    const [delStatus, setDelStatus] = useState<number[]>([])
    // 删除 forge 模板
    const handleDeleteAIForge = useMemoizedFn((info: AIForge) => {
        const id = Number(info.Id) || 0
        if (!id) {
            yakitNotify("error", `该模板 ID('${info.Id}') 异常, 无法编辑`)
            return
        }
        const isLoading = delStatus.includes(id)
        if (isLoading) return
        setDelStatus((old) => [...old, id])
        grpcDeleteAIForge({Id: id})
            .then(() => {
                yakitNotify("success", "删除Forge模板成功")
                setData((old) => {
                    return {
                        ...old,
                        Total: old.Total - 1,
                        Data: old.Data.filter((item) => item.Id !== info.Id)
                    }
                })
            })
            .catch(() => {})
            .finally(() => {
                setTimeout(() => {
                    setDelStatus((old) => old.filter((el) => el !== id))
                }, 100)
            })
    })

    // 点击使用 Forge
    const handleOnClick = useMemoizedFn((info: AIForge) => {
        emiter.emit(
            "onServerChatEvent",
            JSON.stringify({
                type: "open-forge-form",
                params: {value: info}
            })
        )
    })
    // #endregion

    // #region AI-Forge 列表数据
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [data, setData, getData] = useGetSetState<QueryAIForgeResponse>({
        Pagination: {...AIForgeListDefaultPagination},
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
        if (isInit) isMore.current = true
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

        emiter.on("onTriggerRefreshForgeList", handleEmiterUpdateData)
        return () => {
            emiter.off("onTriggerRefreshForgeList", handleEmiterUpdateData)
        }
    }, [])

    const [search, setSearch] = useState("")
    useDebounceEffect(
        () => {
            fetchData(true)
        },
        [search],
        {wait: 300}
    )

    // 通信触发的刷新列表请求
    const handleEmiterTriggerRefresh = useDebounceFn(
        () => {
            fetchDataTotal()
            isMore.current = true
            fetchData(true)
        },
        {wait: 300}
    ).run

    // 通信触发更新数据请求
    const handleEmiterUpdateData = useMemoizedFn((id: string) => {
        console.log("handleEmiterUpdateData", id)

        const forgesArr = getData().Data || []
        const findIndex = forgesArr.findIndex((item) => Number(item.Id) === Number(id))
        if (findIndex !== -1) {
            // 存在数据则局部更新
            grpcGetAIForge(Number(id))
                .then((res) => {
                    console.log("ForgeName-grpcGetAIForge-res", res)
                    setData((old) => {
                        const newData = {...old}
                        newData.Data[findIndex] = res
                        return newData
                    })
                })
                .catch(() => {})
        } else {
            // 不存在数据则刷新列表
            handleEmiterTriggerRefresh()
        }
    })

    const wrapper = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(wrapper)

    useUpdateEffect(() => {
        if (inViewport) handleFillList()
    }, [inViewport])

    // 滚动加载更多
    const onScrollCapture = useThrottleFn(
        () => {
            if (!isMore.current) return
            if (loading) return
            if (wrapperRef && wrapperRef.current) {
                const {height} = wrapperRef.current.getBoundingClientRect()
                const {scrollHeight, scrollTop} = wrapperRef.current

                const scrollBottom = scrollHeight - scrollTop - height
                if (scrollBottom > -10) {
                    fetchData()
                }
            }
        },
        {wait: 200, leading: false}
    ).run
    // #endregion

    return (
        <div ref={wrapper} className={styles["forge-name"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["haeder-first"]}>
                    <div className={styles["first-title"]}>
                        模板库
                        <YakitRoundCornerTag>{total}</YakitRoundCornerTag>
                    </div>
                    <YakitButton icon={<OutlinePlussmIcon />} onClick={handleNewAIForge} />
                </div>

                <div className={styles["header-second"]}>
                    <YakitInput
                        prefix={<OutlineSearchIcon className={styles["search-icon"]} />}
                        allowClear
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
                            const delLoading = delStatus.includes(Number(Id))

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
                                            <div
                                                className={classNames(
                                                    styles["opt-title"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={ForgeName}
                                            >
                                                {ForgeName}
                                            </div>

                                            <div className={styles["item-extra"]}>
                                                <Tooltip
                                                    title={"编辑Forge"}
                                                    placement='topRight'
                                                    overlayClassName={styles["item-extra-tooltip"]}
                                                >
                                                    <YakitButton
                                                        type='text2'
                                                        icon={<OutlinePencilaltIcon />}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleModifyAIForge(data)
                                                        }}
                                                    />
                                                </Tooltip>
                                                <Tooltip
                                                    title={"删除Forge"}
                                                    placement='topRight'
                                                    overlayClassName={styles["item-extra-tooltip"]}
                                                >
                                                    <YakitPopconfirm
                                                        title={"是否删除该 Forge 模板?"}
                                                        onConfirm={(e) => {
                                                            e?.stopPropagation()
                                                            handleDeleteAIForge(data)
                                                        }}
                                                        onCancel={(e) => {
                                                            e?.stopPropagation()
                                                        }}
                                                    >
                                                        <YakitButton
                                                            loading={delLoading}
                                                            type='text2'
                                                            icon={<OutlineTrashIcon className={styles["del-icon"]} />}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                            }}
                                                        />
                                                    </YakitPopconfirm>
                                                </Tooltip>
                                            </div>
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
