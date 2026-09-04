import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { SolidCheckCircleIcon } from '@/assets/icon/solid'
import { isCommunityYakit } from '@/utils/envfile'
import { useSoftMode, YakitModeEnum } from '@/store/softMode'
import { useTheme, type ThemeMode } from '@/hook/useTheme'
import { yakitApp } from '@/services/electronBridge'
import { syncAppSettings } from '@/auxWindow/utils/messaging'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import themePreviewLight from '../../assets/theme-preview-light.png'
import themePreviewDark from '../../assets/theme-preview-dark.png'
import styles from './AppearanceSettings.module.scss'

export const AppearanceSettings: React.FC = () => {
  const { themeMode, setTheme } = useTheme()
  const { softMode, setSoftMode } = useSoftMode()
  const { t, i18n } = useI18nNamespaces(['setting'])
  const showMode = isCommunityYakit()

  const themeOptions: { key: ThemeMode; label: string }[] = [
    { key: 'system', label: t('SettingsPage.appearance.followSystem') },
    { key: 'light', label: t('SettingsPage.appearance.light') },
    { key: 'dark', label: t('SettingsPage.appearance.dark') },
  ]

  const modeOptions = [
    {
      key: YakitModeEnum.Classic,
      title: t('SettingsPage.appearance.classic'),
      desc: t('SettingsPage.appearance.classicDesc'),
    },
    {
      key: YakitModeEnum.SecurityExpert,
      title: t('SettingsPage.appearance.securityExpert'),
      desc: t('SettingsPage.appearance.securityExpertDesc'),
    },
    {
      key: YakitModeEnum.Scan,
      title: t('SettingsPage.appearance.scan'),
      desc: t('SettingsPage.appearance.scanDesc'),
    },
  ]

  const onSelectTheme = useMemoizedFn((key: ThemeMode) => {
    if (themeMode === key) return
    setTheme(key)
  })

  const onSelectMode = useMemoizedFn((key: YakitModeEnum) => {
    if (softMode === key) return
    setSoftMode(key)
  })

  const onSelectLang = useMemoizedFn((type: string) => {
    if (i18n.language === type) return
    i18n.changeLanguage(type)
    yakitApp.setYakitHomeConfig('softLange', type).catch(() => {})
    syncAppSettings({ type: 'i18n', payload: type })
  })

  return (
    <div className={styles['appearance']}>
      <div className={styles['appearance-section']}>
        <div className={styles['appearance-section-title']}>{t('SettingsPage.appearance.theme')}</div>
        <div className={styles['theme-cards']}>
          {themeOptions.map((item) => {
            const active = themeMode === item.key
            return (
              <div
                key={item.key}
                className={classNames(styles['theme-card'], {
                  [styles['theme-card-active']]: active,
                })}
                onClick={() => onSelectTheme(item.key)}
              >
                <div className={styles['theme-preview']}>
                  {item.key === 'system' ? (
                    <div className={styles['theme-preview-system']}>
                      <img className={styles['theme-preview-half']} src={themePreviewLight} alt="" />
                      <img className={styles['theme-preview-half']} src={themePreviewDark} alt="" />
                    </div>
                  ) : (
                    <img
                      className={styles['theme-preview-img']}
                      src={item.key === 'light' ? themePreviewLight : themePreviewDark}
                      alt={item.label}
                    />
                  )}
                </div>
                <div className={styles['theme-card-label']}>
                  <span>{item.label}</span>
                  <span className={styles['theme-check']}>
                    <SolidCheckCircleIcon />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showMode && (
        <div className={styles['appearance-section']}>
          <div className={styles['appearance-section-title']}>{t('SettingsPage.appearance.mode')}</div>
          <div className={styles['list-panel']}>
            {modeOptions.map((item) => {
              const active = softMode === item.key
              return (
                <div key={item.key} className={styles['mode-item']} onClick={() => onSelectMode(item.key)}>
                  <div className={styles['mode-item-text']}>
                    <div className={styles['mode-item-title']}>{item.title}</div>
                    <div className={styles['mode-item-desc']}>{item.desc}</div>
                  </div>
                  <div className={classNames(styles['mode-check'], { [styles['mode-check-active']]: active })}>
                    <SolidCheckCircleIcon />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={styles['appearance-section']}>
        <div className={styles['appearance-section-title']}>{t('SettingsPage.appearance.language')}</div>
        <div className={styles['list-panel']}>
          <div className={styles['language-row']}>
            <div className={styles['language-label']}>{t('SettingsPage.appearance.languageSetting')}</div>
            <YakitSelect
              size="small"
              value={i18n.language}
              onChange={onSelectLang}
              wrapperClassName={styles['language-select']}
            >
              <YakitSelect.Option value="zh">{t('SettingsPage.appearance.langZh')}</YakitSelect.Option>
              <YakitSelect.Option value="en">{t('SettingsPage.appearance.langEn')}</YakitSelect.Option>
              <YakitSelect.Option value="zh-TW">{t('SettingsPage.appearance.langZhTW')}</YakitSelect.Option>
            </YakitSelect>
          </div>
        </div>
      </div>
    </div>
  )
}
