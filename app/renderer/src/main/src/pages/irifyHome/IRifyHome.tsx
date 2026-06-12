import React from 'react'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import {
  OutlineHomeIcon,
  OutlineArrowsmrightIcon,
  OutlineCheckIcon,
  OutlineChevronrightIcon,
  OutlineNotebookIcon,
  OutlineAIIcon,
} from '@/assets/icon/outline'
import { IRifyHomeProps, RiskSeverity } from './IRifyHomeType'
import { MOCK_HOME_DATA } from './IRifyHomeMockData'
import styles from './IRifyHome.module.scss'
import {
  PublicAIAuditCodeIcon,
  PublicAuditCodeIcon,
  PublicAuditHoleIcon,
  PublicCodeScanIcon,
  PublicProjectManagerIcon,
  PublicRuleManagementIcon,
} from '@/routes/publicIcon'
import {
  IRifyDivergencyIcon,
  IRifyHomeGhostIcon,
  IRifyHomeHighIcon,
  IRifyHomeLowIcon,
  IRifyHomeMediumIcon,
  IRifyHomeSeriousIcon,
  IRifyQuickAccessJavaDecompilerIcon,
} from './icon'
import {
  RISK_DISTRIBUTION_COLOR_KEYS,
  RiskDistributionChart,
  RiskGaugeChart,
  RuleHitsBarChart,
} from './IRifyHomeEchats'
import { IRifyHomeTable } from './IRifyHomeTable'

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

const RISK_DISTRIBUTION_COLORS = RISK_DISTRIBUTION_COLOR_KEYS.map((key) => `var(${key})`)

const MOCK_RISK_LEVEL_LIST = [
  { Total: 3, Name: 'critical', Verbose: '严重', Delta: 0 },
  { Total: 3, Name: 'high', Verbose: '高危', Delta: 0 },
  { Total: 223, Name: 'medium', Verbose: '中危', Delta: 0 },
  { Total: 24, Name: 'low', Verbose: '低危', Delta: 0 },
]

const onOpenPage = (route: YakitRoute, params?: any) => {
  emiter.emit('openPage', JSON.stringify({ route, params: params ?? {} }))
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
                <RiskGaugeChart list={MOCK_RISK_LEVEL_LIST} />
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
              <IRifyHomeTable />
            </div>
          </div>
          <div className={classNames(styles['panel-card'], styles['quick-access-card'])}>
            <div className={styles['panel-card-title']}>快速入口</div>
            <div className={styles['quick-access-list']}>
              <div className={styles['quick-access-item']} onClick={() => onOpenPage(YakitRoute.Rule_Management)}>
                <div className={styles['quick-access-item-icon']}>
                  <PublicRuleManagementIcon />
                </div>
                <div className={styles['quick-access-item-content']}>
                  <div className={styles['quick-access-item-title']}>规则管理</div>
                  <div className={styles['quick-access-item-desc']}>这里是描述文案</div>
                </div>
              </div>
              <div className={styles['quick-access-item']} onClick={() => onOpenPage(YakitRoute.Yak_Java_Decompiler)}>
                <div className={styles['quick-access-item-icon']}>
                  <IRifyQuickAccessJavaDecompilerIcon />
                </div>
                <div className={styles['quick-access-item-content']}>
                  <div className={styles['quick-access-item-title']}>JAVA 反编译</div>
                  <div className={styles['quick-access-item-desc']}>这里是描述文案</div>
                </div>
              </div>
              <div className={styles['quick-access-item']} onClick={() => onOpenPage(YakitRoute.YakRunner_Audit_Hole)}>
                <div className={styles['quick-access-item-icon']}>
                  <PublicAuditHoleIcon />
                </div>
                <div className={styles['quick-access-item-content']}>
                  <div className={styles['quick-access-item-title']}>审计漏洞</div>
                  <div className={styles['quick-access-item-desc']}>这里是描述文案</div>
                </div>
              </div>
              <div
                className={styles['quick-access-item']}
                onClick={() => onOpenPage(YakitRoute.YakRunner_Project_Manager)}
              >
                <div className={styles['quick-access-item-icon']}>
                  <PublicProjectManagerIcon />
                </div>
                <div className={styles['quick-access-item-content']}>
                  <div className={styles['quick-access-item-title']}>项目管理</div>
                  <div className={styles['quick-access-item-desc']}>这里是描述文案</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IRifyHome
