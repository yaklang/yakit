import React, { memo, useCallback, useMemo, useState } from 'react'
import { useCreation } from 'ahooks'
import { cloneDeep, isEmpty } from 'lodash'
import { OutlinePresentationchartlineIcon } from '@/assets/icon/outline'
import { Tooltip } from 'antd'
import { YakitButton, YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { AIChatData } from '../../type/aiChat'
import { formatNumberUnits } from '../../utils'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useRafPolling } from '@/hook/useRafPolling/useRafPolling'
import { isPerfDataChanged } from './utils'
import { CONTEXT_PERF_POLL_INTERVAL, ContextPerfPanelProps, useContextPerfStore } from './useContextPerfStore'
import AIEchartsDetails from './AIEchartsDetails'
import styles from '../AIChatContent.module.scss'

interface ContextDetailPopoverProps extends ContextPerfPanelProps {
  buttonProps?: Omit<YakitButtonProp, 'icon' | 'children'>
}

const ContextDetailPopover: React.FC<ContextDetailPopoverProps> = ({ session, execute, buttonProps }) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const [visible, setVisible] = useState(false)
  const getPerfData = useContextPerfStore(session)

  const { renderNumber, aiDataRef: perfData } = useRafPolling<AIChatData['aiPerfData'] | null>({
    getData: getPerfData,
    interval: CONTEXT_PERF_POLL_INTERVAL,
    shouldStop: () => !execute,
    resetDeps: [execute],
    shouldUpdate: (prev, next) => {
      if (!prev) return !!next
      if (!next) return false
      return isPerfDataChanged(prev, next)
    },
    clone: (data) => (data ? cloneDeep(data) : null),
  })

  const overallToken = useCreation((): [string | number, string | number, string | number] => {
    const { consumption } = perfData || {}
    if (isEmpty(consumption)) return [0, 0, 0]
    return [
      formatNumberUnits(consumption?.input_consumption || 0),
      formatNumberUnits(consumption?.output_consumption || 0),
      formatNumberUnits(consumption?.cache_hit_token || 0),
    ]
  }, [renderNumber, perfData?.consumption])

  const onClose = useCallback(() => setVisible(false), [])

  const popoverContent = useMemo(
    () => (
      <AIEchartsDetails
        overallToken={overallToken}
        tierConsumption={perfData?.consumption?.tier_consumption}
        pressure={perfData?.pressure}
        firstCost={perfData?.firstCost}
        onClose={onClose}
        contextStats={perfData?.contextStats}
        contextSections={perfData?.contextSections}
        renderNumber={renderNumber}
      />
    ),
    [renderNumber, perfData, overallToken, onClose],
  )

  return (
    <YakitPopover
      content={popoverContent}
      destroyTooltipOnHide={true}
      trigger="click"
      overlayClassName={styles['echarts-details-popover']}
      visible={visible}
      onVisibleChange={setVisible}
    >
      <Tooltip title={t('YakitButton.viewDetail')}>
        <YakitButton isHover={visible} icon={<OutlinePresentationchartlineIcon />} type="outline2" {...buttonProps} />
      </Tooltip>
    </YakitPopover>
  )
}

export default memo(ContextDetailPopover)
