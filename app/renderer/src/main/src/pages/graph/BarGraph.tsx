import React from "react";
import {Axis, Chart, Coord, Geom, Tooltip} from "bizcharts";
import {GraphProps} from "./base";

export const BarGraph: React.FC<GraphProps> = (g) => {
    const barData = g.data;
    return <div>
        <Chart
            padding={{
                left: 170, top: 30, right: 30, bottom: 30,
            }}
            height={g.height || 400} width={g.width || 400}
            data={barData || []} forceFit
        >
            <Coord transpose/>
            <Axis
                name="key"
                label={{
                    offset: 12
                }}
            />
            <Axis name="value"/>
            <Tooltip/>
            <Geom type="interval" position="key*value"/>
        </Chart>
    </div>
};
