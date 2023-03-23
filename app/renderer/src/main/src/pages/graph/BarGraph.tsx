import React from "react";
import {Axis,Legend, Chart, Coord, Geom, Tooltip} from "bizcharts";
import {GraphProps} from "./base";

export const BarGraph: React.FC<GraphProps> = (g) => {
    const color = g.color||[]
    const barData = g.data;
    const direction:boolean = g.direction??true
    return <div>
        <Chart
            padding={{
                left: 170, top: 30, right: 30, bottom: 30,
            }}
            height={g.height || 400} width={g.width || 400}
            data={barData || []} forceFit
        >
            <Coord transpose={direction}/>
            <Axis
                name="key"
                label={{
                    offset: 12
                }}
            />
            <Legend position="right" />
            <Axis name="value"/>
            <Tooltip />
            <Geom type="interval" position="key*value" color={color.length === 0 ? undefined : ["name", color]}/>
        </Chart>
    </div>
};

