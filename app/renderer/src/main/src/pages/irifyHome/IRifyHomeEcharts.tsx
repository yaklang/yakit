import useGetColorsByTheme from '@/hook/useGetColorsByTheme'
import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import ReactECharts from 'echarts-for-react'
import { FieldName } from '../risks/RiskTable'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const RISK_DISTRIBUTION_COLOR_KEYS = [
  '--Colors-Use-Neutral-Border',
  '--yakit-colors-Main-30',
  '--yakit-colors-Main-40',
  '--yakit-colors-Main-70',
  '--yakit-colors-Main-90',
] as const

const getRiskDistributionColors = (colors: Record<string, string>) =>
  RISK_DISTRIBUTION_COLOR_KEYS.map((key) => colors[key] || colors['--Colors-Use-Main-Primary']).filter(Boolean)

const SEVERITY_ORDER: { severities: string[]; index: number }[] = [
  { severities: ['critical'], index: 0 },
  { severities: ['high'], index: 1 },
  { severities: ['medium', 'middle', 'warn'], index: 2 },
  { severities: ['low'], index: 3 },
  { severities: ['info'], index: 4 },
]

const RiskGaugeChart: React.FC<{ list: FieldName[] }> = ({ list }) => {
  const colors = useGetColorsByTheme()

  const option = useMemo<EChartsOption>(() => {
    const textColor = colors['--Colors-Use-Neutral-Text-1-Title']
    const newData = Array(SEVERITY_ORDER.length).fill(null)
    list.forEach((ele) => {
      const severity = ele.Name?.toLowerCase() ?? ''
      const match = SEVERITY_ORDER.find((item) => item.severities.includes(severity))
      if (match && ele.Total > 0) {
        const colorKey = RISK_DISTRIBUTION_COLOR_KEYS[SEVERITY_ORDER.length - 1 - match.index]
        newData[match.index] = {
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
  const { t } = useI18nNamespaces(['irifyHome'])
  const totalRiskLabel = t('IRifyHomeEcharts.totalRisk')
  // const { width } = useSize(document.querySelector('body')) || { width: 0, height: 0 }
  const option = useMemo<EChartsOption>(() => {
    const distributionColors = getRiskDistributionColors(colors)
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
          // 饼图  左右  上下  位置
          center: ['50%', '50%'],
          itemStyle: {
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
          avoidLabelOverlap: false,
          type: 'pie',
          label: {
            show: true,
            position: 'center',
            formatter: () => `{total|${total}}\n{label|${totalRiskLabel}}`,
            rich: {
              total: {
                fontSize: 24,
                fontWeight: 400,
                color: textColor,
                lineHeight: 32,
              },
              label: {
                fontSize: 12,
                color: subTextColor,
                lineHeight: 18,
              },
            },
          },
          labelLine: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
            label: {
              show: true,
            },
          },
          data: items.map((item, index) => {
            const color = distributionColors[index % distributionColors.length]
            return {
              name: String(index),
              value: item.value,
              itemStyle: {
                color,
              },
              emphasis: {
                itemStyle: {
                  color,
                },
              },
            }
          }),
        },
      ],
    }

    return option as EChartsOption
  }, [total, items, colors, totalRiskLabel])

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}

const RULE_HITS_LABEL_WIDTH = 88 //宽度80+间距8

const RuleHitsBarChart: React.FC<{ items: { name: string; value: number }[] }> = ({ items }) => {
  const colors = useGetColorsByTheme()

  const option = useMemo<EChartsOption>(() => {
    const barColors = getRiskDistributionColors(colors)
    const textColor = colors['--Colors-Use-Neutral-Text-1-Title']
    const subTextColor = colors['--Colors-Use-Neutral-Text-3-Secondary']
    const reversedItems = [...items].reverse()

    return {
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
          if (Array.isArray(params)) return ''
          return `${params.name} : ${params.value}`
        },
      },
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
          emphasis: {
            focus: 'none',
            itemStyle: {
              opacity: 1,
            },
          },
          blur: {
            itemStyle: {
              opacity: 1,
            },
          },
          data: reversedItems.map((item, index) => {
            const color = barColors[index % barColors.length]
            return {
              value: item.value,
              itemStyle: {
                color,
                borderRadius: [0, 4, 4, 0],
              },
              emphasis: {
                itemStyle: {
                  color,
                  opacity: 1,
                  borderRadius: [0, 4, 4, 0],
                },
              },
              blur: {
                itemStyle: {
                  color,
                  opacity: 1,
                  borderRadius: [0, 4, 4, 0],
                },
              },
              label: {
                show: true,
                position: 'right',
                color: textColor,
                fontSize: 12,
                formatter: '{c}',
              },
            }
          }),
          barWidth: 10,
          showBackground: false,
        },
      ],
    }
  }, [items, colors])

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}

export {
  getRiskDistributionColors,
  RISK_DISTRIBUTION_COLOR_KEYS,
  RiskGaugeChart,
  RiskDistributionChart,
  RuleHitsBarChart,
}
