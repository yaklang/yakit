import React from 'react'
import { Tooltip } from 'antd'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { PinOutlined, PinOffOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { setSideHiddenMode, useSideHiddenMode } from '../store/sideHiddenModeStore'
import type { SideSettingButtonProps } from './type'

export const SideSettingButton: React.FC<SideSettingButtonProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const isAutoHidden = useSideHiddenMode()
  const onSideSetting = useDebounceFn(
    useMemoizedFn((e) => {
      e.stopPropagation()
      const checked = !isAutoHidden
      setSideHiddenMode(checked)
      emiter.emit('switchSideHiddenMode', `${checked}`)
    }),
    { wait: 200, leading: true },
  ).run
  return (
    <Tooltip title={!isAutoHidden ? t('SideSettingButton.pinMenuOn') : t('SideSettingButton.pinMenuOff')}>
      <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
        <YakitButton
          type={isAutoHidden ? 'text2' : 'outline1'}
          icon={
            isAutoHidden ? (
              <PinOffOutlined color="currentColor" size={16} />
            ) : (
              <PinOutlined color="currentColor" size={16} />
            )
          }
          onClick={onSideSetting}
          {...props}
        />
      </span>
    </Tooltip>
  )
})
