import type React from 'react'
import { useMemo } from 'react'
import { Bar } from '@ant-design/charts'
import type { BarConfig } from '@ant-design/charts'
import type { GraphProps } from './base'

export const BarGraph: React.FC<GraphProps> = (g) => {
  const { data = [], color = [], height = 400, direction = true, width = 400 } = g

  const barData = useMemo(() => data.map((item) => ({ name: item.key, value: item.value })), [data])

  const config: BarConfig = {
    data: barData,
    xField: 'value',
    yField: 'name',
    seriesField: 'name',
    height,
    width,
    autoFit: false,
    padding: [30, 30, 30, 170],
    legend: false,
    transpose: direction,
    color: color.length === 0 ? undefined : color,
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.name,
        value: String(datum.value),
      }),
    },
    yAxis: {
      label: {
        offset: 12,
      },
    },
  }

  return (
    <div data-type="echarts-box" data-echart-type="vertical-bar" style={{ width, height }}>
      <Bar {...config} />
    </div>
  )
}
