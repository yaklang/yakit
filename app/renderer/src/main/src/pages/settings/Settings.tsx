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
  section?: string
}

export const Settings: React.FC<SettingsProps> = (props) => {
  const [activeAnchor, setActiveAnchor] = useState<string>(props.anchor || 'general')
  const [section, setSection] = useState<string | undefined>(props.section)
  const [sectionTick, setSectionTick] = useState(0)

  const applyAnchor = useMemoizedFn((anchor?: string) => {
    if (!anchor) return
    setActiveAnchor(anchor)
  })

  const applySection = useMemoizedFn((next?: string) => {
    setSection(next || undefined)
    setSectionTick((n) => n + 1)
  })

  useEffect(() => {
    applyAnchor(props.anchor)
    applySection(props.section)
  }, [props.anchor, props.section])

  useEffect(() => {
    const onAnchor = (anchor: string) => applyAnchor(anchor)
    const onSection = (next: string) => applySection(next)
    emiter.on('onSettingsAnchor', onAnchor)
    emiter.on('onSettingsSection', onSection)
    return () => {
      emiter.off('onSettingsAnchor', onAnchor)
      emiter.off('onSettingsSection', onSection)
    }
  }, [])

  return (
    <div className={styles['settings-page']}>
      <SettingsSide
        activeAnchor={activeAnchor}
        onSelect={(next) => {
          setActiveAnchor(next)
          applySection(undefined)
        }}
      />
      <SettingsContent anchor={activeAnchor} section={section} sectionTick={sectionTick} />
    </div>
  )
}
