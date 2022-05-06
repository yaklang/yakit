import React from "react";
import {
    PieChart,
} from "bizcharts";
import {GraphProps} from "./base";

export interface PieGraphProps extends GraphProps {
    hideLabel?: boolean
    onClick?: (node: string) => any
}

export const PieGraph: React.FC<PieGraphProps> = (graph) => {
    let total = 0;
    graph.data.forEach((i) => {
        total += i.value
    })
    if (total <= 0) {
        total = 100
    }
    return <div>
        <PieChart
            events={{
                onPieClick: (event: any) => {
                    graph.onClick && graph.onClick(event.data.key)
                    // console.info(event)
                }
            }}
            height={graph.height || 400}
            width={graph.width || 400}
            angleField={"value"}
            colorField={"key"} forceFit={true}
            data={graph.data}
            radius={0.8}
            label={{
                visible: !graph.hideLabel, type: "outer", offset: 8, formatter: (_: any, node: any) => {
                    return `${node._origin.key}:${((node._origin.value / total) * 100).toFixed(2)}%`
                },
            }}
            legend={{visible: false}}
            // animation={true}
        />
    </div>
}
