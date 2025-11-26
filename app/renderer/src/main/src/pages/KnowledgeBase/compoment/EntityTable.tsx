import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import useVirtualTableHook from "@/hook/useVirtualTableHook/useVirtualTableHook"
import {useAsyncEffect, useCreation, useMemoizedFn, useRequest, useSafeState, useUpdateEffect} from "ahooks"
import {useEffect, useMemo, useRef, type FC} from "react"
import ReactResizeDetector from "react-resize-detector"
import styles from "../knowledgeBase.module.scss"

import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {apiQueryEntity, transformToGraphData} from "../utils"

import {QueryEntityRequest} from "../TKnowledgeBase"
import {genDefaultPagination} from "@/pages/invoker/schema"
import {KnowledgeBaseTableHeaderProps} from "./KnowledgeBaseTableHeader"
import {v4 as uuidv4} from "uuid"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {Divider, Tooltip} from "antd"
import {Entity, GenerateERMDotResponse} from "@/components/playground/entityRepository"
import {failed} from "@/utils/notification"
import emiter from "@/utils/eventBus/eventBus"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {EntityDetailDrawer} from "./EntityDetailDrawer"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {
    OutlineExclamationIcon,
    OutlinePhotographIcon,
    OutlinePlay2Icon,
    OutlineTerminalIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import GraphChart from "./GraphChart"
import {GenerateKnowledge} from "./GenerateKnowledge"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import React from "react"
import {YakitCloseSvgIcon} from "@/components/basics/icon"
import classNames from "classnames"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {HubButton} from "@/pages/pluginHub/hubExtraOperate/funcTemplate"

const {ipcRenderer} = window.require("electron")

const EntityTable: FC<KnowledgeBaseTableHeaderProps & {linkId: string[]}> = (props) => {
    const {
        knowledgeBaseItems,
        setTableProps,
        tableProps,
        query,
        linkId,
        selectList,
        setSelectList,
        allCheck,
        setAllCheck
    } = props
    const tableBoxRef = useRef<HTMLDivElement>(null)
    const boxHeightRef = useRef<number>()
    const tableRef = useRef<HTMLUListElement>(null)

    const wrapperWidth = useListenWidth(tableBoxRef)

    const [isRefresh, setIsRefresh] = useSafeState<boolean>(false)
    const [selectedSubERMId, setSelectedSubERMId] = useSafeState<string>("")

    const [scrollToIndex, setScrollToIndex] = useSafeState<number>()
    const [entityDrawerDetail, setEntityDrawerDetail] = useSafeState<Partial<Entity> & {visible: boolean}>({
        visible: false
    })
    const [type, setType] = useSafeState("svg")
    const [depth, setDepth] = useSafeState(2)
    const [currentIndex, setCurrentIndex] = useSafeState<number>()

    // 获取实体关系图
    const {data, runAsync, loading} = useRequest(
        async (HiddenIndex: string[], Depth?: number) => {
            const response = await ipcRenderer.invoke("QuerySubERM", {
                Filter: {
                    HiddenIndex
                },
                Depth: Depth ?? 2
            })
            return transformToGraphData(response)
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体关系图失败: ${err}`)
        }
    )

    const {
        data: dotCode,
        runAsync: dotCodeRunAsync,
        loading: dotCodeLoading
    } = useRequest(
        async (HiddenIndex: string[]) => {
            const response: GenerateERMDotResponse = await ipcRenderer.invoke("GenerateERMDot", {
                Filter: {
                    HiddenIndex
                },
                Depth: depth
            })
            return response.Dot || ""
        },
        {
            manual: true
        }
    )

    useUpdateEffect(() => {
        if (type === "code" && selectList?.length > 0) {
            const HiddenIndexList = selectList.map((it) => it.HiddenIndex)
            dotCodeRunAsync(HiddenIndexList)
        }
    }, [type, selectList, depth])

    useAsyncEffect(async () => {
        if (type === "svg" && selectList?.length > 0) {
            const HiddenIndexList = selectList.map((it) => it.HiddenIndex)
            await runAsync(HiddenIndexList, depth)
        }
    }, [type, selectList, depth])

    const onFirst = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
        setSelectList([])
        setAllCheck(false)
    })

    const [tableParams, tableData, tableTotal, pagination, _, __, debugVirtualTableEvent] = useVirtualTableHook<
        QueryEntityRequest,
        Entity,
        "Entities",
        "ID"
    >({
        tableBoxRef,
        tableRef,
        boxHeightRef,
        grpcFun: apiQueryEntity,
        onFirst,
        responseKey: {data: "Entities", id: "ID"}
    })

    const {run: knowledgeBaseIndexRun} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("ListEntityRepository", {})

            const targetBaseIndex = result?.EntityRepositories?.find(
                (it) => it.Name === knowledgeBaseItems?.KnowledgeBaseName
            )?.HiddenIndex
            return targetBaseIndex
        },
        {
            manual: true,
            onSuccess: (BaseIndex) => {
                debugVirtualTableEvent.setP({
                    Pagination: genDefaultPagination(20),
                    Filter: {
                        ...tableParams.Filter,
                        BaseIndex
                    }
                })
            },
            onError: (err) => failed(`获取全局知识库失败: ${err}`)
        }
    )

    const {
        data: QueryEntityDetail,
        runAsync: QueryEntityDetailRunAsync,
        loading: QueryEntityDetailLoading
    } = useRequest(
        async (HiddenIndex: string[]) => {
            const response = await apiQueryEntity({
                Pagination: genDefaultPagination(20),

                Filter: {
                    HiddenIndex
                }
            })
            return response.Entities?.[0] ?? {}
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体失败: ${err}`)
        }
    )

    useEffect(() => {
        knowledgeBaseIndexRun()
    }, [knowledgeBaseItems.ID, tableProps.type])

    useEffect(() => {
        debugVirtualTableEvent.setP({
            ...tableParams,
            Filter: {
                ...tableParams.Filter,
                Keywords: [query]
            }
        })
    }, [query])

    useUpdateEffect(() => {
        setTableProps((preValue) => ({
            ...preValue,
            tableTotal: tableTotal
        }))
    }, [tableTotal])

    useUpdateEffect(() => {
        if (allCheck) return setTableProps((preValue) => ({...preValue, selectNum: tableTotal}))
        else
            return setTableProps((preValue) => ({
                ...preValue,
                selectNum: selectList.length
            }))
    }, [allCheck, selectList, tableTotal])

    const onTableResize = useMemoizedFn((width, height) => {
        if (!width || !height) {
            return
        }
        if (!selectList?.length) {
            // 窗口由小变大时 重新拉取数据
            if (boxHeightRef.current && boxHeightRef.current < height) {
                boxHeightRef.current = height
                // updateData()
            } else {
                boxHeightRef.current = height
            }
        }
    })

    const selectedRowKeys = useCreation(() => {
        return selectList.map((ele) => ele.ID) || []
    }, [selectList])

    const onSelectAll = useMemoizedFn((_: string[], __: any[], checked: boolean) => {
        if (checked) {
            setAllCheck(true)
            setSelectList(tableData)
        } else {
            setAllCheck(false)
            setSelectList([])
        }
    })

    const onChangeCheckboxSingle = useMemoizedFn((c: boolean, _: string, selectedRows: any) => {
        if (c) {
            setSelectList((s) => [...s, selectedRows])
        } else {
            setSelectList((s) => s.filter((ele) => ele.ID !== selectedRows.ID))
            setAllCheck(false)
        }
    })

    const onSetCurrentRow = useMemoizedFn(async (val?: Entity, cancelVal?: Entity) => {
        const currentSelectItem = [val, cancelVal]
        const toggleIDs = new Set((currentSelectItem || []).filter(Boolean).map((i) => i?.ID))

        const result = [
            ...selectList.filter((a) => !toggleIDs.has(a.ID)),
            ...currentSelectItem.filter(Boolean).filter((b) => !selectList.some((a) => a.ID === b?.ID))
        ]
        setSelectList(result)
        setAllCheck(result.length === tableData.length)
        setType("svg")
    })

    const columns = useCreation(() => {
        const columnsArr: ColumnsTypeProps[] = [
            {
                title: "ID",
                dataKey: "ID",
                width: 80,
                sorterProps: {
                    sorter: true,
                    sorterKey: "ID"
                }
            },
            {
                title: "名称",
                dataKey: "Name",
                width: 100
            },
            {
                title: "类型",
                dataKey: "Type",
                width: 140,
                render: (value) => (value ? <YakitTag color='blue'>{value}</YakitTag> : "-")
            },

            {
                title: "描述",
                dataKey: "Description"
            },
            {
                title: "属性",
                dataKey: "Attributes",
                width: 200,
                render: (value) => {
                    return value && value.length > 0
                        ? value?.map((it) => (
                              <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                  {it.Value}
                              </YakitTag>
                          ))
                        : "-"
                },
                enableDrag: false
            },
            {
                title: "操作",
                dataKey: "HiddenIndex",
                width: 70,
                fixed: "right",
                render: (_, item: Entity) => (
                    <YakitButton
                        type='text'
                        onClick={(e) => {
                            e.stopPropagation()
                            openEntityDetailDrawer(item)
                        }}
                    >
                        详情
                    </YakitButton>
                )
            }
        ]
        return columnsArr
    }, [tableProps.type, knowledgeBaseItems.ID])

    const ResizeBoxProps = useCreation(() => {
        setSelectedSubERMId("")
        let p = {
            firstRatio: "50%",
            secondRatio: "50%"
        }
        if (!selectedRowKeys.length) {
            p.secondRatio = "0%"
            p.firstRatio = "100%"
        }
        return p
    }, [selectedRowKeys])

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }

        const finalParams = {
            Pagination: {
                ...tableParams.Pagination,
                Order: sort.order,
                OrderBy: sort.orderBy
            },
            Filter: {
                ...tableParams.Filter,
                ...filter,
                IsRead: tableProps.type === "all" ? 0 : -1
            }
        }
        debugVirtualTableEvent.setP(finalParams)
    })

    const onErModelRelationshipFun = useMemoizedFn((data) => {
        try {
            const updateData = JSON.parse(data)
            if (updateData === "create") {
                debugVirtualTableEvent.startT()
            }
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onErModelRelationship", onErModelRelationshipFun)
        return () => {
            emiter.off("onErModelRelationship", onErModelRelationshipFun)
        }
    })

    const openEntityDetailDrawer = (items) => {
        setEntityDrawerDetail({
            visible: true,
            ...items
        })
    }

    useEffect(() => {
        const matched = tableData
            .map((item, index) => ({item, index}))
            .filter(({item}) => linkId.includes(item.BaseIndex))

        const indexes = matched.map((m) => m.index)
        const maxIndex = indexes.length ? Math.max(...indexes) : -1

        const result = {
            objects: matched.map((m) => m.item),
            indexes,
            maxIndex,
            maxObject: maxIndex >= 0 ? tableData[maxIndex] : undefined
        }

        if (matched.length > 0) {
            onSetCurrentRow(result.maxObject)
            setScrollToIndex(result.maxIndex)
            setCurrentIndex(result.maxIndex)
            // selectedRowKeys(result.indexes)
        }
    }, [linkId, tableData])

    const onNodeClick = useMemoizedFn(async (clickNode) => {
        if (clickNode?.HiddenIndex?.length > 0) {
            setSelectedSubERMId(clickNode.HiddenIndex)
            await QueryEntityDetailRunAsync([clickNode.HiddenIndex])
        } else {
            setSelectedSubERMId("")
        }
    })

    const tableHeaderSize = useMemo(() => {
        return (
            <div className={styles["container"]}>
                {allCheck ? (
                    <React.Fragment>
                        <Divider type='vertical' />
                        <div className={styles["select-all"]}>
                            Selected <span>all</span>{" "}
                            <OutlineXIcon
                                onClick={() => {
                                    setSelectList([])
                                    setAllCheck(false)
                                }}
                            />
                        </div>
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        {selectList.length > 0 ? (
                            <React.Fragment>
                                <Divider type='vertical' />
                                <YakitPopover
                                    overlayClassName={styles["table-selected-filter-popover"]}
                                    content={
                                        <div className={styles["hub-outer-list-filter"]}>
                                            {selectList.map((item) => {
                                                return item ? (
                                                    <YakitTag
                                                        key={item.ID}
                                                        closable
                                                        onClose={() => {
                                                            const result = selectList.filter((it) => it.ID !== item.ID)
                                                            setSelectList(result)
                                                            setAllCheck(false)
                                                        }}
                                                    >
                                                        {item.ID}
                                                    </YakitTag>
                                                ) : null
                                            })}
                                        </div>
                                    }
                                    trigger='hover'
                                    placement='bottomLeft'
                                >
                                    <div className={styles["tag-total"]}>
                                        <span>
                                            Selected <span className={styles["total-style"]}>{selectList.length}</span>
                                        </span>
                                        <OutlineXIcon
                                            onClick={() => {
                                                setSelectList([])
                                                setAllCheck(false)
                                            }}
                                        />
                                    </div>
                                </YakitPopover>
                            </React.Fragment>
                        ) : null}
                    </React.Fragment>
                )}
            </div>
        )
    }, [allCheck, selectList])

    return (
        <div ref={tableBoxRef} className={styles["knowledge-base-table"]}>
            <ReactResizeDetector
                onResize={onTableResize}
                handleWidth={true}
                handleHeight={true}
                refreshMode={"debounce"}
                refreshRate={50}
            />
            <YakitResizeBox
                firstMinSize={160}
                secondMinSize={200}
                isVer={true}
                lineStyle={{display: !!selectedRowKeys.length ? "" : "none"}}
                lineDirection='bottom'
                secondNodeStyle={{
                    display: !selectedRowKeys.length ? "none" : "",
                    padding: !selectedRowKeys.length ? 0 : undefined
                }}
                firstNode={
                    <TableVirtualResize
                        key={knowledgeBaseItems.ID + tableProps.type}
                        ref={tableRef}
                        query={tableParams.Filter}
                        scrollToIndex={scrollToIndex}
                        isRefresh={isRefresh}
                        titleHeight={32}
                        currentIndex={currentIndex}
                        setCurrentIndex={setCurrentIndex}
                        isShowTitle={false}
                        renderKey='ID'
                        data={tableData}
                        lineHighlight={false}
                        rowSelection={{
                            isAll: allCheck,
                            type: "checkbox",
                            selectedRowKeys,
                            onSelectAll,
                            onChangeCheckboxSingle
                        }}
                        pagination={{
                            total: tableTotal,
                            limit: pagination.Limit,
                            page: pagination.Page,
                            onChange: () => null
                        }}
                        columns={columns}
                        onSetCurrentRow={onSetCurrentRow}
                        enableDrag={true}
                        useUpAndDown
                        onChange={onTableChange}
                    />
                }
                secondNode={
                    <div className={styles["second-node-container"]} key={selectedRowKeys.join(",") + tableProps.type}>
                        <div className={styles["knowledge-table-second-node"]}>
                            <div className={styles["header"]}>
                                <div className={styles["header-left"]}>
                                    <div>实体关系图</div>
                                    {tableHeaderSize}
                                    {data?.links?.length === 0 && wrapperWidth > 900 ? (
                                        <React.Fragment>
                                            <Divider type={"vertical"} />
                                            <div className={styles["no-relationship-warning"]}>
                                                <OutlineExclamationIcon />
                                                图中只有实体没有关系，生成的知识精度低
                                            </div>
                                        </React.Fragment>
                                    ) : null}
                                </div>
                                <div className={styles["operate"]}>
                                    <div className={styles["in-depth-description"]}>深度</div>
                                    <YakitInputNumber
                                        className={styles["operate-inputNumber"]}
                                        value={depth}
                                        onChange={(value) => {
                                            if (typeof value === "number" && value) {
                                                setDepth(value)
                                            }
                                        }}
                                    />
                                    <GenerateKnowledge
                                        generateKnowledgeDataList={selectList}
                                        generateKnowledgeBaseItem={knowledgeBaseItems}
                                        depth={depth}
                                        knowledgeType='entity'
                                        isAll={allCheck}
                                        children={
                                            <HubButton
                                                width={wrapperWidth}
                                                iconWidth={900}
                                                icon={<OutlinePlay2Icon />}
                                                type='outline1'
                                                name={"从实体生成知识"}
                                            />
                                        }
                                    />
                                    <Divider type={"vertical"} />
                                    <YakitRadioButtons
                                        buttonStyle='solid'
                                        value={type}
                                        onChange={(e) => {
                                            setSelectedSubERMId("")
                                            setType(e.target.value)
                                        }}
                                        options={[
                                            {
                                                label: (
                                                    <div className={styles["radio-buttons-label"]}>
                                                        {wrapperWidth > 900 ? (
                                                            <React.Fragment>
                                                                <OutlinePhotographIcon />
                                                                SVG
                                                            </React.Fragment>
                                                        ) : (
                                                            <Tooltip title='SVG'>
                                                                <OutlinePhotographIcon />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                ),
                                                value: "svg"
                                            },
                                            {
                                                label: (
                                                    <div className={styles["radio-buttons-label"]}>
                                                        {wrapperWidth > 900 ? (
                                                            <React.Fragment>
                                                                <OutlineTerminalIcon />
                                                                Code
                                                            </React.Fragment>
                                                        ) : (
                                                            <Tooltip title='Code'>
                                                                <OutlineTerminalIcon />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                ),
                                                value: "code"
                                            }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div className={classNames(styles["second-node-content"])}>
                                <div className={styles["content"]}>
                                    {type === "svg" ? (
                                        <YakitSpin spinning={loading}>
                                            {data ? (
                                                <GraphChart graphData={data} onNodeClick={onNodeClick} />
                                            ) : (
                                                <YakitEmpty />
                                            )}
                                        </YakitSpin>
                                    ) : (
                                        <YakitSpin spinning={dotCodeLoading}>
                                            <pre style={{padding: 12}}>{dotCode}</pre>
                                        </YakitSpin>
                                    )}
                                </div>
                                <div
                                    className={classNames(styles["detail-box"], {
                                        [styles["hidden"]]: !selectedSubERMId
                                    })}
                                >
                                    <YakitSpin spinning={QueryEntityDetailLoading}>
                                        <div className={styles["header"]}>
                                            <div>实体信息</div>
                                            <YakitCloseSvgIcon onClick={() => setSelectedSubERMId("")} />
                                        </div>
                                        <div className={styles["content"]}>
                                            <div className={styles["inner-box"]}>
                                                <div className={styles["title"]}>名称</div>
                                                <div className={styles["detail"]}>{QueryEntityDetail?.Name}</div>
                                            </div>
                                            <div className={styles["inner-box"]}>
                                                <div className={styles["title"]}>类型</div>
                                                <div className={styles["detail"]}>
                                                    <YakitTag color='blue'>{QueryEntityDetail?.Type}</YakitTag>
                                                </div>
                                            </div>
                                            <div className={styles["inner-box"]}>
                                                <div className={styles["title"]}>描述</div>
                                                <div className={styles["detail"]}>{QueryEntityDetail?.Description}</div>
                                            </div>
                                        </div>
                                    </YakitSpin>
                                </div>
                            </div>
                        </div>
                    </div>
                }
                {...ResizeBoxProps}
            />
            <EntityDetailDrawer
                entityDrawerDetail={entityDrawerDetail}
                setEntityDrawerDetail={setEntityDrawerDetail}
                setTData={debugVirtualTableEvent.setTData}
                tableData={tableData}
                generateKnowledgeBaseItem={knowledgeBaseItems}
            />
        </div>
    )
}

export {EntityTable}
