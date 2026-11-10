import { useEffect, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { yakitScreenshot } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { failed } from '@/utils/notification'
import { SettingsSections } from '../../constants'
import styles from './GeneralSettings.module.scss'

export const ScreenshotSettings = () => {
  const { t } = useI18nNamespaces(['setting'])
  const [settings, setSettings] = useState<YakitScreenshotSettings>()
  const [saving, setSaving] = useState(false)

  const reportError = (error: unknown) => failed(t('SettingsPage.screenshot.failed', { error: String(error) }))

  useEffect(() => {
    yakitScreenshot.getSettings().then(setSettings).catch(reportError)
  }, [])

  const updateDirectory = async (reset: boolean) => {
    setSaving(true)
    try {
      const result = await (reset ? yakitScreenshot.resetDirectory() : yakitScreenshot.selectDirectory())
      if (result) setSettings(result)
    } catch (error) {
      reportError(error)
    } finally {
      setSaving(false)
    }
  }

  const updateWatermark = async (
    options: Partial<Pick<YakitScreenshotSettings, 'watermarkEnabled' | 'watermarkPosition'>>,
  ) => {
    setSaving(true)
    try {
      setSettings(await yakitScreenshot.updateWatermark(options))
    } catch (error) {
      reportError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles['general-section']} data-settings-section={SettingsSections.general.screenshot}>
      <div className={`${styles['section-head']} ${styles['screenshot-head']}`}>
        <div className={styles['section-title']}>{t('SettingsPage.screenshot.title')}</div>
        <div className={styles['section-actions']}>
          <YakitButton
            type="text"
            size="small"
            disabled={!settings || saving || settings.directory === settings.defaultDirectory}
            onClick={() => updateDirectory(true)}
          >
            {t('SettingsPage.screenshot.resetDirectory')}
          </YakitButton>
          <YakitButton
            type="text"
            size="small"
            disabled={!settings || saving}
            onClick={() => yakitScreenshot.openDirectory().catch(reportError)}
          >
            {t('SettingsPage.general.openDirectory')}
          </YakitButton>
          <YakitButton
            type="outline2"
            size="small"
            disabled={!settings || saving}
            onClick={() => updateDirectory(false)}
          >
            {t('SettingsPage.screenshot.selectDirectory')}
          </YakitButton>
        </div>
      </div>
      <div className={`${styles['workspace-path']} ${styles['screenshot-path']}`} title={settings?.directory}>
        {settings?.directory || '—'}
      </div>
      <div className={styles['setting-row-desc']}>{t('SettingsPage.screenshot.description')}</div>
      <div className={styles['list-panel']}>
        <div className={`${styles['setting-row']} ${styles['watermark-toggle-row']}`}>
          <div className={styles['setting-row-text']}>
            <div className={styles['setting-row-title']}>{t('SettingsPage.screenshot.watermarkEnabled')}</div>
            <div className={styles['setting-row-desc']}>{t('SettingsPage.screenshot.watermarkDescription')}</div>
          </div>
          <YakitSwitch
            aria-label={t('SettingsPage.screenshot.watermarkEnabled')}
            checked={settings?.watermarkEnabled ?? true}
            disabled={!settings || saving}
            onChange={(watermarkEnabled) => updateWatermark({ watermarkEnabled })}
          />
        </div>
        {settings?.watermarkEnabled && (
          <div className={styles['setting-row']}>
            <div className={styles['setting-row-text']}>
              <div className={styles['setting-row-title']}>{t('SettingsPage.screenshot.watermarkPosition')}</div>
            </div>
            <YakitSelect
              aria-label={t('SettingsPage.screenshot.watermarkPosition')}
              wrapperClassName={styles['setting-row-input']}
              value={settings.watermarkPosition}
              disabled={saving}
              options={(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((position) => ({
                label: t(`SettingsPage.screenshot.positions.${position}`),
                value: position,
              }))}
              onChange={(watermarkPosition: YakitScreenshotSettings['watermarkPosition']) =>
                updateWatermark({ watermarkPosition })
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
