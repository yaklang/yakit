/**
 * 分析步骤图组件
 * 用于展示 SyntaxFlow 分析过程的步骤和流程
 */

import React, {useMemo, useState} from "react"
import {
    VarFlowGraph,
    VarFlowGraphNode,
    VarFlowGraphEdge,
    VarFlowGraphStep,
    EvidenceNode,
    FilterResult
} from "./VarFlowGraphType"
import styles from "./AnalysisStepsGraph.module.scss"
import {Collapse, Empty, Tag, Tooltip, Button, Modal} from "antd"
import {
    OutlineChevrondownIcon,
    OutlineChevronrightIcon,
    OutlineSearchIcon,
    OutlineFilterIcon,
    OutlineRefreshIcon,
    OutlineCodeIcon
} from "@/assets/icon/outline"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"

const {Panel} = Collapse

export interface AnalysisStepsGraphProps {
    varFlowGraph: VarFlowGraph | null
}

/**
 * 步骤类型图标映射
 */
const StepTypeIcon: Record<string, React.ReactNode> = {
    Search: <OutlineSearchIcon />,
    DataFlow: <OutlineRefreshIcon />,
    ConditionFilter: <OutlineFilterIcon />,
    Get: <OutlineCodeIcon />
}

/**
 * 步骤类型颜色映射
 */
const StepTypeColor: Record<string, string> = {
    Search: "blue",
    DataFlow: "green",
    ConditionFilter: "orange",
    Get: "purple"
}

/**
 * 渲染过滤结果
 */
const FilterResultItem: React.FC<{result: FilterResult}> = ({result}) => {
    return (
        <div className={styles["filter-result-item"]}>
            <Tag color={result.passed ? "success" : "error"}>{result.passed ? "通过" : "未通过"}</Tag>
            <span className={styles["value-id"]}>{result.value_id}</span>
            {result.interm_value_id && (
                <span className={styles["interm-value-id"]}>(中间值: {result.interm_value_id})</span>
            )}
        </div>
    )
}

/**
 * 渲染证据树节点
 */
const EvidenceTreeNode: React.FC<{node: EvidenceNode; level?: number}> = ({node, level = 0}) => {
    const [expanded, setExpanded] = useState(true)

    const hasChildren = node.children && node.children.length > 0

    return (
        <div className={styles["evidence-tree-node"]} style={{paddingLeft: `${level * 20}px`}}>
            <div className={styles["node-header"]}>
                {hasChildren && (
                    <span className={styles["expand-icon"]} onClick={() => setExpanded(!expanded)}>
                        {expanded ? <OutlineChevrondownIcon /> : <OutlineChevronrightIcon />}
                    </span>
                )}
                <Tag color={node.type === "LogicGate" ? "blue" : "default"}>
                    {node.type}
                    {node.logic_op && ` - ${node.logic_op}`}
                </Tag>
                {node.description && <span className={styles["description"]}>{node.description}</span>}
            </div>

            {expanded && (
                <>
                    {/* 比较证据 */}
                    {node.compare_evidence && (
                        <div className={styles["compare-evidence"]}>
                            <div className={styles["evidence-label"]}>过滤条件:</div>
                            <div className={styles["evidence-content"]}>
                                {node.compare_evidence.operator && (
                                    <div>操作符: {node.compare_evidence.operator}</div>
                                )}
                                <div>匹配模式: {node.compare_evidence.mode || "unknown"}</div>
                                {node.compare_evidence.values && node.compare_evidence.values.length > 0 && (
                                    <div className={styles["conditions"]}>
                                        匹配值:
                                        {node.compare_evidence.values.map((value, idx) => (
                                            <Tag key={idx} className={styles["condition-tag"]}>
                                                {value}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                                {node.compare_evidence.glob && (
                                    <div>Glob: <code>{node.compare_evidence.glob}</code></div>
                                )}
                                {node.compare_evidence.regexp && (
                                    <div>正则: <code>{node.compare_evidence.regexp}</code></div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 过滤结果 */}
                    {node.results && node.results.length > 0 && (
                        <div className={styles["filter-results"]}>
                            <div className={styles["results-label"]}>过滤结果 ({node.results.length}):</div>
                            <div className={styles["results-list"]}>
                                {node.results.map((result, idx) => (
                                    <FilterResultItem key={idx} result={result} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 子节点 */}
                    {hasChildren &&
                        node.children!.map((child, idx) => (
                            <EvidenceTreeNode key={idx} node={child} level={level + 1} />
                        ))}
                </>
            )}
        </div>
    )
}

/**
 * 渲染单个步骤
 */
const StepItem: React.FC<{step: VarFlowGraphStep}> = ({step}) => {
    return (
        <div className={styles["step-item"]}>
            <div className={styles["step-header"]}>
                <div className={styles["step-icon"]}>{StepTypeIcon[step.type]}</div>
                <div className={styles["step-info"]}>
                    <div className={styles["step-title"]}>
                        <Tag color={StepTypeColor[step.type]}>{step.type}</Tag>
                        <span className={styles["step-id"]}>步骤 {step.id}</span>
                    </div>
                    <div className={styles["step-description"]}>{step.desc_zh || step.desc}</div>
                    {step.opcode_index && <div className={styles["step-opcode"]}>操作码索引: {step.opcode_index}</div>}
                </div>
            </div>

            {/* 搜索模式 */}
            {step.search_mode && (
                <div className={styles["step-detail"]}>
                    <div className={styles["detail-title"]}>搜索模式:</div>
                    <div className={styles["detail-content"]}>
                        <div>匹配模式: {step.search_mode.match_mode}</div>
                        {step.search_mode.glob_pattern && <div>Glob 模式: {step.search_mode.glob_pattern}</div>}
                        {step.search_mode.regexp && <div>正则表达式: {step.search_mode.regexp}</div>}
                    </div>
                </div>
            )}

            {/* 数据流模式 */}
            {step.dataflow_mode && (
                <div className={styles["step-detail"]}>
                    <div className={styles["detail-title"]}>数据流分析:</div>
                    <div className={styles["detail-content"]}>
                        <div>方向: {step.dataflow_mode.top ? "⬆️ 自底向上 (TopDef)" : "⬇️ 自顶向下 (BottomUse)"}</div>
                        <div>深度: {step.dataflow_mode.include_depth}</div>
                        {step.dataflow_mode.include && step.dataflow_mode.include.length > 0 && (
                            <div>
                                Include:{" "}
                                {step.dataflow_mode.include.map((value, idx) => (
                                    <Tag key={idx} color="green">{value}</Tag>
                                ))}
                            </div>
                        )}
                        {step.dataflow_mode.exclude && step.dataflow_mode.exclude.length > 0 && (
                            <div>
                                Exclude:{" "}
                                {step.dataflow_mode.exclude.map((value, idx) => (
                                    <Tag key={idx} color="red">{value}</Tag>
                                ))}
                            </div>
                        )}
                        {step.dataflow_mode.search_until && step.dataflow_mode.search_until.length > 0 && (
                            <div>
                                Until:{" "}
                                {step.dataflow_mode.search_until.map((value, idx) => (
                                    <Tag key={idx} color="orange">{value}</Tag>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 证据树 */}
            {step.evidence_tree && (
                <div className={styles["step-detail"]}>
                    <div className={styles["detail-title"]}>过滤证据:</div>
                    <div className={styles["detail-content"]}>
                        <EvidenceTreeNode node={step.evidence_tree} />
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * 简单的节点图展示
 */
const GraphVisualization: React.FC<{nodes: VarFlowGraphNode[]; edges: VarFlowGraphEdge[]}> = ({nodes, edges}) => {
    const nodeMap = useMemo(() => {
        const map = new Map<number, VarFlowGraphNode>()
        nodes.forEach((node) => map.set(node.id, node))
        return map
    }, [nodes])

    return (
        <div className={styles["graph-visualization"]}>
            <div className={styles["nodes-list"]}>
                {nodes.map((node) => (
                    <Tooltip key={node.id} title={`节点 ID: ${node.id}`}>
                        <div className={styles["node-item"]}>
                            <div className={styles["node-id"]}>{node.id}</div>
                            <div className={styles["node-name"]}>{node.var_name}</div>
                            {node.value_ids && node.value_ids.length > 0 && (
                                <div className={styles["node-values"]}>({node.value_ids.length} 个值)</div>
                            )}
                        </div>
                    </Tooltip>
                ))}
            </div>
            <div className={styles["edges-list"]}>
                <div className={styles["edges-title"]}>数据流向 ({edges.length} 条边):</div>
                {edges.map((edge) => {
                    const fromNode = edge.from === 0 ? "入口" : nodeMap.get(edge.from)?.var_name || `节点${edge.from}`
                    const toNode = nodeMap.get(edge.to)?.var_name || `节点${edge.to}`
                    return (
                        <div key={edge.id} className={styles["edge-item"]}>
                            <span className={styles["from-node"]}>{fromNode}</span>
                            <span className={styles["edge-arrow"]}>→</span>
                            <span className={styles["to-node"]}>{toNode}</span>
                            {edge.step_ids.length > 0 && (
                                <Tag className={styles["step-count"]}>步骤: {edge.step_ids.join(", ")}</Tag>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/**
 * 分析步骤图主组件
 */
export const AnalysisStepsGraph: React.FC<AnalysisStepsGraphProps> = ({varFlowGraph}) => {
    const [activeKey, setActiveKey] = useState<string[]>(["1"])
    const [jsonModalVisible, setJsonModalVisible] = useState(false)

    const handleCollapseChange = useMemoizedFn((keys: string | string[]) => {
        setActiveKey(Array.isArray(keys) ? keys : [keys])
    })

    if (!varFlowGraph) {
        return (
            <div className={styles["analysis-steps-graph"]}>
                <Empty description='暂无分析步骤数据' />
            </div>
        )
    }

    const {nodes, edges, steps} = varFlowGraph

    return (
        <div className={styles["analysis-steps-graph"]}>
            <div className={styles["graph-header"]}>
                <Button 
                    size='small' 
                    onClick={() => setJsonModalVisible(true)}
                >
                    📋 查看原始数据
                </Button>
            </div>
            <Collapse activeKey={activeKey} onChange={handleCollapseChange}>
                {/* 节点和边的可视化 */}
                <Panel
                    header={
                        <div className={styles["panel-header"]}>
                            <span>变量流图</span>
                            <span className={styles["count"]}>
                                {nodes.length} 个节点, {edges.length} 条边
                            </span>
                        </div>
                    }
                    key='1'
                >
                    <GraphVisualization nodes={nodes} edges={edges} />
                </Panel>

                {/* 分析步骤 */}
                <Panel
                    header={
                        <div className={styles["panel-header"]}>
                            <span>分析步骤</span>
                            <span className={styles["count"]}>{steps.length} 个步骤</span>
                        </div>
                    }
                    key='2'
                >
                    <div className={styles["steps-list"]}>
                        {steps.map((step) => (
                            <StepItem key={step.id} step={step} />
                        ))}
                    </div>
                </Panel>
            </Collapse>

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
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                    }}>
                        {varFlowGraph ? JSON.stringify(varFlowGraph, null, 2) : 'No data'}
                    </pre>
                </div>
            </Modal>
        </div>
    )
}

