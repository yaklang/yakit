import { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import type { SettingsAnchor } from './constants'
import styles from './Settings.module.scss'
import { SettingsSide } from './settingsSide/SettingsSide'
import { SettingsContent } from './settingsContent/SettingsContent'

export type { SettingsAnchor } from './constants'

export interface SettingsProps {
  pageId?: string
  anchor?: SettingsAnchor | string
}

export const Settings: React.FC<SettingsProps> = (props) => {
  const [activeAnchor, setActiveAnchor] = useState<string>(props.anchor || 'general')

  const applyAnchor = useMemoizedFn((anchor?: string) => {
    if (!anchor) return
    setActiveAnchor(anchor)
  })

  useEffect(() => {
    applyAnchor(props.anchor)
  }, [props.anchor])

  useEffect(() => {
    const onAnchor = (anchor: string) => applyAnchor(anchor)
    emiter.on('onSettingsAnchor', onAnchor)
    return () => {
      emiter.off('onSettingsAnchor', onAnchor)
    }
  }, [])

  return (
    <div className={styles['settings-page']}>
      <SettingsSide activeAnchor={activeAnchor} onSelect={setActiveAnchor} />
      <SettingsContent anchor={activeAnchor} />
    </div>
  )
}
