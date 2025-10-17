import {useState, type FC} from "react"
import classNames from "classnames"

import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"

import styles from "../knowledgeBase.module.scss"
import GraphDemo from "./demo"
import {useRequest, useUpdateEffect} from "ahooks"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import {failed} from "@/utils/notification"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {v4 as uuidv4} from "uuid"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

interface TAddKnowledgenBaseDetailDrawerProps {
    knowledgeDetailModalData: {
        data: Record<string, any>
        visible: boolean
    }
    setKnowledgeDetailModalData: (value: {data: Record<any, any>; visible: boolean}) => void
}

const {ipcRenderer} = window.require("electron")

const knowledgeBaseOptions = [
    {
        value: "KnowledgeInformation",
        label: "知识信息"
    },
    {
        value: "EntityInformation",
        label: "实体信息"
    }
]

// 类型定义
export interface GraphNode {
    id: string // 节点 ID
    name: string // 节点显示名称
    symbolSize: number // 节点大小
    [key: string]: string | number | undefined // 允许额外属性
}

export interface GraphLink {
    source: string // 起点 ID
    target: string // 终点 ID
    label?: string // 可选：边的 label
}

export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

export const transform = (data) => {
    const {nodes, links} = data

    // 统计入度和出度
    const inDegree = {}
    const outDegree = {}

    links.forEach(({source, target}) => {
        outDegree[source] = (outDegree[source] || 0) + 1
        inDegree[target] = (inDegree[target] || 0) + 1
    })

    // 生成子节点映射表（用于层级计算）
    const childrenMap = {}
    links.forEach(({source, target}) => {
        if (!childrenMap[source]) childrenMap[source] = []
        childrenMap[source].push(target)
    })

    // 递归获取每个节点的层级
    const levelMemo = {}
    const getLevel = (id, visited = new Set()) => {
        if (levelMemo[id] !== undefined) return levelMemo[id]
        if (visited.has(id)) return 1
        visited.add(id)
        const children = childrenMap[id] || []
        if (!children.length) {
            levelMemo[id] = 1
            return 1
        }
        const childLevels = children
            .map((childId) => getLevel(childId, new Set(visited)))
            .filter((lvl) => typeof lvl === "number" && !isNaN(lvl))
        const level = 1 + (childLevels.length ? Math.max(...childLevels) : 0)
        levelMemo[id] = level
        return level
    }

    // 计算每个节点的 degree
    const degrees = nodes.map((node) => {
        const inCount = inDegree[node.id] || 0
        const outCount = outDegree[node.id] || 0
        return inCount + outCount
    })

    const minDegree = Math.min(...degrees)
    const maxDegree = Math.max(...degrees)

    const minSize = 50
    const maxSize = 100

    // 避免 log(0)
    const logMin = Math.log(minDegree + 1)
    const logMax = Math.log(maxDegree + 1)

    return nodes.map((node) => {
        const inCount = inDegree[node.id] || 0
        const outCount = outDegree[node.id] || 0
        const degree = inCount + outCount

        const logVal = Math.log(degree + 1)
        // ✅ 将 logVal 线性映射到 [minSize, maxSize]
        const normalized = logMax === logMin ? 0.5 : (logVal - logMin) / (logMax - logMin)
        const symbolSize = minSize + normalized * (maxSize - minSize)

        const level = getLevel(node.id)

        return {
            ...node,
            symbolSize,
            level
        }
    })
}

const KnowledgenBaseDetailDrawer: FC<TAddKnowledgenBaseDetailDrawerProps> = ({
    knowledgeDetailModalData,
    setKnowledgeDetailModalData
}) => {
    const onClose = () => {
        setKnowledgeDetailModalData({...knowledgeDetailModalData, visible: false})
        setDepth(2)
        setResultData({nodes: [], links: []})
    }

    const [depth, setDepth] = useState(2)
    const [resultData, setResultData] = useState<GraphData>()
    const [relatedEntityUUIDS, setRelatedEntityUUIDS] = useState("")
    const [informationType, setInformationType] = useState("KnowledgeInformation")

    const {runAsync, loading} = useRequest(
        async (HiddenIndex: string, Depth?: number) => {
            const response = await ipcRenderer.invoke("QuerySubERM", {
                Filter: {
                    HiddenIndex
                },
                Depth: Depth ?? 2
            })
            const targetNodes = response?.Entities?.map((it) => {
                return {
                    id: it?.HiddenIndex,
                    name: it?.Name
                }
            })

            const targetLinks = response?.Relationships?.map((it) => ({
                source: it?.SourceEntityIndex,
                target: it?.TargetEntityIndex,
                type: it?.Type
            }))

            const resultData =
                targetLinks.length > 0 && targetLinks.length > 0
                    ? {
                          nodes: targetNodes,
                          links: targetLinks
                      }
                    : {
                          nodes: [],
                          links: []
                      }

            setResultData({
                nodes: transform(resultData),
                links: resultData?.links
            })
            return "请求完成"
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体关系图失败: ${err}`),
            debounceWait: 1000,
            debounceLeading: true
        }
    )

    const {runAsync: QueryEntityRunAsync, data: QueryEntityData} = useRequest(
        async () => {
            const result = await ipcRenderer.invoke("QueryEntity", {
                Filter: {
                    HiddenIndex: knowledgeDetailModalData?.data?.RelatedEntityUUIDS?.split(",")
                },
                Pagination: {
                    Page: 1,
                    Limit: -1,
                    OrderBy: "id",
                    Order: "desc" as const
                }
            })
            return result?.Entities ?? []
        },
        {
            manual: true,
            onError: (err) => failed(`获取实体信息失败: ${err}`)
        }
    )

    useUpdateEffect(() => {
        const RelatedEntityUUIDS =
            knowledgeDetailModalData?.data?.RelatedEntityUUIDS?.length > 0
                ? knowledgeDetailModalData?.data?.RelatedEntityUUIDS?.split(",")
                : []
        setRelatedEntityUUIDS(RelatedEntityUUIDS)
        knowledgeDetailModalData.visible && RelatedEntityUUIDS.length > 0
            ? runAsync(RelatedEntityUUIDS)
            : setResultData({
                  nodes: [],
                  links: []
              })
    }, [knowledgeDetailModalData.visible])

    return (
        <YakitDrawer
            placement='right'
            width='80%'
            onClose={onClose}
            visible={knowledgeDetailModalData.visible}
            title={"知识详情"}
            maskClosable={true}
            destroyOnClose={true}
            className={classNames(styles["knowledgen-baseDetail-drawer"])}
        >
            <YakitSpin spinning={loading}>
                <div className={styles["knowledgen-base-grap"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>实体关系图</div>
                        <div className={styles["depth"]}>
                            <div>深度</div>{" "}
                            <YakitInputNumber
                                value={depth}
                                onChange={async (e) => {
                                    await runAsync(relatedEntityUUIDS, e as number)
                                    setDepth(e as number)
                                }}
                                min={1}
                            />
                        </div>
                    </div>
                    <div className={styles["knowledge-base-grap"]}>
                        {resultData?.links &&
                        resultData?.links.length > 0 &&
                        resultData?.nodes &&
                        resultData?.nodes.length > 0 ? (
                            <GraphDemo data={resultData} />
                        ) : (
                            <YakitEmpty title='暂无数据' />
                        )}
                    </div>
                </div>
            </YakitSpin>
            <div className={styles["drawer-detail"]}>
                <YakitRadioButtons
                    buttonStyle='solid'
                    options={knowledgeBaseOptions}
                    value={informationType}
                    onChange={(e) => {
                        setInformationType(e.target.value)
                        e.target.value === "EntityInformation" && QueryEntityRunAsync()
                    }}
                />
                {informationType === "KnowledgeInformation" ? (
                    <div className={styles["information-container"]}>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>标题：</div>
                            <div className={styles["value"]}>{knowledgeDetailModalData.data.KnowledgeTitle ?? "-"}</div>
                        </div>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>关键词：</div>
                            <div className={styles["value"]}>
                                {knowledgeDetailModalData.data.Keywords?.map((it) => (
                                    <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                        {it}
                                    </YakitTag>
                                ))}
                            </div>
                        </div>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>类型：</div>
                            <div className={styles["value"]}>
                                {knowledgeDetailModalData.data.KnowledgeTitlKnowledgeType ?? "-"}
                            </div>
                        </div>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>摘要：</div>
                            <div className={styles["value"]}>{knowledgeDetailModalData.data.Summary ?? "-"}</div>
                        </div>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>描述：</div>
                            <div className={styles["value"]}>
                                {knowledgeDetailModalData.data.KnowledgeDetails ?? "-"}
                            </div>
                        </div>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>潜在问题：</div>
                            <div className={styles["value"]}>
                                {knowledgeDetailModalData.data.PotentialQuestions?.map((it) => (
                                    <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                        {it}
                                    </YakitTag>
                                ))}
                            </div>
                        </div>
                        <div className={styles["boxs"]}>
                            <div className={styles["label"]}>潜在问题向量：</div>
                            <div className={styles["value"]}>
                                {knowledgeDetailModalData.data.PotentialQuestionsVector?.map((it) => (
                                    <YakitTag style={{marginRight: 4}} key={it + uuidv4()}>
                                        {it}
                                    </YakitTag>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : QueryEntityData?.length > 0 ? (
                    <div className={styles["information-container"]}>
                        {QueryEntityData?.map((item) => (
                            <div key={item.ID} className={styles["table-row"]}>
                                <div className={styles["boxs"]}>
                                    <div className={styles["label"]}>名称</div>
                                    <div className={styles["value"]}>{item.Name ?? "-"}</div>
                                </div>
                                <div className={styles["boxs"]}>
                                    <div className={styles["label"]}>类型</div>
                                    <div className={styles["value"]}>{item.Type ?? "-"}</div>
                                </div>

                                <div className={styles["boxs"]}>
                                    <div className={styles["label"]}>描述</div>
                                    <div className={styles["value"]}>{item.Description ?? "-"}</div>
                                </div>
                                <div className={styles["boxs"]}>
                                    <div className={styles["label"]}>属性</div>
                                    <div className={styles["value"]}>
                                        {item?.Attributes?.map((it) => it?.Value)?.join(",")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <YakitEmpty title='暂无数据' />
                )}
            </div>
        </YakitDrawer>
    )
}

export {KnowledgenBaseDetailDrawer}
