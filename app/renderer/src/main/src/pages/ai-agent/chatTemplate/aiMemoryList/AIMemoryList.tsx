import React, {useEffect, useState} from "react"
import {AIMemoryEchartsProps, AIMemoryListProps, AIMemoryScoreEchartsProps} from "./type"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import {useCreation, useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import styles from "./AIMemoryList.module.scss"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import ReactECharts, {EChartsOption} from "echarts-for-react"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import classNames from "classnames"
import ReactResizeDetector from "react-resize-detector"

const getScoreList = (data: AIAgentGrpcApi.MemoryEntry) => {
    return [
        {
            label: "C",
            value: data.c_score
        },
        {
            label: "O",
            value: data.o_score
        },
        {
            label: "R",
            value: data.r_score
        },
        {
            label: "E",
            value: data.e_score
        },
        {
            label: "P",
            value: data.p_score
        },
        {
            label: "A",
            value: data.a_score
        },
        {
            label: "T",
            value: data.t_score
        }
    ]
}
const AIMemoryList: React.FC<AIMemoryListProps> = React.memo((props) => {
    const {chatIPCData} = useChatIPCStore()
    const [width, setWidth] = useState<number>()

    const list = useCreation(() => {
        return chatIPCData?.memoryList?.memories || []
    }, [chatIPCData?.memoryList?.memories])

    const echartsData: AIMemoryEchartsProps["data"] = useCreation(() => {
        const data = chatIPCData?.memoryList?.score_overview
        const xData: string[] = []
        const yData: number[] = []
        Object.entries(data || {}).forEach(([key, value]) => {
            xData.push(key.substring(0, 1))
            yData.push(value)
        })
        return {xData, yData}
    }, [chatIPCData?.memoryList?.score_overview])

    return (
        <div className={styles["ai-memory-list-wrapper"]}>
            <div className={styles["ai-memory-list-heard"]}>近期记忆({list.length})</div>
            <RollingLoadList<AIAgentGrpcApi.MemoryEntry>
                data={list}
                loadMoreData={() => {}}
                renderRow={(item, index) => (
                    <YakitPopover
                        placement='rightBottom'
                        key={item.id}
                        overlayClassName={styles["memory-popover-wrapper"]}
                        content={
                            <div className={styles["memory-popover-content"]}>
                                <div className={styles["memory-popover-score-wrapper"]}>
                                    <div className={styles["title"]}>C.O.R.E. P.A.C.T. Scores（归一化直方图）</div>
                                    <div className={styles["score-list"]}>
                                        {getScoreList(item).map((score, index) => (
                                            <div
                                                className={classNames(styles["score-item"], {
                                                    [styles["score-item-height-color"]]: score.value >= 0.7
                                                })}
                                                key={score.label}
                                            >
                                                <span>
                                                    {score.label}={score.value}
                                                </span>
                                                {index !== item.core_pact_vector.length - 1 && (
                                                    <div className={styles["divider"]} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <AIMemoryScoreEcharts
                                        data={{
                                            xData: [],
                                            yData: [
                                                item.c_score,
                                                item.o_score,
                                                item.r_score,
                                                item.e_score,
                                                item.p_score,
                                                item.a_score,
                                                item.t_score
                                            ]
                                        }}
                                        style={{width: "100%", height: 220}}
                                    />
                                </div>
                                <div className={styles["memory-popover-potential-questions"]}>
                                    {item.potential_questions.map((ele) => (
                                        <div className={styles["potential-questions-item"]} key={ele} title={ele}>
                                            <span>{ele}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        }
                    >
                        <div key={item.id} className={styles["memory-item"]}>
                            <div className={styles["memory-content"]}>{item.content}</div>
                            <div className={styles["memory-tags"]} title={item.tags.join(",")}>
                                {item.tags.map((tag) => (
                                    <YakitTag size='small' key={tag} fullRadius={true}>
                                        {tag}
                                    </YakitTag>
                                ))}
                            </div>
                        </div>
                    </YakitPopover>
                )}
                page={1}
                hasMore={false}
                loading={false}
                defItemHeight={88}
                classNameList={styles["ai-memory-list"]}
                classNameRow={styles["ai-memory-list-row"]}
                rowKey='id'
            />
            <div className={styles["ai-memory-list-footer"]}>
                <ReactResizeDetector
                    onResize={(w, h) => {
                        if (!w || !h) {
                            return
                        }
                        setWidth(w)
                    }}
                    handleWidth={true}
                    handleHeight={true}
                    refreshMode={"debounce"}
                    refreshRate={50}
                />
                <AIMemoryEcharts
                    data={echartsData}
                    className={styles["memory-footer-echarts"]}
                    style={{width: width || "100%", height: 40}}
                />
            </div>
        </div>
    )
})

export default AIMemoryList

const getScoreOption = (value: AIMemoryEchartsProps["data"]): EChartsOption => {
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 4, // 下边距
            left: 0 // 左边距
        },

        color: ["#f28c45"],
        radar: {
            radius: "70%",
            indicator: [
                {name: "C (关联度)", max: 1},
                {name: "O (来源可靠性)", max: 1},
                {name: "R (重要性)", max: 1},
                {name: "E (情感基调)", max: 1},
                {name: "P (个人偏好)", max: 1},
                {name: "A (经验价值)", max: 1},
                {name: "T (实效性)", max: 1}
            ],
            axisName: {
                color: "#5A5D64",
                fontSize: 11,
                width: 40,
                height: 16,
                overflow: "breakAll"
            },
            splitLine: {
                lineStyle: {
                    width: 1,
                    color: ["#C0C6D1", "#EEF0F3", "#EEF0F3", "#EEF0F3", "#EEF0F3", "#EEF0F3"].reverse()
                }
            },
            axisLine: {
                lineStyle: {
                    color: "#E6E8ED"
                }
            },
            splitArea: {
                show: false
            }
        },
        tooltip: {
            trigger: "axis"
        },
        series: [
            {
                tooltip: {
                    trigger: "item"
                },
                type: "radar",
                data: [
                    {
                        value: value.yData,
                        name: "C.O.R.E. P.A.C.T. Scores"
                    }
                ],
                lineStyle: {
                    width: 1
                },

                symbol: "circle",
                symbolSize: 5,
                areaStyle: {
                    opacity: 0.1
                },
                animation: false
            }
        ]
    }

    return option
}
const AIMemoryScoreEcharts: React.FC<AIMemoryScoreEchartsProps> = React.memo((props) => {
    const {data, ...rest} = props
    const [option, setOption] = useState<EChartsOption>(getScoreOption(data))
    useUpdateEffect(() => {
        onSetOption()
    }, [data])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getScoreOption(data)
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts {...rest} option={getScoreOption(data)} />
})
const getOption = (value: AIMemoryEchartsProps["data"]): EChartsOption => {
    const option: EChartsOption = {
        grid: {
            top: 4, // 上边距
            right: 0, // 右边距
            bottom: 20, // 下边距
            left: 0 // 左边距
        },
        tooltip: {
            trigger: "axis"
        },
        color: ["#F8ABAB", "#FBD391", "#93DFC6", "#A1C9FF", "#C4B1FB", "#EDAEEF", "#97DEE8"],
        colorBy: "data",
        xAxis: {
            show: true,
            type: "category",
            barMinHeight: 2,
            data: value.xData,
            axisLabel: {
                show: true,
                interval: 0,
                color: "#5A5D64"
            },
            axisTick: {
                show: false
            },
            axisLine: {
                show: false, // 确保显示
                lineStyle: {
                    color: "#C0C6D1",
                    width: 1 // 线宽
                }
            }
        },
        yAxis: {
            show: false,
            type: "value"
        },
        series: [
            {
                data: value.yData,
                type: "bar"
            }
        ]
    }
    return option
}
const AIMemoryEcharts: React.FC<AIMemoryEchartsProps> = React.memo((props) => {
    const {data, ...rest} = props
    const [option, setOption] = useState<EChartsOption>(getOption(data))
    useUpdateEffect(() => {
        onSetOption()
    }, [data])
    const onSetOption = useDebounceFn(
        () => {
            const newOption = getOption(data)
            setOption(newOption)
        },
        {wait: 500, leading: true}
    ).run
    return <ReactECharts {...rest} option={option} />
})
