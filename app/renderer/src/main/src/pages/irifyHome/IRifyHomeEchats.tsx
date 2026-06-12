import { useSize } from 'ahooks'
import useGetColorsByTheme from '@/hook/useGetColorsByTheme'
import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { FieldName } from '../risks/RiskTable'

const RISK_DISTRIBUTION_COLOR_KEYS = [
  '--Colors-Use-Neutral-Border',
  '--yakit-colors-Main-30',
  '--yakit-colors-Main-40',
  '--yakit-colors-Main-70',
  '--yakit-colors-Main-90',
] as const

const SEVERITY_KEYWORDS = ['严重', '高危', '中危', '低危', '信息'] as const

const RiskGaugeChart: React.FC<{ list: FieldName[] }> = ({ list }) => {
  const colors = useGetColorsByTheme()

  const option = useMemo<EChartsOption>(() => {
    const textColor = colors['--Colors-Use-Neutral-Text-1-Title']
    const newData = Array(SEVERITY_KEYWORDS.length).fill(null)
    list.forEach((ele) => {
      SEVERITY_KEYWORDS.forEach((keyword, index) => {
        if (ele.Verbose.includes(keyword) && ele.Total > 0) {
          const colorKey = RISK_DISTRIBUTION_COLOR_KEYS[SEVERITY_KEYWORDS.length - 1 - index]
          newData[index] = {
            name: ele.Verbose,
            key: ele.Name,
            value: ele.Total,
            itemStyle: {
              color: colors[colorKey],
            },
            label: {
              color: textColor,
            },
          }
        }
      })
    })

    return {
      series: [
        {
          type: 'pie',
          center: ['50%', '50%'],
          radius: [12, 60],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 4,
          },
          minAngle: 20,
          data: newData.filter((ele) => !!ele),
          percentPrecision: 0,
          label: {
            fontSize: 10,
            formatter: '{b}\n{d}%',
            lineHeight: 14,
            overflow: 'break',
          },
          emphasis: {
            scale: true,
            scaleSize: 3,
            itemStyle: {
              opacity: 0.9,
            },
          },
          labelLine: {
            length: 4,
            length2: 6,
          },
        },
      ],
    }
  }, [list, colors])

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}

const RiskDistributionChart: React.FC<{
  total: number
  items: { name: string; value: number; percent: number }[]
}> = ({ total, items }) => {
  const colors = useGetColorsByTheme()
  // const { width } = useSize(document.querySelector('body')) || { width: 0, height: 0 }
  const option = useMemo<EChartsOption>(() => {
    const distributionColors = [
      colors['--Colors-Use-Neutral-Border'],
      colors['--yakit-colors-Main-30'],
      colors['--yakit-colors-Main-40'],
      colors['--yakit-colors-Main-70'],
      colors['--yakit-colors-Main-90'],
    ]
    const textColor = colors['--Colors-Use-Neutral-Text-1-Title']
    const subTextColor = colors['--Colors-Use-Neutral-Text-4-Help-text']
    const bgHoverColor = colors['--Colors-Use-Neutral-Bg-Hover']

    let option = {
      color: distributionColors,
      tooltip: {
        trigger: 'item',
        confine: false,
        appendToBody: true,
        position: (point, _params, _dom, _rect, size) => {
          const x = point[0] + 10
          const y = point[1] - size.contentSize[1] / 2
          return [x, y]
        },
        formatter: (params) => {
          const index = Number(params.name)
          const item = items[index]
          if (!item) return ''
          return `${item.name} : ${item.value} (${item.percent}%)`
        },
      },
      series: [
        {
          // 空心饼图内外径
          radius: ['68%', '90%'],
          // 饼图上下左右位置
          center: ['45%', '50%'],
          itemStyle: {
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
          avoidLabelOverlap: false,
          type: 'pie',
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            scale: false, // ❗关闭外扩
          },
          data: items.map((item, index) => ({
            name: String(index),
            value: item.value,
          })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: '25%',
          top: '40%',
          style: {
            text: String(total),
            fill: textColor,
            fontSize: 24,
            fontWeight: 400,
            textAlign: 'center',
            width: 80,
          },
        },
        {
          type: 'text',
          left: '30%',
          top: '58%',
          style: {
            text: '总风险',
            fill: subTextColor,
            fontSize: 12,
            textAlign: 'center',
            width: 80,
          },
        },
      ],
    }
    // if (width <= 1080) {
    //   option.series[0].center = ['18%', '50%']
    //   option.graphic[0].left = '10%'
    //   option.graphic[1].left = '8%'
    // } else if (width > 1080 && width <= 1280) {
    //   option.series[0].center = ['20%', '50%']
    //   option.graphic[0].left = '10%'
    //   option.graphic[1].left = '8%'
    // } else if (width > 1280) {
    //   option.series[0].center = ['18%', '50%']
    //   option.graphic[0].left = '10%'
    //   option.graphic[1].left = '8%'
    // }

    return option as EChartsOption
  }, [total, items, colors])

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}

const RULE_HITS_LABEL_WIDTH = 88 //宽度80+间距8

const RuleHitsBarChart: React.FC<{ items: { name: string; value: number }[] }> = ({ items }) => {
  const colors = useGetColorsByTheme()

  const option = useMemo<EChartsOption>(() => {
    const barColors = RISK_DISTRIBUTION_COLOR_KEYS.map((key) => colors[key])
    const textColor = colors['--Colors-Use-Neutral-Text-1-Title']
    const subTextColor = colors['--Colors-Use-Neutral-Text-3-Secondary']
    const reversedItems = [...items].reverse()

    return {
      grid: {
        left: RULE_HITS_LABEL_WIDTH,
        right: 0,
        top: 0,
        bottom: 0,
        height: items.length * 32,
        containLabel: false,
      },
      xAxis: {
        type: 'value',
        show: false,
        max: Math.max(...items.map((item) => item.value)) * 1.2,
      },
      yAxis: {
        type: 'category',
        data: reversedItems.map((item) => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          width: RULE_HITS_LABEL_WIDTH,
          align: 'left',
          margin: RULE_HITS_LABEL_WIDTH,
          overflow: 'truncate',
          color: subTextColor,
          fontSize: 12,
        },
      },
      series: [
        {
          type: 'bar',
          data: reversedItems.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: barColors[index],
              borderRadius: [0, 4, 4, 0],
            },
            label: {
              show: true,
              position: 'right',
              color: textColor,
              fontSize: 12,
              formatter: '{c}',
            },
          })),
          barWidth: 10,
          showBackground: false,
        },
      ],
    }
  }, [items, colors])

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}

export { RISK_DISTRIBUTION_COLOR_KEYS, RiskGaugeChart, RiskDistributionChart, RuleHitsBarChart }
