/**
 * VarFlowGraph 可视化组件 - Graphviz 版本
 * 使用 Graphviz 自动布局，效果更好，支持完整的交互功能
 */

import React, {useEffect, useMemo, useRef, useState} from "react"
import {VarFlowGraph, VarFlowGraphNode, VarFlowGraphEdge, VarFlowGraphStep, EvidenceNode} from "./VarFlowGraphType"
import styles from "./VarFlowGraphViz.module.scss"
import {useMemoizedFn} from "ahooks"
import {Drawer, Empty, Spin, Tag, Collapse, Button, Tooltip, Modal} from "antd"
import {instance} from "@viz-js/viz"
import {
    fetchVariableValues,
    fetchValueDataFlowGraph
} from "./VarFlowGraphAPI"
import {YakURLResource} from "@/pages/yakURLTree/data"
import {failed} from "@/utils/notification"
import {
    OutlineRefreshIcon,
    OutlineSearchIcon,
    OutlineFilterIcon,
    OutlineCodeIcon
} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {getNameByPath} from "@/pages/yakRunner/utils"

const {Panel} = Collapse

export interface VarFlowGraphVizProps {
    varFlowGraph: VarFlowGraph | null
    programId: string
    resultId: string
    onValueClick?: (variable: string, index: number) => void
}

/**
 * 证据树节点渲染组件
 */
interface EvidenceTreeNodeProps {
    node: EvidenceNode
    level?: number
    onResultClick?: (valueId: string, valueStr?: string) => void
}

const EvidenceTreeNode: React.FC<EvidenceTreeNodeProps> = ({node, level = 0, onResultClick}) => {
    const [expanded, setExpanded] = useState(true)
    const [showAllResults, setShowAllResults] = useState(false)
    const hasChildren = node.children && node.children.length > 0

    const compareData = node.compare || node.compare_evidence
    const displayDesc = node.desc_zh || node.description || node.desc || ""

    const passedCount = node.results?.filter((r) => r.passed).length || 0
    const failedCount = node.results?.filter((r) => !r.passed).length || 0

    return (
        <div className={styles["evidence-node"]} style={{paddingLeft: `${level * 16}px`}}>
            <div className={styles["evidence-header"]}>
                {(hasChildren || node.results || compareData) && (
                    <span className={styles["expand-icon"]} onClick={() => setExpanded(!expanded)}>
                        {expanded ? "▼" : "▶"}
                    </span>
                )}
                <Tag
                    style={{
                        backgroundColor:
                            node.type === "LogicGate"
                                ? "#E3F2FD"
                                : node.type === "FilterCondition"
                                ? "#FFF3E0"
                                : node.type === "StringCondition"
                                ? "#E8F5E9"
                                : node.type === "OpcodeCondition"
                                ? "#F3E5F5"
                                : "#F5F5F5",
                        color:
                            node.type === "LogicGate"
                                ? "#1565C0"
                                : node.type === "FilterCondition"
                                ? "#E65100"
                                : node.type === "StringCondition"
                                ? "#2E7D32"
                                : node.type === "OpcodeCondition"
                                ? "#7B1FA2"
                                : "#666",
                        border: "none",
                        fontWeight: 600
                    }}
                >
                    {node.type}
                </Tag>
                {node.logic_op && <Tag color='blue'>{node.logic_op}</Tag>}
                {displayDesc && <span className={styles["description"]}>{displayDesc}</span>}
                {node.results && (
                    <span className={styles["result-summary"]}>
                        <Tag color='success'>{passedCount} 通过</Tag>
                        <Tag color='error'>{failedCount} 未通过</Tag>
                    </span>
                )}
            </div>

            {expanded && (
                <>
                    {compareData && (
                        <div className={styles["compare-evidence"]}>
                            <div className={styles["evidence-title"]}>📋 过滤条件</div>
                            <div className={styles["evidence-content"]}>
                                {compareData.operator && (
                                    <div>
                                        <strong>操作符:</strong> {compareData.operator}
                                    </div>
                                )}
                                <div>
                                    <strong>匹配模式:</strong> {compareData.mode || "unknown"}
                                </div>
                                {compareData.values && compareData.values.length > 0 && (
                                    <div>
                                        <strong>匹配值:</strong>{" "}
                                        {compareData.values.map((v, i) => (
                                            <Tag key={i} color='blue'>
                                                {v}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                                {compareData.glob && (
                                    <div>
                                        <strong>Glob:</strong> <code>{compareData.glob}</code>
                                    </div>
                                )}
                                {compareData.regexp && (
                                    <div>
                                        <strong>正则:</strong> <code>{compareData.regexp}</code>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {node.results && node.results.length > 0 && (
                        <div className={styles["results-container"]}>
                            {passedCount > 0 && (
                                <div className={styles["results-group"]}>
                                    <div className={styles["group-title"]}>✅ 通过 ({passedCount})</div>
                                    {node.results
                                        .filter((r) => r.passed)
                                        .slice(0, showAllResults ? undefined : 5)
                                        .map((result, idx) => {
                                            const displayValue = result.value_str || result.value_id
                                            const intermValue =
                                                result.interm_str || result.interm_id || result.interm_value_id
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={styles["result-item"]}
                                                    onClick={() => onResultClick?.(result.value_id, result.value_str)}
                                                    style={{cursor: onResultClick ? "pointer" : "default"}}
                                                >
                                                    <Tag color='success'>✓</Tag>
                                                    <span className={styles["value-id"]}>{displayValue}</span>
                                                    {intermValue && (
                                                        <>
                                                            <span className={styles["interm-id"]}>→ {intermValue}</span>
                                                            <Tooltip title="点击查看数据流路径">
                                                                <Tag color="processing" style={{marginLeft: 8, cursor: "pointer"}}>
                                                                    🔗 查看路径
                                                                </Tag>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    {!showAllResults && passedCount > 5 && (
                                        <div className={styles["more-hint"]}>... 还有 {passedCount - 5} 个</div>
                                    )}
                                </div>
                            )}

                            {failedCount > 0 && (
                                <div className={styles["results-group"]}>
                                    <div className={styles["group-title"]}>❌ 未通过 ({failedCount})</div>
                                    {node.results
                                        .filter((r) => !r.passed)
                                        .slice(0, showAllResults ? undefined : 3)
                                        .map((result, idx) => {
                                            const displayValue = result.value_str || result.value_id
                                            return (
                                                <div key={idx} className={styles["result-item"]}>
                                                    <Tag color='error'>✗</Tag>
                                                    <span className={styles["value-id"]}>{displayValue}</span>
                                                </div>
                                            )
                                        })}
                                    {!showAllResults && failedCount > 3 && (
                                        <div className={styles["more-hint"]}>... 还有 {failedCount - 3} 个</div>
                                    )}
                                </div>
                            )}

                            {(passedCount > 5 || failedCount > 3) && (
                                <Button size='small' type='link' onClick={() => setShowAllResults(!showAllResults)}>
                                    {showAllResults ? "收起" : "查看全部"}
                                </Button>
                            )}
                        </div>
                    )}

                    {hasChildren && (
                        <div className={styles["children-container"]}>
                            {node.children!.map((child, idx) => (
                                <EvidenceTreeNode key={idx} node={child} level={level + 1} onResultClick={onResultClick} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/**
 * VarFlowGraph Graphviz 版本
 */
export const VarFlowGraphViz: React.FC<VarFlowGraphVizProps> = (props) => {
    const {varFlowGraph, programId, resultId, onValueClick} = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(false)
    const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null)

    // Drawer 状态
    const [valuesDrawerVisible, setValuesDrawerVisible] = useState(false)
    const [stepsDrawerVisible, setStepsDrawerVisible] = useState(false)
    const [stepDetailDrawerVisible, setStepDetailDrawerVisible] = useState(false)
    const [jsonModalVisible, setJsonModalVisible] = useState(false)

    const [selectedNode, setSelectedNode] = useState<VarFlowGraphNode | null>(null)
    const [selectedEdge, setSelectedEdge] = useState<VarFlowGraphEdge | null>(null)
    const [selectedStep, setSelectedStep] = useState<VarFlowGraphStep | null>(null)

    const [values, setValues] = useState<YakURLResource[]>([])
    const [edgeSteps, setEdgeSteps] = useState<YakURLResource[]>([])
    const [stepDetail, setStepDetail] = useState<VarFlowGraphStep | null>(null)

    const [valuesLoading, setValuesLoading] = useState(false)
    const [stepsLoading, setStepsLoading] = useState(false)
    const [stepDetailLoading, setStepDetailLoading] = useState(false)

    // 生成 Graphviz DOT 语言（包含步骤节点）
    const dotString = useMemo(() => {
        if (!varFlowGraph) return ""

        const {nodes, edges, steps} = varFlowGraph

        // DOT 语言转义函数 - 处理标签中的特殊字符（保留 \n 作为换行符）
        const escapeDotLabel = (str: string): string => {
            if (!str) return ""
            // 只转义双引号，不转义反斜杠（因为 \n 需要保持作为换行符）
            return str
                .replace(/"/g, '\\"')    // 转义双引号
                .replace(/\r/g, '')      // 移除回车符
        }

        const getNodeType = (node: VarFlowGraphNode): string => {
            if (node.node_type) return node.node_type
            if (node.value_ids && node.value_ids.length === 0) return "empty"
            const isEntry = edges.some((e) => e.from === 0 && e.to === node.id)
            if (isEntry) return "entry"
            const hasOutEdge = edges.some((e) => e.from === node.id)
            if (!hasOutEdge) return "result"
            return "middle"
        }

        // 根据风险等级获取告警节点颜色
        const getAlertColor = (severity: string) => {
            switch (severity) {
                case "critical":
                    return {fill: "#ffebee", border: "#b71c1c", penwidth: 4} // 深红色
                case "high":
                    return {fill: "#ffcdd2", border: "#d32f2f", penwidth: 3.5} // 红色
                case "warning":
                    return {fill: "#fff3e0", border: "#e65100", penwidth: 3.5} // 橙色
                case "low":
                    return {fill: "#fffde7", border: "#f9a825", penwidth: 3} // 黄色
                case "info":
                    return {fill: "#e8f5e9", border: "#2e7d32", penwidth: 3} // 绿色
                default:
                    return {fill: "#ffebee", border: "#d32f2f", penwidth: 3} // 默认红色
            }
        }

        const getNodeColor = (type: string, node?: VarFlowGraphNode) => {
            // 如果是告警节点，优先使用告警颜色
            if (node?.is_alert) {
                return getAlertColor(node.severity || "")
            }
            
            switch (type) {
                case "entry":
                    return {fill: "#E3F2FD", border: "#1976D2", penwidth: 2.5}
                case "result":
                    return {fill: "#FFEBEE", border: "#D32F2F", penwidth: 2.5}
                case "empty":
                    return {fill: "#F5F5F5", border: "#9E9E9E", penwidth: 2.5}
                default:
                    return {fill: "#FFF3E0", border: "#F57C00", penwidth: 2.5}
            }
        }

        const getStepColor = (stepType: string) => {
            switch (stepType) {
                case "Search":
                    return {fill: "#E3F2FD", border: "#1565C0", edgeColor: "#2196F3"}
                case "ConditionFilter":
                    return {fill: "#FFF3E0", border: "#E65100", edgeColor: "#FF9800"}
                case "DataFlow":
                    return {fill: "#E8F5E9", border: "#2E7D32", edgeColor: "#4CAF50"}
                case "Get":
                    return {fill: "#F3E5F5", border: "#7B1FA2", edgeColor: "#9C27B0"}
                case "Transform":
                    return {fill: "#F0F0F0", border: "#666666", edgeColor: "#666666"}
                case "NativeCall":
                    return {fill: "#f9f0ff", border: "#531dab", edgeColor: "#722ed1"}
                default:
                    return {fill: "#F5F5F5", border: "#666", edgeColor: "#666"}
            }
        }

        const getStepIcon = (stepType: string): string => {
            switch (stepType) {
                case "Search":
                    return "🔍"
                case "ConditionFilter":
                    return "🔶"
                case "DataFlow":
                    return "🔄"
                case "Get":
                    return "📦"
                case "Transform":
                    return "🛠️"
                case "NativeCall":
                    return "⚡"
                default:
                    return "•"
            }
        }

        const getEdgeStyle = (stepType: string): string => {
            return stepType === "DataFlow" ? "dashed" : "solid"
        }

        let dot = 'digraph VarFlowGraph {\n'
        dot += '  rankdir=TB;\n' // 从上到下
        dot += '  node [fontname="Microsoft YaHei", fontsize=12];\n'
        dot += '  edge [fontname="Microsoft YaHei", fontsize=11];\n'
        dot += '  nodesep=1.0;\n' // 节点间距（横向）
        dot += '  ranksep=1.2;\n' // 层级间距（纵向）
        dot += '\n'

        // 添加变量节点
        nodes.forEach((node) => {
            // 安全检查：如果 var_name 不存在，跳过该节点
            if (!node.var_name) {
                console.warn(`节点 ${node.id} 缺少 var_name 字段，跳过渲染`)
                return
            }
            
            const nodeType = getNodeType(node)
            const colors = getNodeColor(nodeType, node)
            const valueCount = node.value_count || node.value_ids?.length || 0
            // 添加 $ 符号，只在有值的时候显示数量
            const varName = node.var_name.startsWith("$") ? node.var_name : `$${node.var_name}`
            // 先转义 varName 中的特殊字符
            const escapedVarName = escapeDotLabel(varName)
            let label = valueCount > 0 ? `${escapedVarName}\\n(${valueCount})` : escapedVarName
            
            // 如果是告警节点，添加风险等级标识
            if (node.is_alert && node.severity) {
                const severityLabel: Record<string, string> = {
                    critical: "🔴 严重",
                    high: "🟠 高危",
                    warning: "🟡 中危",
                    low: "🟢 低危",
                    info: "ℹ️ 信息"
                }
                // 风险等级标签不需要转义（都是安全字符）
                label = `${severityLabel[node.severity] || "⚠️ 告警"}\\n${label}`
            }
            
            dot += `  node_${node.id} [label="${label}", shape=box, style="rounded,filled", fillcolor="${colors.fill}", color="${colors.border}", penwidth=${colors.penwidth}, id="node_${node.id}", class="var-node${node.is_alert ? " alert-node" : ""}"];\n`
        })

        dot += '\n'

        // 添加边（多步骤显示为多条箭头）
        edges.forEach((edge) => {
            // 安全检查：确保 step_ids 存在且是数组
            const stepIds = edge.step_ids || []
            const edgeSteps = stepIds.map((sid) => steps.find((s) => s.id === sid)).filter(Boolean)

            if (edge.from === 0) {
                // 从入口开始
                dot += `  entry [label="入口", shape=ellipse, style=filled, fillcolor="#E3F2FD", color="#1976D2", penwidth=2];\n`
            }

            const fromId = edge.from === 0 ? "entry" : `node_${edge.from}`
            const toId = `node_${edge.to}`

            // 步骤类型中文映射（包含详细信息）
            const getStepTypeCN = (type: string, step?: any): string => {
                switch (type) {
                    case "Search":
                        // 显示搜索内容
                        const searchMode = step?.search_mode
                        if (searchMode) {
                            if (searchMode.glob_pattern) {
                                return `搜索【${searchMode.glob_pattern}】`
                            } else if (searchMode.regexp) {
                                return `搜索【${searchMode.regexp}】`
                            }
                        }
                        return "搜索"
                    case "ConditionFilter":
                        // 显示过滤条件简要信息
                        const evidenceTree = step?.evidence_tree
                        if (evidenceTree?.desc_zh) {
                            // 截取前20个字符
                            const desc = evidenceTree.desc_zh.length > 20 
                                ? evidenceTree.desc_zh.substring(0, 20) + "..." 
                                : evidenceTree.desc_zh
                            return `过滤【${desc}】`
                        }
                        return "过滤"
                    case "DataFlow":
                        // 显示数据流方向
                        const dfMode = step?.dataflow_mode
                        if (dfMode) {
                            const direction = dfMode.top ? "⬆️向上" : "⬇️向下"
                            return `数据流${direction}`
                        }
                        return "数据流分析"
                    case "Transform":
                        // 优先显示中文描述
                        if (step?.desc_zh) {
                            // 截取前30个字符，避免标签过长
                            const desc = step.desc_zh.length > 30 
                                ? step.desc_zh.substring(0, 30) + "..." 
                                : step.desc_zh
                            return desc
                        }
                        return "转换"
                    case "NativeCall":
                        // NativeCall 显示为 <name(params)> 格式
                        const ncMode = step?.nativecall_mode
                        if (ncMode?.name) {
                            // 如果有参数，拼接参数
                            if (ncMode.params && ncMode.params.length > 0) {
                                // 格式化参数：如果只有一个参数且key为空或为默认值，只显示value
                                const paramsStr = ncMode.params.map(p => {
                                    if (!p.key || p.key === 'value' || p.key === 'param') {
                                        return `'${p.value}'`
                                    }
                                    return `${p.key}='${p.value}'`
                                }).join(', ')
                                return `<${ncMode.name}(${paramsStr})>`
                            }
                            return `<${ncMode.name}>`
                        }
                        return "调用"
                    default:
                        return type
                }
            }

            if (edgeSteps.length === 0) {
                // 没有步骤，直接连接
                dot += `  ${fromId} -> ${toId} [penwidth=2.5, color="#999", id="edge_${edge.id}", class="flow-edge"];\n`
            } else if (edgeSteps.length === 1) {
                // 只有一个步骤，单条边
                const step = edgeSteps[0]!
                const icon = getStepIcon(step.type)
                const typeCN = getStepTypeCN(step.type, step)
                const colors = getStepColor(step.type)
                const style = getEdgeStyle(step.type)
                
                // 图标是安全的，只需转义 typeCN
                const escapedTypeCN = escapeDotLabel(typeCN)
                
                dot += `  ${fromId} -> ${toId} [`
                dot += `label="${icon} ${escapedTypeCN}", `
                dot += `penwidth=2.5, `
                dot += `color="${colors.edgeColor}", `
                dot += `style=${style}, `
                dot += `fontsize=11, `
                dot += `fontcolor="${colors.edgeColor}", `
                dot += `id="edge_${edge.id}", `
                dot += `class="flow-edge" `
                dot += `];\n`
            } else {
                // 多个步骤，创建中间虚拟节点，显示为多条箭头
                edgeSteps.forEach((step, idx) => {
                    if (!step) return
                    
                    const icon = getStepIcon(step.type)
                    const typeCN = getStepTypeCN(step.type, step)
                    const colors = getStepColor(step.type)
                    const style = getEdgeStyle(step.type)
                    
                    // 确定起点和终点
                    let currentFrom: string
                    let currentTo: string
                    
                    if (idx === 0) {
                        // 第一个步骤：从原始起点到第一个虚拟节点
                        currentFrom = fromId
                        currentTo = `virtual_${edge.id}_${idx}`
                    } else if (idx === edgeSteps.length - 1) {
                        // 最后一个步骤：从上一个虚拟节点到最终终点
                        currentFrom = `virtual_${edge.id}_${idx - 1}`
                        currentTo = toId
                    } else {
                        // 中间步骤：从上一个虚拟节点到下一个虚拟节点
                        currentFrom = `virtual_${edge.id}_${idx - 1}`
                        currentTo = `virtual_${edge.id}_${idx}`
                    }
                    
                    // 如果不是最后一个步骤，创建虚拟节点（不可见的点）
                    if (idx < edgeSteps.length - 1) {
                        dot += `  ${currentTo} [label="", shape=point, width=0.01, height=0.01, style=invis];\n`
                    }
                    
                    // 图标是安全的，只需转义 typeCN
                    const escapedTypeCN = escapeDotLabel(typeCN)
                    
                    // 创建边
                    dot += `  ${currentFrom} -> ${currentTo} [`
                    dot += `label="${icon} ${escapedTypeCN}", `
                    dot += `penwidth=2.5, `
                    dot += `color="${colors.edgeColor}", `
                    dot += `style=${style}, `
                    dot += `fontsize=11, `
                    dot += `fontcolor="${colors.edgeColor}", `
                    dot += `id="edge_${edge.id}_${idx}", `
                    dot += `class="flow-edge" `
                    dot += `];\n`
                })
            }
        })

        dot += '}\n'
        return dot
    }, [varFlowGraph])

    // 使用 Graphviz 渲染
    useEffect(() => {
        if (!dotString || !containerRef.current) return

        setLoading(true)

        const render = async () => {
            try {
                const viz = await instance()
                const svg = viz.renderSVGElement(dotString)

                // 添加交互
                addInteractivity(svg)

                if (containerRef.current) {
                    containerRef.current.innerHTML = ""
                    containerRef.current.appendChild(svg)
                    setSvgElement(svg)
                }
            } catch (err) {
                console.error("Graphviz 渲染失败:", err)
                failed(`图形渲染失败: ${err}`)
            } finally {
                setLoading(false)
            }
        }

        render()
    }, [dotString])

    // 添加交互功能
    const addInteractivity = useMemoizedFn((svg: SVGSVGElement) => {
        if (!varFlowGraph) return

        const {nodes, edges, steps} = varFlowGraph

        // 为变量节点添加点击事件
        nodes.forEach((node) => {
            const nodeElements = svg.querySelectorAll(`[id="node_${node.id}"]`)
            nodeElements.forEach((nodeElement) => {
                nodeElement.setAttribute("cursor", "pointer")
                nodeElement.addEventListener("click", (e) => {
                    e.stopPropagation()
                    handleNodeClick(node)
                })
                // 悬停效果 - 找到包含此节点的 g 元素（group）
                nodeElement.addEventListener("mouseenter", () => {
                    // 找到最近的 g.node 元素
                    let targetGroup = nodeElement.closest("g.node") as SVGGElement | null
                    if (!targetGroup) {
                        // 如果没有 g.node，找到最近的 g 元素
                        targetGroup = nodeElement.closest("g") as SVGGElement | null
                    }
                    if (targetGroup && targetGroup.tagName === "g") {
                        targetGroup.style.filter = "drop-shadow(0 4px 12px rgba(0,0,0,0.25)) brightness(1.05)"
                        targetGroup.style.transition = "filter 0.2s ease"
                        // 保存引用以便清除
                        nodeElement.setAttribute("data-hover-group", "true")
                    }
                })
                nodeElement.addEventListener("mouseleave", () => {
                    let targetGroup = nodeElement.closest("g.node") as SVGGElement | null
                    if (!targetGroup) {
                        targetGroup = nodeElement.closest("g") as SVGGElement | null
                    }
                    if (targetGroup && targetGroup.tagName === "g") {
                        targetGroup.style.filter = ""
                        nodeElement.removeAttribute("data-hover-group")
                    }
                })
            })
        })

        // 步骤现在是边上的标签，不再需要单独处理

        // 为所有边添加悬停效果和点击事件
        const allEdges = svg.querySelectorAll(".flow-edge, [class*='edge_']")
        allEdges.forEach((edgeElement) => {
            edgeElement.setAttribute("cursor", "pointer")
            
            // 悬停效果
            edgeElement.addEventListener("mouseenter", () => {
                const pathElement = edgeElement.querySelector("path")
                if (pathElement) {
                    const currentWidth = pathElement.getAttribute("stroke-width") || "2"
                    pathElement.setAttribute("data-original-width", currentWidth)
                    pathElement.setAttribute("stroke-width", (parseFloat(currentWidth) * 1.8).toString())
                    pathElement.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    pathElement.style.transition = "all 0.2s ease"
                }
                // 高亮箭头
                const polygonElement = edgeElement.querySelector("polygon")
                if (polygonElement) {
                    polygonElement.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    polygonElement.style.transition = "all 0.2s ease"
                }
                // 高亮标签
                const textElement = edgeElement.querySelector("text")
                if (textElement) {
                    textElement.style.fontWeight = "bold"
                    textElement.style.transition = "all 0.2s ease"
                }
            })
            edgeElement.addEventListener("mouseleave", () => {
                const pathElement = edgeElement.querySelector("path")
                if (pathElement) {
                    const originalWidth = pathElement.getAttribute("data-original-width") || "2"
                    pathElement.setAttribute("stroke-width", originalWidth)
                    pathElement.style.filter = ""
                }
                const polygonElement = edgeElement.querySelector("polygon")
                if (polygonElement) {
                    polygonElement.style.filter = ""
                }
                const textElement = edgeElement.querySelector("text")
                if (textElement) {
                    textElement.style.fontWeight = "normal"
                }
            })
        })

        // 为边添加点击事件
        edges.forEach((edge) => {
            // 安全检查：确保 step_ids 存在且是数组
            const stepIds = edge.step_ids || []
            const edgeSteps = stepIds.map((sid) => steps.find((s) => s.id === sid)).filter(Boolean)

            if (edgeSteps.length === 0 || edgeSteps.length === 1) {
                // 没有步骤或只有一个步骤，点击整条边
                const edgeElements = svg.querySelectorAll(`[id^="edge_${edge.id}"]`)
                edgeElements.forEach((edgeElement) => {
                    edgeElement.addEventListener("click", (e) => {
                        e.stopPropagation()
                        if (edgeSteps.length === 1 && edgeSteps[0]) {
                            // 单步骤：直接显示步骤证据
                            handleStepClick(edgeSteps[0].id)
                        } else {
                            // 无步骤：显示边的步骤列表
                            handleEdgeClick(edge)
                        }
                    })
                })
            } else {
                // 多个步骤，每条边对应一个步骤
                edgeSteps.forEach((step, idx) => {
                    if (!step) return
                    const edgeElement = svg.querySelector(`[id="edge_${edge.id}_${idx}"]`)
                    if (edgeElement) {
                        edgeElement.addEventListener("click", (e) => {
                            e.stopPropagation()
                            // 直接显示该步骤的证据
                            handleStepClick(step.id)
                        })
                    }
                })
            }
        })
    })

    // 点击节点
    const handleNodeClick = useMemoizedFn((node: VarFlowGraphNode) => {
        setSelectedNode(node)
        setValuesDrawerVisible(true)
        loadVariableValues(node)
    })

    // 点击边
    const handleEdgeClick = useMemoizedFn((edge: VarFlowGraphEdge) => {
        if (!varFlowGraph) return
        setSelectedEdge(edge)
        setStepsDrawerVisible(true)
        // 不再需要 loadEdgeSteps - 直接从 varFlowGraph.steps 中读取
    })

    // 点击步骤 - 直接从 varFlowGraph.steps 中查找
    const handleStepClick = useMemoizedFn((stepId: number) => {
        if (!varFlowGraph) return
        
        setStepDetailLoading(true)
        setStepDetailDrawerVisible(true)
        
        try {
            // 直接从主图数据中查找步骤详情（包含完整的证据树）
            const step = varFlowGraph.steps.find((s) => s.id === stepId)
            if (step) {
                setStepDetail(step)
            } else {
                failed(`未找到步骤 ID: ${stepId}`)
            }
        } catch (err) {
            failed(`加载步骤详情失败: ${err}`)
        } finally {
            setStepDetailLoading(false)
        }
    })

    // 点击证据树中的结果，查看数据流图
    const handleEvidenceResultClick = useMemoizedFn(async (valueId: string, valueStr?: string) => {
        if (!selectedEdge || !varFlowGraph) return
        
        // 获取目标节点（边的 to 节点）
        const targetNode = varFlowGraph.nodes.find(n => n.id === selectedEdge.to)
        if (!targetNode) {
            failed("无法找到目标变量")
            return
        }
        
        const varName = targetNode.var_name
        
        try {
            // 获取变量的值列表，查找匹配的 value_id 获取其 index
            const response = await fetchVariableValues(programId, resultId, varName, 1, 1000)
            if (response && response.Resources) {
                // 在值列表中找到匹配的 value_id
                for (const resource of response.Resources) {
                    const indexExtra = resource.Extra.find(e => e.Key === "index")
                    const valueIdExtra = resource.Extra.find(e => e.Key === "value_id")
                    
                    // 检查 value_id 或 ResourceName 是否匹配
                    if (valueIdExtra?.Value === valueId || resource.ResourceName === valueStr) {
                        if (indexExtra && onValueClick) {
                            const index = parseInt(indexExtra.Value)
                            onValueClick(varName, index)
                            return
                        }
                    }
                }
                
                // 如果没找到匹配的，尝试使用索引 0
                if (onValueClick && response.Resources.length > 0) {
                    const firstIndex = response.Resources[0].Extra.find(e => e.Key === "index")
                    if (firstIndex) {
                        onValueClick(varName, parseInt(firstIndex.Value))
                    }
                }
            }
        } catch (err) {
            failed(`加载数据流图失败: ${err}`)
        }
    })

    // 加载变量值
    const loadVariableValues = useMemoizedFn(async (node: VarFlowGraphNode) => {
        setValuesLoading(true)
        try {
            const response = await fetchVariableValues(programId, resultId, node.var_name, 1, 50)
            if (response) {
                setValues(response.Resources || [])
            }
        } catch (err) {
            failed(`加载变量值失败: ${err}`)
        } finally {
            setValuesLoading(false)
        }
    })

    // ⚠️ 已移除 loadEdgeSteps - 不再需要额外 API 请求
    // 边的步骤现在直接从 varFlowGraph.steps 中读取

    // 获取步骤图标
    const getStepIcon = (type: string) => {
        switch (type) {
            case "Search":
                return <OutlineSearchIcon />
            case "DataFlow":
                return <OutlineRefreshIcon />
            case "ConditionFilter":
                return <OutlineFilterIcon />
            case "Get":
                return <OutlineCodeIcon />
            default:
                return null
        }
    }

    if (!varFlowGraph || !varFlowGraph.nodes || varFlowGraph.nodes.length === 0) {
        return (
            <div className={styles["empty-container"]}>
                <Empty description='暂无变量流图数据' />
            </div>
        )
    }

    return (
        <div className={styles["viz-container"]}>
            <Spin spinning={loading} tip='渲染图形中...'>
                <div ref={containerRef} className={styles["graph-container"]} />
            </Spin>

            {/* 变量值 Drawer */}
            <Drawer
                title={`变量: ${selectedNode?.var_name} (${values.length} 个值)`}
                placement='right'
                visible={valuesDrawerVisible}
                onClose={() => setValuesDrawerVisible(false)}
                width={700}
            >
                <Spin spinning={valuesLoading}>
                    <div className={styles["values-list"]}>
                        {values.map((value, idx) => {
                            const indexExtra = value.Extra.find((e) => e.Key === "index")
                            const codeRangeExtra = value.Extra.find((e) => e.Key === "code_range")
                            const sourceExtra = value.Extra.find((e) => e.Key === "source")

                            let codeRange: any = null
                            let fileName = ""
                            try {
                                if (codeRangeExtra) {
                                    codeRange = JSON.parse(codeRangeExtra.Value)
                                    const lastSlashIndex = codeRange.url?.lastIndexOf("/") ?? -1
                                    fileName = lastSlashIndex >= 0 ? codeRange.url.substring(lastSlashIndex + 1) : codeRange.url
                                }
                            } catch (e) {}

                            // 点击跳转到代码
                            const handleJumpToCode = async () => {
                                if (!codeRange?.url) return
                                try {
                                    const name = await getNameByPath(codeRange.url)
                                    const highLightRange = {
                                        startLineNumber: codeRange.start_line,
                                        startColumn: codeRange.start_column,
                                        endLineNumber: codeRange.end_line,
                                        endColumn: codeRange.end_column
                                    }
                                    // 定位文件树
                                    emiter.emit("onCodeAuditScrollToFileTree", codeRange.url)
                                    // 打开文件
                                    emiter.emit("onCodeAuditOpenFileByPath", JSON.stringify({
                                        params: {
                                            path: codeRange.url,
                                            name,
                                            highLightRange
                                        }
                                    }))
                                    // 跳转行号
                                    setTimeout(() => {
                                        emiter.emit("onCodeAuditJumpEditorDetail", JSON.stringify({
                                            selections: highLightRange,
                                            path: codeRange.url,
                                            isSelect: false
                                        }))
                                    }, 100)
                                } catch (error) {}
                            }

                            return (
                                <div 
                                    key={idx} 
                                    className={styles["value-card"]}
                                    onClick={handleJumpToCode}
                                    style={{cursor: codeRange?.url ? "pointer" : "default"}}
                                >
                                    <div className={styles["value-header"]}>
                                        <Tag color='blue'>#{indexExtra?.Value || idx}</Tag>
                                        <span className={styles["value-name"]}>{value.ResourceName}</span>
                                    </div>
                                    {codeRange && (
                                        <Tooltip placement='topLeft' title={codeRange.url}>
                                            <div className={styles["value-location"]}>
                                                📄 {fileName}:{codeRange.start_line}
                                            </div>
                                        </Tooltip>
                                    )}
                                    {sourceExtra && (
                                        <div className={styles["value-source"]}>
                                            <code>{sourceExtra.Value}</code>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </Spin>
            </Drawer>

            {/* 边步骤 Drawer */}
            <Drawer
                title={
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span>分析步骤</span>
                        <Button 
                            size='small' 
                            onClick={() => setJsonModalVisible(true)}
                            style={{marginRight: 40}}
                        >
                            📋 查看原始数据
                        </Button>
                    </div>
                }
                placement='right'
                visible={stepsDrawerVisible}
                onClose={() => setStepsDrawerVisible(false)}
                width={700}
            >
                <div className={styles["steps-list"]}>
                    {selectedEdge && varFlowGraph && (selectedEdge.step_ids || []).map((stepId, idx) => {
                        // 直接从 varFlowGraph.steps 中查找步骤
                        const step = varFlowGraph.steps.find((s) => s.id === stepId)
                        if (!step) return null

                        const stepType = step.type
                        const hasEvidence = !!step.evidence_tree

                        // 获取中文描述（优先使用 desc_zh）
                        const displayDesc = step.desc_zh || step.desc

                            // 获取步骤类型的中文名和图标
                            const getStepTypeInfo = (type: string) => {
                                switch (type) {
                                    case "Search":
                                        return {name: "搜索", icon: "🔍", color: "blue"}
                                    case "ConditionFilter":
                                        return {name: "过滤", icon: "🔶", color: "orange"}
                                    case "DataFlow":
                                        return {name: "数据流分析", icon: "🔄", color: "green"}
                                    case "Get":
                                        return {name: "获取", icon: "📦", color: "purple"}
                                    case "NativeCall":
                                        return {name: "调用", icon: "⚡", color: "#722ed1"}
                                    default:
                                        return {name: type, icon: "•", color: "default"}
                                }
                            }

                            const stepInfo = getStepTypeInfo(stepType)

                            // Search Step 特殊渲染
                            const renderSearchDetails = () => {
                                if (stepType !== "Search" || !step.search_mode) return null

                                const searchMode = step.search_mode
                                const matchModeMap = {
                                    name: "仅按名称匹配",
                                    key: "仅按键值匹配",
                                    "name+key": "同时按名称和键值匹配"
                                }

                                return (
                                    <div className={styles["search-details"]}>
                                        <div className={styles["detail-row"]}>
                                            <span className={styles["label"]}>匹配方式:</span>
                                            <span>
                                                {matchModeMap[searchMode.match_mode as keyof typeof matchModeMap] ||
                                                    searchMode.match_mode}
                                            </span>
                                        </div>
                                        {searchMode.glob_pattern && (
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>Glob 模式:</span>
                                                <code className={styles["code-highlight"]}>{searchMode.glob_pattern}</code>
                                            </div>
                                        )}
                                        {searchMode.regexp && (
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>正则表达式:</span>
                                                <code className={styles["code-highlight"]}>{searchMode.regexp}</code>
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            // DataFlow Step 特殊渲染
                            const renderDataFlowDetails = () => {
                                if (stepType !== "DataFlow" || !step.dataflow_mode) return null

                                const dataflowMode = step.dataflow_mode
                                const isTopDef = dataflowMode.top

                                return (
                                    <div className={styles["dataflow-details"]}>
                                        {/* 方向和深度 */}
                                        <div className={styles["config-section"]}>
                                            <div className={styles["section-title"]}>📊 基本配置</div>
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>方向:</span>
                                                <Tag
                                                    icon={isTopDef ? "⬆️" : "⬇️"}
                                                    color={isTopDef ? "#1890ff" : "#52c41a"}
                                                >
                                                    {isTopDef ? "自底向上 (TopDef - 追溯定义来源)" : "自顶向下 (BottomUse - 追踪使用去向)"}
                                                </Tag>
                                            </div>
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>深度:</span>
                                                <Tag color='#13c2c2'>{dataflowMode.include_depth}</Tag>
                                            </div>
                                        </div>

                                        {/* 包含规则 */}
                                        {dataflowMode.include && dataflowMode.include.length > 0 && (
                                            <div className={styles["config-section"]}>
                                                <div className={styles["section-title"]}>✅ 包含规则 (include)</div>
                                                <div className={styles["rule-list"]}>
                                                    {dataflowMode.include.map((v, i) => (
                                                        <Tag key={i} color='#52c41a'>
                                                            {v}
                                                        </Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 排除规则 */}
                                        {dataflowMode.exclude && dataflowMode.exclude.length > 0 && (
                                            <div className={styles["config-section"]}>
                                                <div className={styles["section-title"]}>❌ 排除规则 (exclude)</div>
                                                <div className={styles["rule-list"]}>
                                                    {dataflowMode.exclude.map((v, i) => (
                                                        <Tag key={i} color='#ff4d4f'>
                                                            {v}
                                                        </Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 终止条件 */}
                                        {dataflowMode.search_until && dataflowMode.search_until.length > 0 && (
                                            <div className={styles["config-section"]}>
                                                <div className={styles["section-title"]}>🛑 终止条件 (until)</div>
                                                <div className={styles["rule-list"]}>
                                                    {dataflowMode.search_until.map((v, i) => (
                                                        <Tag key={i} color='#fa8c16'>
                                                            {v}
                                                        </Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 已移除：不再显示 value_ids，因为新格式中不包含此字段 */}
                                    </div>
                                )
                            }

                            // NativeCall Step 特殊渲染
                            const renderNativeCallDetails = () => {
                                if (stepType !== "NativeCall" || !step.nativecall_mode) return null

                                const ncMode = step.nativecall_mode

                                return (
                                    <div className={styles["nativecall-details"]}>
                                        <div className={styles["detail-row"]}>
                                            <span className={styles["label"]}>调用名称:</span>
                                            <Tag color='#722ed1' style={{fontFamily: "monospace"}}>
                                                &lt;{ncMode.name}&gt;
                                            </Tag>
                                        </div>
                                        {ncMode.desc_zh && (
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>功能描述:</span>
                                                <span>{ncMode.desc_zh}</span>
                                            </div>
                                        )}
                                        {ncMode.params && ncMode.params.length > 0 && (
                                            <div className={styles["config-section"]}>
                                                <div className={styles["section-title"]}>📋 参数列表</div>
                                                <div className={styles["params-list"]}>
                                                    {ncMode.params.map((param: any, i: number) => (
                                                        <div key={i} className={styles["param-item"]}>
                                                            <Tag color='#531dab'>{param.key}</Tag>
                                                            <code className={styles["code-highlight"]}>{param.value}</code>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            }

                            return (
                                <div key={idx} className={styles["step-card"]}>
                                    <div className={styles["step-header"]}>
                                        <span style={{fontSize: "20px", marginRight: "8px"}}>{stepInfo.icon}</span>
                                        <div className={styles["step-info"]}>
                                            {/* 标题区域 */}
                                            <div className={styles["step-name"]}>
                                                <Tag color={stepInfo.color}>{stepInfo.name}</Tag>
                                                <span style={{fontSize: "15px", fontWeight: 600}}>{displayDesc}</span>
                                            </div>

                                            {/* Search 步骤的详细信息 */}
                                            {renderSearchDetails()}

                                            {/* DataFlow 步骤的详细信息 */}
                                            {renderDataFlowDetails()}

                                            {/* NativeCall 步骤的详细信息 */}
                                            {renderNativeCallDetails()}

                                            {/* 其他类型步骤的通用显示 */}
                                            {stepType !== "Search" && stepType !== "DataFlow" && stepType !== "NativeCall" && (
                                                <div className={styles["step-description"]}>
                                                    {displayDesc}
                                                </div>
                                            )}
                                        </div>
                                        {hasEvidence && (
                                            <Button
                                                size='small'
                                                type='primary'
                                                onClick={() => handleStepClick(step.id)}
                                            >
                                                查看证据
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
            </Drawer>

            {/* 步骤详情 Drawer */}
            <Drawer
                title='步骤详情与证据树'
                placement='right'
                visible={stepDetailDrawerVisible}
                onClose={() => setStepDetailDrawerVisible(false)}
                width={800}
            >
                <Spin spinning={stepDetailLoading}>
                    {stepDetail && (
                        <div className={styles["step-detail-container"]}>
                            <div className={styles["step-info"]}>
                                <div className={styles["info-item"]}>
                                    <strong>类型:</strong>{" "}
                                    <Tag
                                        color={
                                            stepDetail.type === "Search"
                                                ? "blue"
                                                : stepDetail.type === "ConditionFilter"
                                                ? "orange"
                                                : stepDetail.type === "DataFlow"
                                                ? "green"
                                                : stepDetail.type === "NativeCall"
                                                ? "#722ed1"
                                                : "purple"
                                        }
                                    >
                                        {stepDetail.type === "Search"
                                            ? "搜索"
                                            : stepDetail.type === "ConditionFilter"
                                            ? "过滤"
                                            : stepDetail.type === "DataFlow"
                                            ? "数据流分析"
                                            : stepDetail.type === "Get"
                                            ? "获取"
                                            : stepDetail.type === "NativeCall"
                                            ? "调用"
                                            : stepDetail.type}
                                    </Tag>
                                </div>
                                <div className={styles["info-item"]}>
                                    <strong>描述:</strong>{" "}
                                    {stepDetail.desc_zh || stepDetail.desc || "无描述"}
                                </div>
                                {stepDetail.opcode_index && (
                                    <div className={styles["info-item"]}>
                                        <strong>操作码索引:</strong> <code>{stepDetail.opcode_index}</code>
                                    </div>
                                )}
                            </div>

                            {/* Search 步骤的详细配置 */}
                            {stepDetail.type === "Search" && stepDetail.search_mode && (
                                <div className={styles["step-config"]}>
                                    <h3>搜索配置</h3>
                                    <div className={styles["search-details"]}>
                                        <div className={styles["detail-row"]}>
                                            <span className={styles["label"]}>匹配方式:</span>
                                            <span>
                                                {stepDetail.search_mode.match_mode === "name"
                                                    ? "仅按名称匹配"
                                                    : stepDetail.search_mode.match_mode === "key"
                                                    ? "仅按键值匹配"
                                                    : stepDetail.search_mode.match_mode === "name+key"
                                                    ? "同时按名称和键值匹配"
                                                    : stepDetail.search_mode.match_mode}
                                            </span>
                                        </div>
                                        {stepDetail.search_mode.glob_pattern && (
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>Glob 模式:</span>
                                                <code className={styles["code-highlight"]}>
                                                    {stepDetail.search_mode.glob_pattern}
                                                </code>
                                            </div>
                                        )}
                                        {stepDetail.search_mode.regexp && (
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>正则表达式:</span>
                                                <code className={styles["code-highlight"]}>
                                                    {stepDetail.search_mode.regexp}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DataFlow 步骤的详细配置 */}
                            {stepDetail.type === "DataFlow" && (() => {
                                const dfMode = stepDetail.dataflow_mode
                                if (!dfMode) return null
                                
                                const isTopDef = dfMode.top
                                
                                return (
                                    <div className={styles["step-config"]}>
                                        <h3>数据流配置</h3>
                                        <div className={styles["dataflow-details"]}>
                                            {/* 基本配置 */}
                                            <div className={styles["config-section"]}>
                                                <div className={styles["section-title"]}>📊 基本配置</div>
                                                <div className={styles["detail-row"]}>
                                                    <span className={styles["label"]}>方向:</span>
                                                    <Tag color={isTopDef ? "#1890ff" : "#52c41a"}>
                                                        {isTopDef ? "⬆️ 自底向上 (TopDef - 追溯定义来源)" : "⬇️ 自顶向下 (BottomUse - 追踪使用去向)"}
                                                    </Tag>
                                                </div>
                                                <div className={styles["detail-row"]}>
                                                    <span className={styles["label"]}>深度:</span>
                                                    <Tag color='#13c2c2'>{dfMode.include_depth}</Tag>
                                                </div>
                                            </div>

                                            {/* 包含规则 */}
                                            {dfMode.include && dfMode.include.length > 0 && (
                                                <div className={styles["config-section"]}>
                                                    <div className={styles["section-title"]}>✅ 包含规则 (include)</div>
                                                    <div className={styles["rule-list"]}>
                                                        {dfMode.include.map((v, i) => (
                                                            <Tag key={i} color='#52c41a'>{v}</Tag>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 排除规则 */}
                                            {dfMode.exclude && dfMode.exclude.length > 0 && (
                                                <div className={styles["config-section"]}>
                                                    <div className={styles["section-title"]}>❌ 排除规则 (exclude)</div>
                                                    <div className={styles["rule-list"]}>
                                                        {dfMode.exclude.map((v, i) => (
                                                            <Tag key={i} color='#ff4d4f'>{v}</Tag>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 终止条件 */}
                                            {dfMode.search_until && dfMode.search_until.length > 0 && (
                                                <div className={styles["config-section"]}>
                                                    <div className={styles["section-title"]}>🛑 终止条件 (until)</div>
                                                    <div className={styles["rule-list"]}>
                                                        {dfMode.search_until.map((v, i) => (
                                                            <Tag key={i} color='#fa8c16'>{v}</Tag>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 分析结果 */}
                                            {(stepDetail as any).value_ids && (stepDetail as any).value_ids.length > 0 && (
                                                <div className={styles["config-section"]}>
                                                    <div className={styles["section-title"]}>📈 分析结果</div>
                                                    <div className={styles["detail-row"]}>
                                                        <span style={{fontWeight: 600, color: "#52c41a"}}>
                                                            {(stepDetail as any).value_ids.length} 条数据流路径
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* NativeCall 步骤的详细配置 */}
                            {stepDetail.type === "NativeCall" && (() => {
                                const ncMode = (stepDetail as any).nativecall_mode
                                if (!ncMode) return null

                                return (
                                    <div className={styles["step-config"]}>
                                        <h3>NativeCall 配置</h3>
                                        <div className={styles["nativecall-details"]}>
                                            <div className={styles["detail-row"]}>
                                                <span className={styles["label"]}>调用名称:</span>
                                                <Tag color='#722ed1' style={{fontFamily: "monospace", fontSize: "14px"}}>
                                                    ⚡ &lt;{ncMode.name}&gt;
                                                </Tag>
                                            </div>
                                            {ncMode.description && (
                                                <div className={styles["detail-row"]}>
                                                    <span className={styles["label"]}>功能描述:</span>
                                                    <span>{ncMode.description}</span>
                                                </div>
                                            )}
                                            {ncMode.params && ncMode.params.length > 0 && (
                                                <div className={styles["config-section"]}>
                                                    <div className={styles["section-title"]}>📋 参数列表</div>
                                                    <div className={styles["params-list"]}>
                                                        {ncMode.params.map((param: any, i: number) => (
                                                            <div key={i} className={styles["param-item"]}>
                                                                <Tag color='#531dab'>{param.key}</Tag>
                                                                <span style={{margin: "0 8px"}}>=</span>
                                                                <code className={styles["code-highlight"]}>{param.value}</code>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(stepDetail as any).value_ids && (stepDetail as any).value_ids.length > 0 && (
                                                <div className={styles["config-section"]}>
                                                    <div className={styles["section-title"]}>📈 执行结果</div>
                                                    <div className={styles["detail-row"]}>
                                                        <span style={{fontWeight: 600, color: "#722ed1"}}>
                                                            {(stepDetail as any).value_ids.length} 个值
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}

                            {stepDetail.evidence_tree && (
                                <div className={styles["evidence-tree"]}>
                                    <h3>过滤证据树</h3>
                                    <EvidenceTreeNode 
                                        node={stepDetail.evidence_tree} 
                                        onResultClick={handleEvidenceResultClick}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </Spin>
            </Drawer>

            {/* JSON 查看 Modal */}
            <Modal
                title="VarFlowGraph 原始数据"
                visible={jsonModalVisible}
                onCancel={() => setJsonModalVisible(false)}
                width={1000}
                footer={[
                    <Button key="copy" onClick={() => {
                        if (varFlowGraph) {
                            navigator.clipboard.writeText(JSON.stringify(varFlowGraph, null, 2))
                            // 可以添加一个成功提示
                        }
                    }}>
                        📋 复制 JSON
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setJsonModalVisible(false)}>
                        关闭
                    </Button>
                ]}
            >
                <div style={{
                    maxHeight: '70vh',
                    overflow: 'auto',
                    backgroundColor: '#f5f5f5',
                    padding: '16px',
                    borderRadius: '4px'
                }}>
                    <pre style={{
                        margin: 0,
                        fontSize: '12px',
                        lineHeight: '1.5',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                    }}>
                        {varFlowGraph ? JSON.stringify(varFlowGraph, null, 2) : 'No data'}
                    </pre>
                </div>
            </Modal>
        </div>
    )
}

