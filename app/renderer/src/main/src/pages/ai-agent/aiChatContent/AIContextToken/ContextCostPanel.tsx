import React, { memo } from 'react'
import { useCreation } from 'ahooks'
import { cloneDeep } from 'lodash'
import { ResponseSpeedEcharts } from '../../chatTemplate/AIEcharts'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { getCostData, isFirstCostPerfChanged } from './utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { CONTEXT_PERF_POLL_INTERVAL, ContextPerfPanelProps, useContextPerfStore } from './useContextPerfStore'
import styles from '../AIChatContent.module.scss'

const ContextCostPanel: React.FC<ContextPerfPanelProps> = ({ execute }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const aiPerfData = useContextPerfStore()

  const { renderNumber, aiDataRef: firstCost } = useRafPolling({
    getData: () => aiPerfData.firstCost ?? null,
    interval: CONTEXT_PERF_POLL_INTERVAL,
    shouldStop: () => !execute,
    resetDeps: [execute],
    shouldUpdate: (prev, next) => isFirstCostPerfChanged(prev, next),
    clone: (data) => cloneDeep(data),
  })

  const dataEcharts = useCreation(() => getCostData(firstCost ?? undefined, 100), [renderNumber, firstCost])

  const isShow = useCreation(() => {
    return !!(
      dataEcharts.data.intelligent.length > 0 ||
      dataEcharts.data.lightweight.length > 0 ||
      dataEcharts.data.vision.length > 0
    )
  }, [dataEcharts.data])

  if (!isShow) return null

  const { intelligent: maxIntelligent, lightweight: maxLightweight } = dataEcharts.maxValue

  return (
    <div className={styles['echarts-wrapper']}>
      <div className={styles['title']}>
        <span className={styles['text']}>
          {t('AIContextToken.speed')}
          <span className={styles['tip']}>({t('AIContextToken.peak')})</span>
        </span>
        <Tooltip title={t('AiAgengt.intelligentModels')}>
          {!!maxIntelligent && <span className={classNames(styles['intelligent'])}>{`${maxIntelligent}ms`}</span>}
        </Tooltip>
        <Tooltip title={t('AiAgengt.lightweightModels')}>
          {!!maxLightweight && <span className={classNames(styles['lightweight'])}>{`${maxLightweight}ms`}</span>}
        </Tooltip>
      </div>
      <ResponseSpeedEcharts dataEcharts={dataEcharts} />
    </div>
  )
}

export default memo(ContextCostPanel)
