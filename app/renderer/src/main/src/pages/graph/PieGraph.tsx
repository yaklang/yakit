import type React from 'react'
import { useMemo, useRef } from 'react'
import { Pie } from '@ant-design/charts'
import type { PieConfig } from '@ant-design/charts'
import type { GraphProps } from './base'

export interface PieGraphProps extends GraphProps {
  hideLabel?: boolean
  onClick?: (node: string) => any
}

export const PieGraph: React.FC<PieGraphProps> = (graph) => {
  const { data = [], height = 400, hideLabel, onClick, width = 400 } = graph
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  const total = useMemo(() => {
    const sum = data.reduce((acc, i) => acc + (Number(i.value) || 0), 0)
    return sum <= 0 ? 100 : sum
  }, [data])

  const pieData = useMemo(() => data.map((item) => ({ name: item.key, value: item.value })), [data])

  const config: PieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'name',
    color: ['red'],
    radius: 0.8,
    height,
    width,
    autoFit: false,
    legend: false,
    label: hideLabel
      ? false
      : {
          position: 'outside',
          offset: 8,
          formatter: (datum: any) => {
            return `${datum.name}: ${(((datum.value || 0) / total) * 100).toFixed(2)}%`
          },
        },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.name,
        value: String(datum.value),
      }),
    },
    onReady: (chart) => {
      chart.on('element:click', (event: any) => {
        const name = event?.data?.data?.name
        if (name) {
          onClickRef.current?.(name)
        }
      })
    },
  }

  return (
    <div data-type="echarts-box" data-echart-type="hollow-pie" style={{ width, height }}>
      <Pie {...config} />
    </div>
  )
}
