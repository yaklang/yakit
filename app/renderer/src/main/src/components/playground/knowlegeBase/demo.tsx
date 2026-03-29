import ReactECharts from "echarts-for-react"
import { Children } from "react"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const GraphDemo = () => {
    const {t} = useI18nNamespaces(["playground"])
    const nodes = [
        {id: "1", name: t("KnowledgeBaseGraphDemo.techDocs"), symbolSize: 60},
        {id: "2", name: t("KnowledgeBaseGraphDemo.scanH"), symbolSize: 50},
        {id: "3", name: t("KnowledgeBaseGraphDemo.scanDesign"), symbolSize: 30},
        {id: "4", name: t("KnowledgeBaseGraphDemo.yakPull"), symbolSize: 30},
        {id: "5", name: t("KnowledgeBaseGraphDemo.type"), symbolSize: 20},
        {id: "6", name: t("KnowledgeBaseGraphDemo.concurrent"), symbolSize: 30},
        {id: "7", name: t("KnowledgeBaseGraphDemo.pocTimeout"), symbolSize: 30},
        {id: "8", name: t("KnowledgeBaseGraphDemo.totalTimeout"), symbolSize: 30},
        {id: "9", name: t("KnowledgeBaseGraphDemo.rawPacketFile"), symbolSize: 20},
        {id: "10", name: t("KnowledgeBaseGraphDemo.keyword"), symbolSize: 20},
        {id: "11", name: t("KnowledgeBaseGraphDemo.scanConfigurationComponents"), symbolSize: 20},
        {id: "12", name: t("KnowledgeBaseGraphDemo.list"), symbolSize: 20},
        {id: "13", name: t("KnowledgeBaseGraphDemo.plugin"), symbolSize: 20},
        {id: "14", name: t("KnowledgeBaseGraphDemo.proxy"), symbolSize: 20},
        {id: "15", name: t("KnowledgeBaseGraphDemo.concurrentDefault"), symbolSize: 20},
        {id: "16", name: t("KnowledgeBaseGraphDemo.pocTimeoutDefault"), symbolSize: 20},
        {id: "17", name: t("KnowledgeBaseGraphDemo.totalTimeoutDefault"), symbolSize: 20}
    ]

    const links = [
        {source: "1", target: "2"},
        {source: "1", target: "3"},
        {source: "1", target: "4"},
        {source: "2", target: "5"},
        {source: "2", target: "6"},
        {source: "2", target: "7"},
        {source: "2", target: "8"},
        {source: "2", target: "9"},
        {source: "2", target: "10"},
        {source: "2", target: "11"},
        {source: "2", target: "12"},
        {source: "2", target: "13"},
        {source: "2", target: "14"},
        {source: "6", target: "15"},
        {source: "7", target: "16"},
        {source: "8", target: "17"}
    ]

    const option = {
        tooltip: null,
        
        series: [
            {
                type: "graph",
                layout: "force",
                roam: true,
                data: nodes.map((node) => ({
                    ...node,
                    label: {
                        show: true,
                        formatter: `{id|${node.id}}\n{name|${node.name}}`,
                        position: "inside", // 内部显示 id
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#fff",
                        rich: {
                            id: {fontSize: 14, fontWeight: "bold", color: "#fff", align: "center"},
                            name: {fontSize: 12, color: "#333", align: "center", padding: [0, 0, -20, 0]} // name 位置向下偏移显示在圆球旁
                        }
                    }
                })),
                links,
                edgeSymbol: ["circle", "arrow"],
                edgeSymbolSize: [4, 10],
                force: {repulsion: 400, edgeLength: 100, gravity: 0.1},
                lineStyle: {
                    color: "#aaa",
                    width: 2,
                    curveness: 0.1
                }
            }
        ]
    }

    return <ReactECharts option={option} style={{height: "600px", width: "100%"}} />
}

export default GraphDemo
