import React, { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import {
  OutlineHomeIcon,
  OutlineArrowsmrightIcon,
  OutlineCheckIcon,
  OutlineChevronrightIcon,
  OutlineNotebookIcon,
  OutlineAIIcon,
} from '@/assets/icon/outline'
import {
  GetSSAWorkbenchDashboardRequest,
  GetSSAWorkbenchDashboardResponse,
  IRifyHomeProps,
  SSAWorkbenchRiskLevelItem,
} from './IRifyHomeType'
import { FieldName } from '../risks/RiskTable'
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
  IRifyHomeGhostIcon,
  IRifyHomeHighIcon,
  IRifyHomeLowIcon,
  IRifyHomeMediumIcon,
  IRifyHomeSeriousIcon,
  IRifyQuickAccessJavaDecompilerIcon,
} from './icon'
import { getRiskDistributionColors, RiskDistributionChart, RiskGaugeChart, RuleHitsBarChart } from './IRifyHomeEcharts'
import useGetColorsByTheme from '@/hook/useGetColorsByTheme'
import { IRifyHomeTable } from './IRifyHomeTable'
import { useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { yakitProject } from '@/services/electronBridge'
import { yakitFailed } from '@/utils/notification'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { IrifyAiCodeAuditStyle } from '@/constants/focusMode'

const RISK_STAT_CONFIG = [
  {
    severities: ['critical'],
    styleKey: 'serious',
    Icon: IRifyHomeSeriousIcon,
    enLabel: 'Serious',
  },
  {
    severities: ['high'],
    styleKey: 'high',
    Icon: IRifyHomeHighIcon,
    enLabel: 'High',
  },
  {
    severities: ['medium', 'middle', 'warn'],
    styleKey: 'medium',
    Icon: IRifyHomeMediumIcon,
    enLabel: 'Medium',
  },
  {
    severities: ['low'],
    styleKey: 'low',
    Icon: IRifyHomeLowIcon,
    enLabel: 'Low',
  },
] as const

const toRiskGaugeList = (items: SSAWorkbenchRiskLevelItem[]): FieldName[] =>
  items.map((item) => ({
    Total: item.Count,
    Name: item.Severity,
    Verbose: item.Verbose,
    Delta: 0,
  }))

const findRiskLevelItem = (items: SSAWorkbenchRiskLevelItem[], severities: readonly string[]) =>
  items.find((item) => severities.includes(item.Severity.toLowerCase()))

const onOpenPage = (route: YakitRoute, params?: any) => {
  emiter.emit('openPage', JSON.stringify({ route, params: params ?? {} }))
}

/** 跳转到 Irify AI 代码审计页，并带上入口风格（code / skill）作为引导蒙版预选。
 *  params 形状与 AuditCodePageInfoProps 对齐，最终写入 auditCodePageInfo。 */
const onOpenIrifyAiCodeAudit = (auditStyle: IrifyAiCodeAuditStyle) => {
  onOpenPage(YakitRoute.Irify_AI_Code_Audit, { auditStyle })
}

const IRifyHome: React.FC<IRifyHomeProps> = () => {
  const { t } = useI18nNamespaces(['irifyHome'])
  const themeColors = useGetColorsByTheme()
  const [responseData, setResponseData] = useState<GetSSAWorkbenchDashboardResponse>()
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(ref)
  const getIRifyData = useMemoizedFn((isLoading: boolean = true) => {
    if (isLoading) {
      setLoading(true)
    }
    yakitProject
      .getSSAWorkbenchDashboard({
        RecentProjectLimit: 10,
      } as GetSSAWorkbenchDashboardRequest)
      .then((data: GetSSAWorkbenchDashboardResponse) => {
        setResponseData(data)
      })
      .catch((e) => {
        yakitFailed(t('IRifyHome.fetchDataFailed', { error: e }))
      })
      .finally(() => {
        setLoading(false)
      })
  })

  useEffect(() => {
    getIRifyData()
  }, [])

  useUpdateEffect(() => {
    if (inViewport) {
      getIRifyData(false)
    }
  }, [inViewport])

  const riskOverviewList = useMemo(() => responseData?.RiskOverview ?? [], [responseData?.RiskOverview])
  const riskGaugeList = useMemo(() => toRiskGaugeList(riskOverviewList), [riskOverviewList])
  const riskDistributionItems = useMemo(
    () =>
      (responseData?.RiskDistribution ?? []).map((item) => ({
        name: item.Verbose || item.RiskType,
        value: item.Count,
        percent: item.Percent,
      })),
    [responseData?.RiskDistribution],
  )
  const ruleHitsTop5 = useMemo(
    () =>
      (responseData?.TopRuleHits ?? []).map((item) => ({
        name: item.TitleVerbose || item.RuleName,
        value: item.HitCount,
      })),
    [responseData?.TopRuleHits],
  )
  const totalRiskCount = responseData?.TotalRiskCount ?? 0
  const recentProjects = responseData?.RecentProjects ?? []
  const riskDistributionColors = useMemo(() => getRiskDistributionColors(themeColors), [themeColors])

  const renderRiskStatItem = (config: (typeof RISK_STAT_CONFIG)[number]) => {
    const item = findRiskLevelItem(riskOverviewList, config.severities)
    const Icon = config.Icon
    const count = item?.Count ?? 0
    const percent = item?.Percent ?? 0
    const verbose = item?.Verbose ?? config.enLabel

    return (
      <div className={classNames(styles['risk-stat-item'], styles[`risk-stat-item-${config.styleKey}`])}>
        <div className={styles['risk-stat-content']}>
          <div className={styles['risk-stat-bar']}>
            <Icon />
          </div>
          <div className={styles['risk-stat-label']}>
            <div className={styles['risk-stat-label-title']}>
              {verbose}({percent.toFixed(1)}%)
            </div>
            <div className={styles['risk-stat-label-sub-title']}>{config.enLabel}</div>
          </div>
        </div>
        <div className={styles['risk-stat-count']}>{count}</div>
      </div>
    )
  }

  return (
    <YakitSpin spinning={loading}>
      <div className={styles['irify-home']} ref={ref}>
        <div className={styles['irify-home-content']}>
          <div className={styles['hero-section']}>
            <div className={styles['page-header']}>
              <div className={styles['page-header-text']}>
                <div className={styles['page-title']}>{t('IRifyHome.pageTitle')}</div>
                <div className={styles['page-subtitle']}>{t('IRifyHome.pageSubtitle')}</div>
              </div>
              <div className={styles['header-stats']}>
                <div className={styles['header-stat-card']}>
                  <div className={styles['header-stat-icon']}>
                    <OutlineHomeIcon />
                  </div>
                  <div className={styles['header-stat-info']}>
                    <div className={styles['header-stat-value']}>{responseData?.Summary.ProjectCount || 0}</div>
                    <div className={styles['header-stat-label']}>{t('IRifyHome.project')}</div>
                  </div>
                </div>
                <div className={styles['header-stat-card']}>
                  <div className={styles['header-stat-icon']}>
                    <OutlineNotebookIcon />
                  </div>
                  <div className={styles['header-stat-info']}>
                    <div className={styles['header-stat-value']}>{responseData?.Summary.RuleCount || 0}</div>
                    <div className={styles['header-stat-label']}>{t('IRifyHome.ruleLibrary')}</div>
                  </div>
                </div>
                <div className={styles['header-stat-card']}>
                  <div className={styles['header-stat-icon']}>
                    <OutlineAIIcon />
                  </div>
                  <div className={styles['header-stat-info']}>
                    <div className={styles['header-stat-value']}>{responseData?.Summary.AIAuditTaskCount || 0}</div>
                    <div className={styles['header-stat-label']}>{t('IRifyHome.aiAuditTask')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles['audit-mode-section']}>
              <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-primary`])}>
                <div className={styles['audit-mode-card-ghost']}>
                  <IRifyHomeGhostIcon />
                </div>
                <div className={styles['audit-mode-card-divergency']} />
                <div className={styles['audit-mode-card-header']}>
                  <div className={styles['audit-mode-card-title-row']}>
                    <div className={classNames(styles['audit-mode-card-icon'], styles['audit-mode-card-icon-primary'])}>
                      <PublicAIAuditCodeIcon />
                    </div>
                    <span className={styles['audit-mode-card-title']}>{t('AuditMode.aiCodeAudit')}</span>

                    <span className={classNames(styles['audit-mode-badge'], styles['audit-mode-badge-online'])}>
                      {t('AuditMode.online')}
                    </span>
                  </div>
                  <div className={styles['audit-mode-card-subtitle']}>{t('AuditMode.aiSubtitle')}</div>
                </div>

                <div className={styles['audit-mode-features']}>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.aiFeature1')}</span>
                  </div>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.aiFeature2')}</span>
                  </div>
                </div>

                <div className={styles['audit-mode-tags']}>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagBusinessLogic')}</span>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagContextUnderstanding')}</span>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagRiskExplanation')}</span>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagFixSuggestion')}</span>
                </div>
                <div className={styles['audit-mode-button']} onClick={() => onOpenIrifyAiCodeAudit('code')}>
                  {t('AuditMode.startAiAudit')}
                  <OutlineArrowsmrightIcon />
                </div>
              </div>
              <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-primary`])}>
                <div className={styles['audit-mode-card-ghost']}>
                  <IRifyHomeGhostIcon />
                </div>
                <div className={styles['audit-mode-card-divergency']} />
                <div className={styles['audit-mode-card-header']}>
                  <div className={styles['audit-mode-card-title-row']}>
                    <div className={classNames(styles['audit-mode-card-icon'], styles['audit-mode-card-icon-primary'])}>
                      <OutlineAIIcon />
                    </div>
                    <span className={styles['audit-mode-card-title']}>{t('AuditMode.aiSkillAudit')}</span>

                    <span className={classNames(styles['audit-mode-badge'], styles['audit-mode-badge-online'])}>
                      {t('AuditMode.online')}
                    </span>
                  </div>
                  <div className={styles['audit-mode-card-subtitle']}>{t('AuditMode.aiSkillSubtitle')}</div>
                </div>

                <div className={styles['audit-mode-features']}>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.aiSkillFeature1')}</span>
                  </div>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.aiSkillFeature2')}</span>
                  </div>
                </div>

                <div className={styles['audit-mode-tags']}>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagSkillSpecialized')}</span>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagSkillFlow')}</span>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagSkillRule')}</span>
                  <span className={styles['audit-mode-tag']}>{t('AuditMode.tagRiskExplanation')}</span>
                </div>
                <div className={styles['audit-mode-button']} onClick={() => onOpenIrifyAiCodeAudit('skill')}>
                  {t('AuditMode.startAiSkillAudit')}
                  <OutlineArrowsmrightIcon />
                </div>
              </div>
              <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-secondary`])}>
                <div className={styles['audit-mode-card-header']}>
                  <div className={styles['audit-mode-card-title-row']}>
                    <div className={styles['audit-mode-card-icon']}>
                      <PublicAuditCodeIcon />
                    </div>
                    <span className={styles['audit-mode-card-title']}>{t('AuditMode.traditionalCodeAudit')}</span>

                    <span className={classNames(styles['audit-mode-badge'], styles['audit-mode-badge-offline'])}>
                      {t('AuditMode.offline')}
                    </span>
                  </div>
                </div>

                <div className={styles['audit-mode-features']}>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.traditionalFeature1')}</span>
                  </div>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.traditionalFeature2')}</span>
                  </div>
                </div>

                <div
                  className={styles['audit-mode-button']}
                  onClick={() => onOpenPage(YakitRoute.YakRunner_Audit_Code)}
                >
                  {t('AuditMode.startAudit')}
                  <OutlineArrowsmrightIcon />
                </div>
              </div>
              <div className={classNames(styles['audit-mode-card'], styles[`audit-mode-card-secondary`])}>
                <div className={styles['audit-mode-card-header']}>
                  <div className={styles['audit-mode-card-title-row']}>
                    <div className={styles['audit-mode-card-icon']}>
                      <PublicCodeScanIcon />
                    </div>
                    <span className={styles['audit-mode-card-title']}>{t('AuditMode.codeScan')}</span>
                  </div>
                </div>

                <div className={styles['audit-mode-features']}>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.scanFeature1')}</span>
                  </div>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.scanFeature2')}</span>
                  </div>
                  <div className={styles['audit-mode-feature-item']}>
                    <OutlineCheckIcon className={styles['audit-mode-feature-icon']} />
                    <span>{t('AuditMode.scanFeature3')}</span>
                  </div>
                </div>

                <div className={styles['audit-mode-button']} onClick={() => onOpenPage(YakitRoute.YakRunner_Code_Scan)}>
                  {t('AuditMode.startScan')}
                  <OutlineArrowsmrightIcon />
                </div>
              </div>
            </div>
          </div>
          <div className={styles['main-chart']}>
            <div className={classNames(styles['panel-card'])}>
              <div className={styles['panel-card-title']}>{t('IRifyHome.riskOverview')}</div>
              <div className={styles['risk-overview']}>
                <div className={styles['risk-gauge']}>{inViewport && <RiskGaugeChart list={riskGaugeList} />}</div>
                <div className={styles['risk-stats-grid']}>
                  <div className={styles['risk-stats-grid-item']}>
                    {renderRiskStatItem(RISK_STAT_CONFIG[0])}
                    <div className={styles['risk-stats-grid-line']} />
                    {renderRiskStatItem(RISK_STAT_CONFIG[1])}
                  </div>
                  <div className={styles['risk-stats-line']} />
                  <div className={styles['risk-stats-grid-item']}>
                    {renderRiskStatItem(RISK_STAT_CONFIG[2])}
                    <div className={styles['risk-stats-grid-line']} />
                    {renderRiskStatItem(RISK_STAT_CONFIG[3])}
                  </div>
                </div>
              </div>
            </div>

            <div className={classNames(styles['panel-card'], styles['chart-card'])}>
              <div className={styles['panel-card-title']}>{t('IRifyHome.riskDistribution')}</div>
              <div className={styles['distribution-content']}>
                <div className={styles['distribution-content-echarts']}>
                  {<RiskDistributionChart total={totalRiskCount} items={riskDistributionItems} />}
                </div>
                <div className={styles['distribution-content-legend']}>
                  {riskDistributionItems.map((item, index) => (
                    <div key={`${item.name}-${index}`} className={styles['distribution-legend-item']}>
                      <span className={styles['distribution-legend-icon']}>
                        <span
                          className={styles['distribution-legend-dot']}
                          style={{
                            backgroundColor:
                              riskDistributionColors[index % riskDistributionColors.length] ||
                              themeColors['--Colors-Use-Main-Primary'],
                          }}
                        />
                        <span className={styles['distribution-legend-name']}>{item.name}</span>
                      </span>
                      <span className={styles['distribution-legend-value']}>{item.value}</span>
                      <span className={styles['distribution-legend-percent']}>{item.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={classNames(styles['panel-card'], styles['chart-card'])}>
              <div className={styles['panel-card-title']}>{t('IRifyHome.ruleHitsTop5')}</div>
              <div className={styles['rule-hits-bar-chart']}>
                {inViewport && <RuleHitsBarChart items={ruleHitsTop5} />}
              </div>
            </div>
          </div>

          <div className={styles['bottom-row']}>
            <div className={classNames(styles['panel-card'], styles['projects-card'])}>
              <div className={styles['panel-card-header']}>
                <div className={styles['panel-card-title']}>{t('IRifyHome.recentProjects')}</div>
                <button
                  type="button"
                  className={styles['panel-card-link']}
                  onClick={() => onOpenPage(YakitRoute.YakRunner_Project_Manager)}
                >
                  {t('IRifyHome.viewAll')}
                  <OutlineChevronrightIcon />
                </button>
              </div>
              <div className={styles['projects-table-wrapper']}>
                <IRifyHomeTable data={recentProjects} onRefresh={() => getIRifyData(false)} />
              </div>
            </div>
            <div className={classNames(styles['panel-card'], styles['quick-access-card'])}>
              <div className={styles['panel-card-title']}>{t('IRifyHome.quickAccess')}</div>
              <div className={styles['quick-access-list']}>
                <div className={styles['quick-access-item']} onClick={() => onOpenPage(YakitRoute.Rule_Management)}>
                  <div className={styles['quick-access-item-icon']}>
                    <PublicRuleManagementIcon />
                  </div>
                  <div className={styles['quick-access-item-content']}>
                    <div className={styles['quick-access-item-title']}>{t('QuickAccess.ruleManagement')}</div>
                    <div className={styles['quick-access-item-desc']}>{t('QuickAccess.ruleManagementDesc')}</div>
                  </div>
                </div>
                <div className={styles['quick-access-item']} onClick={() => onOpenPage(YakitRoute.Yak_Java_Decompiler)}>
                  <div className={styles['quick-access-item-icon']}>
                    <IRifyQuickAccessJavaDecompilerIcon />
                  </div>
                  <div className={styles['quick-access-item-content']}>
                    <div className={styles['quick-access-item-title']}>{t('QuickAccess.javaDecompiler')}</div>
                    <div className={styles['quick-access-item-desc']}>{t('QuickAccess.javaDecompilerDesc')}</div>
                  </div>
                </div>
                <div
                  className={styles['quick-access-item']}
                  onClick={() => onOpenPage(YakitRoute.YakRunner_Audit_Hole)}
                >
                  <div className={styles['quick-access-item-icon']}>
                    <PublicAuditHoleIcon />
                  </div>
                  <div className={styles['quick-access-item-content']}>
                    <div className={styles['quick-access-item-title']}>{t('QuickAccess.auditHole')}</div>
                    <div className={styles['quick-access-item-desc']}>{t('QuickAccess.auditHoleDesc')}</div>
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
                    <div className={styles['quick-access-item-title']}>{t('QuickAccess.projectManagement')}</div>
                    <div className={styles['quick-access-item-desc']}>{t('QuickAccess.projectManagementDesc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </YakitSpin>
  )
}

export default IRifyHome
