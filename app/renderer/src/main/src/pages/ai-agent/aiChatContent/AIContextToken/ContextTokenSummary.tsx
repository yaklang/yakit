import React, { memo } from 'react'
import { formatNumberUnits } from '../../utils'
import { OutlineArrowdownIcon, OutlineArrowupIcon } from '@/assets/icon/outline'
import classNames from 'classnames'
import { isConsumptionPerfChanged } from './utils'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { CONTEXT_PERF_POLL_INTERVAL, ContextPerfPanelProps, useContextPerfStore } from './useContextPerfStore'
import { AIAgentGrpcApi } from '@/pages/ai-re-act/hooks/grpcApi'
import styles from '../AIChatContent.module.scss'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCreation from 'ahooks/lib/useCreation'
import cloneDeep from 'lodash/cloneDeep'
import isEmpty from 'lodash/isEmpty'

const ContextTokenSummary: React.FC<ContextPerfPanelProps> = () => {
  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)

  const getPerfData = useContextPerfStore()

  const { renderNumber, aiDataRef: consumption } = useRafPolling<AIAgentGrpcApi.Consumption | null>({
    getData: () => getPerfData.consumption ?? null,
    interval: CONTEXT_PERF_POLL_INTERVAL,
    shouldStop: () => !execute,
    resetDeps: [execute],
    shouldUpdate: (prev, next) => isConsumptionPerfChanged(prev, next),
    clone: (data) => (data ? cloneDeep(data) : null),
  })

  const token = useCreation((): [string | number, string | number, string | number] => {
    if (isEmpty(consumption)) return [0, 0, 0]
    const input = consumption?.input_consumption || 0
    const output = consumption?.output_consumption || 0
    const cacheHit = consumption?.cache_hit_token || 0
    return [formatNumberUnits(input), formatNumberUnits(output), formatNumberUnits(cacheHit)]
  }, [renderNumber, consumption])

  return (
    <div className={styles['info-token']}>
      <div className={styles['token']}>Tokens:</div>
      <div className={classNames(styles['token-tag'], styles['upload-token'])}>
        <OutlineArrowupIcon />
        {token[0]}
      </div>
      <div className={classNames(styles['token-tag'], styles['download-token'])}>
        <OutlineArrowdownIcon />
        {token[1]}
      </div>
      <div className={classNames(styles['token-tag'], styles['download-token'])}>{token[2]}</div>
    </div>
  )
}

export default memo(ContextTokenSummary)
