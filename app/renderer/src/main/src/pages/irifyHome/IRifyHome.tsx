import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import {
  OutlineBookopenIcon,
  OutlineHomeIcon,
  OutlineArrowsmrightIcon,
  OutlineCheckIcon,
  OutlineChevronrightIcon,
  OutlineNotebookIcon,
  OutlineAIIcon,
} from '@/assets/icon/outline'
import useGetColorsByTheme from '@/hook/useGetColorsByTheme'
import { IRifyHomeProps, RiskSeverity } from './IRifyHomeType'
import { MOCK_HOME_DATA } from './IRifyHomeMockData'
import styles from './IRifyHome.module.scss'
import { PrivateOutlineAuditCodeIcon, PrivateOutlineCodeScanIcon } from '@/routes/privateIcon'
import { PublicAIAuditCodeIcon, PublicAuditCodeIcon, PublicCodeScanIcon } from '@/routes/publicIcon'
import {
  IRifyDivergencyIcon,
  IRifyHomeGhostIcon,
  IRifyHomeHighIcon,
  IRifyHomeLowIcon,
  IRifyHomeMediumIcon,
  IRifyHomeSeriousIcon,
} from './icon'
import { useSize } from 'ahooks'

const SEVERITY_TAG_COLOR: Record<RiskSeverity, 'serious' | 'danger' | 'warning' | 'yellow'> = {
  serious: 'serious',
  high: 'danger',
  medium: 'warning',
  low: 'yellow',
}

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  serious: '严重',
  high: '高危',
  medium: '中危',
  low: '低危',
}

const RISK_DISTRIBUTION_COLOR_KEYS = [
  '--Colors-Use-Neutral-Border',
  '--yakit-colors-Main-30',
  '--yakit-colors-Main-40',
  '--yakit-colors-Main-70',
  '--yakit-colors-Main-90',
] as const

const RISK_DISTRIBUTION_COLORS = RISK_DISTRIBUTION_COLOR_KEYS.map((key) => `var(${key})`)

const onOpenPage = (route: YakitRoute, params?: any) => {
  emiter.emit('openPage', JSON.stringify({ route, params: params ?? {} }))
}

const RiskGaugeChart: React.FC<{ value: number; level: string; levelLabel: string }> = ({
  value,
  level,
  levelLabel,
}) => {
  const colors = useGetColorsByTheme()

  const option = useMemo<EChartsOption>(() => {
    const green = colors['--Colors-Use-Status-Safe']
    const yellow = colors['--Colors-Use-Status-Low']
    const orange = colors['--Colors-Use-Status-Medium']
    const red = colors['--Colors-Use-Status-High']
    const textColor = colors['--Colors-Use-Neutral-Text-1-Title']
    const subTextColor = colors['--Colors-Use-Neutral-Text-3-Secondary']

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          radius: '100%',
          center: ['50%', '72%'],
          splitNumber: 4,
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.25, green],
                [0.5, yellow],
                [0.75, orange],
                [1, red],
              ],
            },
          },
          pointer: {
            icon: 'triangle',
            length: '55%',
            width: 8,
            itemStyle: {
              color: textColor,
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: subTextColor,
            fontSize: 11,
            distance: -36,
            formatter: (val: number) => {
              if (val === 0) return 'S'
              if (val === 25) return 'L'
              if (val === 50) return 'M'
              if (val === 75) return 'H'
              if (val === 100) return 'S'
              return ''
            },
          },
          detail: {
            show: false,
          },
          data: [{ value }],
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '58%',
          style: {
            text: level,
            fill: textColor,
            fontSize: 28,
            fontWeight: 600,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '72%',
          style: {
            text: levelLabel,
            fill: subTextColor,
            fontSize: 12,
          },
        },
      ],
    }
  }, [value, level, levelLabel, colors])

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
}

const RiskDistributionChart: React.FC<{
  total: number
  totalLabel: string
  items: { name: string; value: number; percent: number }[]
}> = ({ total, totalLabel, items }) => {
  const colors = useGetColorsByTheme()
  const { width } = useSize(document.querySelector('body')) || { width: 0, height: 0 }
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
          left: '20%',
          top: '58%',
          style: {
            text: totalLabel,
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
  }, [total, totalLabel, items, colors, width])

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

const IRifyHome: React.FC<IRifyHomeProps> = () => {
  const data = MOCK_HOME_DATA

  return (
    <div className={styles['irify-home']}>
      <div className={styles['irify-home-content']}>
        <div className={styles['hero-section']}>
          <div className={styles['page-header']}>
            <div className={styles['page-header-text']}>
              <div className={styles['page-title']}>代码审计工作台</div>
              <div className={styles['page-subtitle']}>
                区分 AI 联网审计与 SSA 离线规则审计，统一查看扫描成果与风险态势
              </div>
            </div>
            <div className={styles['header-stats']}>
              <div className={styles['header-stat-card']}>
                <div className={styles['header-stat-icon']}>
                  <OutlineHomeIcon />
                </div>
                <div className={styles['header-stat-info']}>
                  <div className={styles['header-stat-value']}>128</div>
                  <div className={styles['header-stat-label']}>项目</div>
                </div>
              </div>
              <div className={styles['header-stat-card']}>
                <div className={styles['header-stat-icon']}>
                  <OutlineNotebookIcon />
                </div>
                <div className={styles['header-stat-info']}>
                  <div className={styles['header-stat-value']}>2436</div>
                  <div className={styles['header-stat-label']}>规则库</div>
                </div>
              </div>
              <div className={styles['header-stat-card']}>
                <div className={styles['header-stat-icon']}>
                  <OutlineAIIcon />
                </div>
                <div className={styles['header-stat-info']}>
                  <div className={styles['header-stat-value']}>86</div>
                  <div className={styles['header-stat-label']}>AI 审计任务</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles['audit-mode-section']}>
            <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-primary`])}>
              <div className={styles['audit-mode-card-ghost']}>
                <IRifyHomeGhostIcon />
              </div>
              <div className={styles['audit-mode-card-divergency']}>
                <IRifyDivergencyIcon />
              </div>
              <div className={styles['audit-mode-card-header']}>
                <div className={styles['audit-mode-card-title-row']}>
                  <div className={styles['audit-mode-card-icon']}>
                    <PublicAIAuditCodeIcon />
                  </div>
                  <span className={styles['audit-mode-card-title']}>AI 代码审计</span>

                  <span className={classNames(styles['audit-mode-badge'], styles['audit-mode-badge-online'])}>
                    联网
                  </span>
                </div>
                <div className={styles['audit-mode-card-subtitle']}>适合：复杂业务 / 需要解释 / 需要辅助研判</div>
              </div>

              <div className={styles['audit-mode-features']}>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>面向复杂业务逻辑、跨文件关联、自然语言分析与风险解释</span>
                </div>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>支持联网知识增强、场景理解、问题归因、修复建议</span>
                </div>
              </div>

              <div className={styles['audit-mode-tags']}>
                <span className={styles['audit-mode-tag']}>业务逻辑</span>
                <span className={styles['audit-mode-tag']}>上下文理解</span>
                <span className={styles['audit-mode-tag']}>风险解释</span>
                <span className={styles['audit-mode-tag']}>修复建议</span>
              </div>
              <div className={styles['audit-mode-button']} onClick={() => onOpenPage(YakitRoute.Irify_AI_Code_Audit)}>
                开始 AI 审计
                <OutlineArrowsmrightIcon />
              </div>
            </div>
            <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-secondary`])}>
              <div className={styles['audit-mode-card-header']}>
                <div className={styles['audit-mode-card-title-row']}>
                  <div className={styles['audit-mode-card-icon']}>
                    <PublicAuditCodeIcon />
                  </div>
                  <span className={styles['audit-mode-card-title']}>传统代码审计</span>

                  <span className={classNames(styles['audit-mode-badge'], styles['audit-mode-badge-offline'])}>
                    离线
                  </span>
                </div>
              </div>

              <div className={styles['audit-mode-features']}>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>通过编写审计规则对代码行为进行分析，发现代码中的风险片段</span>
                </div>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>Java、PHP、Yaklang、Golang</span>
                </div>
              </div>

              <div className={styles['audit-mode-button']} onClick={() => onOpenPage(YakitRoute.YakRunner_Audit_Code)}>
                开始审计
                <OutlineArrowsmrightIcon />
              </div>
            </div>
            <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-secondary`])}>
              <div className={styles['audit-mode-card-header']}>
                <div className={styles['audit-mode-card-title-row']}>
                  <div className={styles['audit-mode-card-icon']}>
                    <PublicCodeScanIcon />
                  </div>
                  <span className={styles['audit-mode-card-title']}>代码扫描</span>
                </div>
              </div>

              <div className={styles['audit-mode-features']}>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>内置丰富规则库</span>
                </div>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>可自由选择规则分组进行代码扫描</span>
                </div>
                <div className={styles['audit-mode-feature-item']}>
                  <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                  <span>帮助分析代码结构和发现代码中的风险片段</span>
                </div>
              </div>

              <div className={styles['audit-mode-button']} onClick={() => onOpenPage(YakitRoute.YakRunner_Code_Scan)}>
                开始扫描
                <OutlineArrowsmrightIcon />
              </div>
            </div>
          </div>
        </div>
        <div className={styles['main-chart']}>
          <div className={classNames(styles['panel-card'])}>
            <div className={styles['panel-card-title']}>风险概览</div>
            <div className={styles['risk-overview']}>
              <div className={styles['risk-gauge']}>
                <RiskGaugeChart value={50} level={'中危'} levelLabel={'危险等级'} />
              </div>
              <div className={styles['risk-stats-grid']}>
                <div className={styles['risk-stats-grid-item']}>
                  <div className={classNames(styles['risk-stat-item'], styles[`risk-stat-item-serious`])}>
                    <div className={styles['risk-stat-content']}>
                      <div className={styles['risk-stat-bar']}>
                        <IRifyHomeSeriousIcon />
                      </div>
                      <div className={styles['risk-stat-label']}>
                        <div className={styles['risk-stat-label-title']}>严重(1.0%)</div>
                        <div className={styles['risk-stat-label-sub-title']}>Serious</div>
                      </div>
                    </div>
                    <div className={styles['risk-stat-count']}>3</div>
                  </div>
                  <div className={styles['risk-stats-grid-line']} />
                  <div className={classNames(styles['risk-stat-item'], styles[`risk-stat-item-high`])}>
                    <div className={styles['risk-stat-content']}>
                      <div className={styles['risk-stat-bar']}>
                        <IRifyHomeHighIcon />
                      </div>
                      <div className={styles['risk-stat-label']}>
                        <div className={styles['risk-stat-label-title']}>高危(1.0%)</div>
                        <div className={styles['risk-stat-label-sub-title']}>High</div>
                      </div>
                    </div>
                    <div className={styles['risk-stat-count']}>3</div>
                  </div>
                </div>
                <div className={styles['risk-stats-line']} />
                <div className={styles['risk-stats-grid-item']}>
                  <div className={classNames(styles['risk-stat-item'], styles[`risk-stat-item-medium`])}>
                    <div className={styles['risk-stat-content']}>
                      <div className={styles['risk-stat-bar']}>
                        <IRifyHomeMediumIcon />
                      </div>
                      <div className={styles['risk-stat-label']}>
                        <div className={styles['risk-stat-label-title']}>中危(81.0%)</div>
                        <div className={styles['risk-stat-label-sub-title']}>Medium</div>
                      </div>
                    </div>
                    <div className={styles['risk-stat-count']}>223</div>
                  </div>
                  <div className={styles['risk-stats-grid-line']} />

                  <div className={classNames(styles['risk-stat-item'], styles[`risk-stat-item-low`])}>
                    <div className={styles['risk-stat-content']}>
                      <div className={styles['risk-stat-bar']}>
                        <IRifyHomeLowIcon />
                      </div>
                      <div className={styles['risk-stat-label']}>
                        <div className={styles['risk-stat-label-title']}>低危(7.0%)</div>
                        <div className={styles['risk-stat-label-sub-title']}>Low</div>
                      </div>
                    </div>
                    <div className={styles['risk-stat-count']}>24</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={classNames(styles['panel-card'], styles['chart-card'])}>
            <div className={styles['panel-card-title']}>风险分布</div>
            <div className={styles['distribution-content']}>
              <div className={styles['distribution-content-echarts']}>
                <RiskDistributionChart
                  total={data.riskDistribution.total}
                  totalLabel={data.riskDistribution.totalLabel}
                  items={data.riskDistribution.items}
                />
              </div>
              <div className={styles['distribution-content-legend']}>
                {data.riskDistribution.items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className={styles['distribution-legend-item']}>
                    <span className={styles['distribution-legend-icon']}>
                      <span
                        className={styles['distribution-legend-dot']}
                        style={{ backgroundColor: RISK_DISTRIBUTION_COLORS[index] }}
                      />
                      <span className={styles['distribution-legend-name']}>{item.name}</span>
                    </span>
                    <span className={styles['distribution-legend-value']}>{item.value}</span>
                    <span className={styles['distribution-legend-percent']}>{item.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={classNames(styles['panel-card'], styles['chart-card'])}>
            <div className={styles['panel-card-title']}>规则命中 Top5</div>
            <div className={styles['rule-hits-bar-chart']}>
              <RuleHitsBarChart items={data.ruleHitsTop5} />
            </div>
          </div>
        </div>

        <div className={styles['bottom-row']}>
          <div className={classNames(styles['panel-card'], styles['projects-card'])}>
            <div className={styles['panel-card-header']}>
              <div className={styles['panel-card-title']}>近期项目</div>
              <button
                type="button"
                className={styles['panel-card-link']}
                onClick={() => onOpenPage(YakitRoute.YakRunner_Project_Manager)}
              >
                查看全部
                <OutlineChevronrightIcon />
              </button>
            </div>
            <div className={styles['projects-table-wrapper']}>
              <table className={styles['projects-table']}>
                <thead>
                  <tr>
                    <th>项目</th>
                    <th>语言</th>
                    <th>项目风险</th>
                    <th>风险数</th>
                    <th>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProjects.map((project, index) => (
                    <tr key={`${project.name}-${index}`}>
                      <td className={styles['projects-table-name']}>{project.name}</td>
                      <td>{project.language}</td>
                      <td>
                        <YakitTag size="small" color={SEVERITY_TAG_COLOR[project.risk]}>
                          {SEVERITY_LABEL[project.risk]}
                        </YakitTag>
                      </td>
                      <td>{project.riskCount}</td>
                      <td className={styles['projects-table-time']}>{project.updateTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IRifyHome
