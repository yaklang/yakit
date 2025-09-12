import ReactECharts from "echarts-for-react"
import { Children } from "react"

const GraphDemo = () => {
    const nodes = [
        {id: "1", name: "yakit 技术文档", symbolSize: 60},
        {id: "2", name: "yak.scan-h", symbolSize: 50},
        {id: "3", name: "yak_scan_design", symbolSize: 30},
        {id: "4", name: "yak_pull", symbolSize: 30},
        {id: "5", name: "type", symbolSize: 20},
        {id: "6", name: "concurrent", symbolSize: 30},
        {id: "7", name: "poc-timeout", symbolSize: 30},
        {id: "8", name: "total-timeout", symbolSize: 30},
        {id: "9", name: "raw-packet-file", symbolSize: 20},
        {id: "10", name: "keyword", symbolSize: 20},
        {id: "11", name: "scan_configuration_components", symbolSize: 20},
        {id: "12", name: "list", symbolSize: 20},
        {id: "13", name: "plugin", symbolSize: 20},
        {id: "14", name: "proxy", symbolSize: 20},
        {id: "15", name: "concurrent_default", symbolSize: 20},
        {id: "16", name: "poc_timeout_default", symbolSize: 20},
        {id: "17", name: "total_timeout_default", symbolSize: 20}
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
