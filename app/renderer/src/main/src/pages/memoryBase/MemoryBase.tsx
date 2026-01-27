import React, {useState} from "react"
import {MemoryBaseProps, AITextareaProps, MemoryQueryProps, MemoryTableProps} from "./type"
import styles from "./MemoryBase.module.scss"
import classNames from "classnames"
import {ChevrondownButton, ChevronleftButton} from "../ai-re-act/aiReActChat/AIReActComponent"
import {QSInputTextarea} from "../ai-agent/template/template"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowupIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTranslateIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {Divider, Slider} from "antd"
import {OutlineSparklesColorsIcon} from "@/assets/icon/colors"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import numeral from "numeral"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {AIMemoryContent} from "../ai-agent/chatTemplate/aiMemoryList/AIMemoryList"
import {AIAgentGrpcApi} from "../ai-re-act/hooks/grpcApi"

const {YakitPanel} = YakitCollapse

const MemoryBase: React.FC<MemoryBaseProps> = React.memo((props) => {
    return (
        <div className={styles["memory-base"]}>
            <MemoryQuery />
            <MemoryTable />
        </div>
    )
})

export default MemoryBase

const MemoryTable: React.FC<MemoryTableProps> = React.memo((props) => {
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [tagShow, setTagShow] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState()
    //     const [tableParams, tableData, tableTotal, pagination, _, __, debugVirtualTableEvent] = useVirtualTableHook<
    //     SearchKnowledgeBaseEntryRequest,
    //     KnowledgeBaseEntry,
    //     "KnowledgeBaseEntries",
    //     "ID"
    // >({
    //     tableBoxRef,
    //     tableRef,
    //     boxHeightRef,
    //     grpcFun: apiSearchKnowledgeBaseEntry,
    //     onFirst,
    //     // initResDataFun,
    //     defaultParams: {
    //         Filter: {
    //             KnowledgeBaseId: knowledgeBaseItems?.ID
    //         },
    //         Pagination: {
    //             ...genDefaultPagination(20)
    //         }
    //     },
    //     responseKey: {data: "KnowledgeBaseEntries", id: "ID"}
    // })
    const columns: ColumnsTypeProps[] = useCreation(() => {
        const columnsArr: ColumnsTypeProps[] = [
            {
                title: "序号",
                dataKey: "序号",
                width: 80,
                sorterProps: {
                    sorter: true,
                    sorterKey: "ID"
                }
            },
            {
                title: "ID",
                dataKey: "ID"
            },
            {
                title: "Tags",
                dataKey: "Tags",
                render: (value) => {
                    return value && value.length > 0 ? value?.map((it) => <YakitTag key={it}>{it}</YakitTag>) : "-"
                }
            },
            {
                title: "摘要",
                dataKey: "Summary",
                enableDrag: false
            },
            {
                title: "操作",
                dataKey: "HiddenIndex",
                width: 90,
                fixed: "right",
                render: (_) => (
                    <div>
                        <YakitButton icon={<OutlineTranslateIcon />} type='text2' colors='danger' />
                    </div>
                )
            }
        ]
        return columnsArr
    }, [])
    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        let sort = {...newSort}
        if (sort.order === "none") {
            sort.order = "desc"
            sort.orderBy = "id"
        }
    })

    const onSetCurrentRow = useMemoizedFn((val) => {
        setCurrentItem(val)
    })
    const onClose = useMemoizedFn(() => {})
    return (
        <div className={styles["memory-table-wrapper"]}>
            <div className={styles["memory-table"]}>
                <div className={styles["memory-table-heard"]}>
                    <div className={styles["memory-table-title"]}>
                        <span className={styles["title-text"]}>记忆库</span>
                        <TableTotalAndSelectNumber total={52} />
                        <YakitPopover visible={tagShow} onVisibleChange={setTagShow} content={<div>筛选内容</div>}>
                            <YakitTag
                                color='white'
                                closable
                                onClose={onClose}
                                className={classNames(styles["filter-tag"], {
                                    [styles["active-tag"]]: tagShow
                                })}
                            >
                                查询条件<span className={styles["select-number"]}>3</span>
                            </YakitTag>
                        </YakitPopover>
                    </div>
                    <div className={styles["memory-table-subTitle"]}>
                        编写一份关于如何优化电商平台用户体验的报告，涵盖界面设计、用户反馈和数据分析。
                    </div>
                </div>
                <TableVirtualResize
                    isRefresh={isRefresh}
                    titleHeight={32}
                    lineHighlight={false}
                    isShowTitle={false}
                    renderKey='ID'
                    data={[]}
                    pagination={{
                        total: 0,
                        limit: 10,
                        page: 1,
                        onChange: () => null
                    }}
                    columns={columns}
                    onSetCurrentRow={onSetCurrentRow}
                    enableDrag={true}
                    useUpAndDown
                    onChange={onTableChange}
                />
            </div>
            <div className={styles["memory-detail"]}>
                <div className={styles["memory-detail-header"]}>
                    <div>详情</div>
                    <YakitButton type='text2' icon={<OutlineXIcon />} />
                </div>
                <div className={styles["memory-detail-content"]}>
                    <AIMemoryContent
                        item={{
                            id: "",
                            created_at: "",
                            created_at_timestamp: 0,
                            content: "",
                            tags: [],
                            c_score: 0,
                            o_score: 0,
                            r_score: 0,
                            e_score: 0,
                            p_score: 0,
                            a_score: 0,
                            t_score: 0,
                            core_pact_vector: [],
                            potential_questions: []
                        }}
                    />
                    <div>fsdfdsfdsfdsf</div>
                </div>
            </div>
        </div>
    )
})
const ratingList = [
    {
        id: "1",
        keyName: "C",
        label: "C",
        max: 1.0,
        min: 0.0
    },
    {
        id: "2",
        keyName: "O",
        label: "O",
        max: 0.5,
        min: 0.0
    },
    {
        id: "3",
        keyName: "R",
        label: "R",
        max: 0.75,
        min: 0.25
    },
    {
        id: "4",
        keyName: "E",
        label: "E",
        max: 1.0,
        min: 0.0
    },
    {
        id: "5",
        keyName: "P",
        label: "P",
        max: 1.0,
        min: 0.5
    },
    {
        id: "6",
        keyName: "A",
        label: "A",
        max: 0.75,
        min: 0.25
    },
    {
        id: "7",
        keyName: "T",
        label: "T",
        max: 0.5,
        min: 0.0
    }
]
const tags = Array.from({length: 20}).map((_, index) => ({
    id: index + 1,
    name: `Tag ${index + 1}`,
    total: Math.floor(Math.random() * 100)
}))

const MemoryQuery: React.FC<MemoryQueryProps> = React.memo((props) => {
    const [show, setShow] = useState<boolean>(true)
    const [query, setQuery] = useControllableValue(props, {
        defaultValue: "",
        trigger: "setQuery",
        valuePropName: "query"
    })
    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !show
            })}
        >
            <div className={classNames(styles["memory-left-side"], {[styles["memory-left-side-hidden"]]: !show})}>
                <div className={styles["query"]}>
                    <div className={styles["query-header"]}>
                        <ChevronleftButton onClick={() => setShow(false)} /> 高级查询
                    </div>
                    <AITextarea />
                </div>
                <YakitCollapse defaultActiveKey={["ratingRange", "Tags"]} className={styles["memory-query-collapse"]}>
                    <YakitPanel
                        header={
                            <div className={styles["panel-header"]}>
                                <span>评分范围</span>
                                <OutlineQuestionmarkcircleIcon />
                            </div>
                        }
                        extra={
                            <YakitButton
                                type='text'
                                colors='danger'
                                className={styles["btn-padding-right-0"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                                size='small'
                            >
                                重置
                            </YakitButton>
                        }
                        key='ratingRange'
                    >
                        {ratingList.map((item) => (
                            <div key={item.id} className={styles["rating-item"]}>
                                <YakitCheckbox />
                                <span className={styles["item-label"]}>{item.label}</span>
                                <div className={styles["slider-wrapper"]}>
                                    <Slider
                                        className={styles["slider"]}
                                        step={0.01}
                                        range
                                        defaultValue={[item.min, item.max]}
                                        min={0}
                                        max={1}
                                    />
                                    <span className={styles["slider-value"]}>
                                        {numeral(item.min).format("0.00")}~{numeral(item.max).format("0.00")}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </YakitPanel>
                    <YakitPanel
                        header='Tags'
                        key='Tags'
                        extra={
                            <YakitButton
                                type='text'
                                colors='danger'
                                className={styles["btn-padding-right-0"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                                size='small'
                            >
                                重置
                            </YakitButton>
                        }
                    >
                        <div className={styles["tag-list"]}>
                            {tags.map((tagItem) => (
                                <div key={tagItem.id} className={styles["tag-item"]}>
                                    <div className={styles["tag-label-wrapper"]}>
                                        <YakitCheckbox />
                                        <span className={styles["tag-label"]}>{tagItem.name}</span>
                                    </div>
                                    <span className={styles["tag-total"]}>{tagItem.total}</span>
                                </div>
                            ))}
                        </div>
                    </YakitPanel>
                </YakitCollapse>
            </div>
            <div className={styles["open-wrapper"]} onClick={() => setShow(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>高级查询</div>
            </div>
        </div>
    )
})

const AITextarea: React.FC<AITextareaProps> = React.memo((props) => {
    const {textProps} = props
    return (
        <div className={styles["query-input-wrapper"]}>
            <div className={styles["query-input-content"]}>
                <div className={styles["query-input"]}>
                    <OutlineSparklesColorsIcon />
                    <QSInputTextarea
                        placeholder='请输入关注内容，Al 将帮你聚焦相关记忆...'
                        className={styles["query-input-text-area"]}
                        {...textProps}
                    />
                </div>
                <div className={styles["query-input-footer"]}>
                    <Divider type='vertical' />
                    <YakitButton
                        radius='50%'
                        icon={<OutlineArrowupIcon />}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    />
                </div>
            </div>
        </div>
    )
})
