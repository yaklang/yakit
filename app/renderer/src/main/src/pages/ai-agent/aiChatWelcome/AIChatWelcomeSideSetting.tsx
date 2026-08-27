import React, { useEffect, useState } from 'react'
import { Tooltip } from 'antd'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { PinOutlined, PinOffOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import type { SideSettingButtonProps } from './type'

export const SideSettingButton: React.FC<SideSettingButtonProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [isAutoHidden, setIsAutoHidden] = useState<boolean>(true)
  useEffect(() => {
    onGetSideSetting()
  }, [])
  const onGetSideSetting = useMemoizedFn(() => {
    getRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode)
      .then((res) => {
        setIsAutoHidden(res !== 'false')
      })
      .catch(() => {})
  })
  const onSideSetting = useDebounceFn(
    useMemoizedFn((e) => {
      e.stopPropagation()
      const checked = !isAutoHidden
      setIsAutoHidden(checked)
      setRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode, `${checked}`)
      emiter.emit('switchSideHiddenMode', `${checked}`)
    }),
    { wait: 200, leading: true },
  ).run
  return (
    <Tooltip title={!isAutoHidden ? t('SideSettingButton.pinMenuOn') : t('SideSettingButton.pinMenuOff')}>
      <YakitButton
        type={isAutoHidden ? 'text2' : 'outline1'}
        icon={isAutoHidden ? <PinOffOutlined color="currentColor" /> : <PinOutlined color="currentColor" />}
        onClick={onSideSetting}
        {...props}
      />
    </Tooltip>
  )
})
