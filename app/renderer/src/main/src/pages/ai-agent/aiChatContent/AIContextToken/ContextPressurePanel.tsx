import React, { memo } from 'react'
import { useCreation } from 'ahooks'
import { cloneDeep } from 'lodash'
import { ContextPressureEcharts } from '../../chatTemplate/AIEcharts'
import { formatNumberUnits } from '../../utils'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { getPressuresData, getThreshold, isPressurePerfChanged } from './utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { CONTEXT_PERF_POLL_INTERVAL, ContextPerfPanelProps, useContextPerfStore } from './useContextPerfStore'
import styles from '../AIChatContent.module.scss'

const ContextPressurePanel: React.FC<ContextPerfPanelProps> = ({ session, execute }) => {
  const { t } = useI18nNamespaces(['aiAgent'])

  const getPerfData = useContextPerfStore()

  const { renderNumber, aiDataRef: pressure } = useRafPolling({
    getData: () => getPerfData.pressure ?? null,
    interval: CONTEXT_PERF_POLL_INTERVAL,
    shouldStop: () => !execute,
    resetDeps: [execute],
    shouldUpdate: (prev, next) => isPressurePerfChanged(prev, next),
    clone: (data) => cloneDeep(data),
  })

  const dataEcharts = useCreation(() => getPressuresData(pressure ?? undefined, 100), [renderNumber, pressure])
  const threshold = useCreation(() => getThreshold(pressure ?? undefined), [renderNumber, pressure])

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
          {t('AIContextToken.pressure')}
          <span className={styles['tip']}>({t('AIContextToken.peak')})</span>
        </span>
        {!!maxIntelligent && (
          <Tooltip title={t('AiAgengt.intelligentModels')}>
            <span
              className={classNames(styles['intelligent'], {
                [styles['intelligent-height']]: maxIntelligent > threshold,
              })}
            >
              {formatNumberUnits(maxIntelligent)}
            </span>
          </Tooltip>
        )}
        {!!maxLightweight && (
          <Tooltip title={t('AiAgengt.lightweightModels')}>
            <span
              className={classNames(styles['lightweight'], {
                [styles['lightweight-height']]: maxLightweight > threshold,
              })}
            >
              {formatNumberUnits(maxLightweight)}
            </span>
          </Tooltip>
        )}
      </div>
      <ContextPressureEcharts dataEcharts={dataEcharts} threshold={threshold} />
    </div>
  )
}

export default memo(ContextPressurePanel)
