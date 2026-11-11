import React, { memo, useEffect, useMemo, useRef } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import type { EChartsOption } from 'echarts-for-react'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import useGetColorsByTheme from '@/hook/useGetColorsByTheme'
import type { MITMStoragePoint } from './MITMDiagnostics.types'
import { formatTraceClock } from './MITMDiagnostics.utils'
import { formatMITMPipelineRate } from './MITMPipelineStatus.utils'
import styles from './MITMDiagnosticsPanel.module.scss'

echarts.use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const configs = {
  traffic: {
    label: '请求收发速率',
    unit: '条/秒',
    counters: true,
    fields: [
      ['RequestTotal', '收到请求', '--Colors-Use-Blue-Primary'],
      ['DispatchTotal', '发往上游', '--Colors-Use-Purple-Primary'],
      ['UpstreamCompletedTotal', '上游完成', '--Colors-Use-Success-Primary'],
    ],
  },
  pending: {
    label: '本会话待写数量趋势',
    unit: '项',
    counters: false,
    fields: [
      ['PersistPending', '待写', '--Colors-Use-Blue-Primary'],
      ['PersistBlocked', '提交受阻', '--Colors-Use-Warning-Primary'],
    ],
  },
  writes: {
    label: '提交与写入速率',
    unit: '项/秒',
    counters: true,
    fields: [
      ['PersistEnqueuedTotal', '提交', '--Colors-Use-Blue-Primary'],
      ['PersistedTotal', '写入成功', '--Colors-Use-Success-Primary'],
      ['PersistFailedTotal', '写入失败', '--Colors-Use-Error-Primary'],
    ],
  },
} as const

const chartSize = { width: '100%', height: '100%' }
const chartOpts = { renderer: 'canvas' as const }

interface TrendProps {
  kind: keyof typeof configs
  points: MITMStoragePoint[]
  extended: boolean
}

export default memo(function MITMDiagnosticsTrend({ kind, points, extended }: TrendProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReactEChartsCore>(null)
  const colors = useGetColorsByTheme()
  const config = configs[kind]
  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    // Tabs can mount the chart before the panel has a usable size.
    const observer = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = plot
      if (!width || !height) return
      const chart = chartRef.current?.getEchartsInstance()
      if (chart && (chart.getWidth() !== width || chart.getHeight() !== height)) {
        chart.resize({ width, height })
      }
    })
    observer.observe(plot)
    return () => observer.disconnect()
  }, [])
  const option = useMemo<EChartsOption>(() => {
    const samples = points.filter((point) => Number(point.AtUnixMs) > 0)
    const end = Number(samples.at(-1)?.AtUnixMs) || 0
    const start = Math.min(Number(samples[0]?.AtUnixMs) || end, end - 15_000)
    const secondary = colors['--Colors-Use-Neutral-Text-3-Secondary']
    const border = colors['--Colors-Use-Neutral-Border']
    const fields: ReadonlyArray<readonly [keyof MITMStoragePoint, string, string]> =
      kind === 'pending' && !extended ? config.fields.slice(0, 1) : config.fields
    return {
      animation: false,
      textStyle: { fontFamily: 'inherit', fontSize: 11, color: secondary },
      grid: { top: 32, right: 18, bottom: 8, left: 12, containLabel: true },
      legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 4, textStyle: { color: secondary } },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: colors['--Colors-Use-Basic-Background'],
        borderColor: border,
        textStyle: { color: colors['--Colors-Use-Neutral-Text-2-Primary'], fontSize: 12 },
        valueFormatter: (value) =>
          typeof value === 'number' ? `${formatMITMPipelineRate(value)} ${config.unit}` : '–',
      },
      xAxis: {
        type: 'time',
        min: Math.max(start, end - 180_000),
        max: end,
        splitNumber: 4,
        minInterval: 3000,
        axisTick: { show: false },
        axisLabel: { color: secondary, hideOverlap: true, formatter: formatTraceClock },
        axisLine: { lineStyle: { color: border } },
        splitLine: { show: false },
        axisPointer: { label: { formatter: ({ value }) => formatTraceClock(Number(value)) } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        minInterval: config.counters ? 0.1 : 1,
        splitNumber: 4,
        axisLabel: { color: secondary, hideOverlap: true },
        splitLine: { lineStyle: { color: border, type: 'dashed' } },
      },
      series: fields.map(([field, name, color], seriesIndex) => ({
        type: 'line',
        name,
        color: colors[color],
        data: samples.flatMap((point, index): Array<[number, number | null]> => {
          const at = Number(point.AtUnixMs)
          const value = Number(point[field] ?? 0)
          const previous = samples[index - 1]
          if (!previous) return [[at, config.counters ? null : value]]
          const previousAt = Number(previous.AtUnixMs)
          const elapsed = (at - previousAt) / 1000
          const diff = value - Number(previous[field] ?? 0)
          if (elapsed > 10)
            return [
              [previousAt + 1, null],
              [at, config.counters ? null : value],
            ]
          return [[at, config.counters ? (elapsed > 0 && diff >= 0 ? diff / elapsed : null) : value]]
        }),
        showSymbol: samples.length <= 2,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: {
          width: 2,
          type: seriesIndex === fields.length - 1 && kind !== 'traffic' && seriesIndex > 0 ? 'dashed' : 'solid',
        },
        areaStyle: kind === 'pending' && seriesIndex === 0 ? { opacity: 0.1 } : undefined,
        emphasis: { focus: 'series' },
      })),
    }
  }, [colors, config, extended, kind, points])

  return (
    <div ref={plotRef} className={styles.plot} role="img" aria-label={config.label}>
      <ReactEChartsCore ref={chartRef} echarts={echarts} option={option} opts={chartOpts} style={chartSize} />
    </div>
  )
})
