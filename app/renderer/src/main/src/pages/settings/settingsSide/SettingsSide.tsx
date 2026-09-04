import { useMemo, useState } from 'react'
import classNames from 'classnames'
import { Divider, Space } from 'antd'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { OutlineSearchIcon } from '@/assets/icon/outline'
import { getSettingsGroupLabel, getSettingsLabel, SettingsMenu, type SettingsAnchor } from '../constants'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './SettingsSide.module.scss'

interface SettingsSideProps {
  activeAnchor: string
  onSelect: (anchor: SettingsAnchor) => void
}

export const SettingsSide: React.FC<SettingsSideProps> = (props) => {
  const { activeAnchor, onSelect } = props
  const { t, i18n } = useI18nNamespaces(['setting'])
  const [keyword, setKeyword] = useState('')

  const filteredMenu = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    return SettingsMenu.map((group) => {
      const title = getSettingsGroupLabel(group.titleKey, t)
      const items = group.items.map((item) => ({
        ...item,
        label: getSettingsLabel(item.key, t),
      }))
      if (!k) return { ...group, title, items }
      if (title.toLowerCase().includes(k)) return { ...group, title, items }
      return {
        ...group,
        title,
        items: items.filter((item) => item.label.toLowerCase().includes(k)),
      }
    }).filter((group) => group.items.length > 0)
  }, [keyword, t, i18n.language])

  return (
    <div className={styles['settings-side']}>
      <div className={styles['settings-search']}>
        <YakitInput
          allowClear
          placeholder={t('SettingsPage.searchPlaceholder')}
          prefix={<OutlineSearchIcon className={styles['search-icon']} />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className={styles['settings-menu']}>
        {filteredMenu.map((group, index) => (
          <Space key={group.titleKey} direction="vertical" style={{ display: 'flex' }} size={1}>
            <div className={styles['settings-group']}>
              <div className={styles['settings-group-title']}>{group.title}</div>
              <Space direction="vertical" style={{ display: 'flex' }} size={1}>
                {group.items.map((item) => (
                  <div
                    id={item.key}
                    key={item.key}
                    className={classNames(styles['settings-item'], {
                      [styles['settings-item-active']]: item.key === activeAnchor,
                    })}
                    onClick={() => onSelect(item.key)}
                  >
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </Space>
            </div>
            {index < filteredMenu.length - 1 && (
              <Divider style={{ margin: '8px 0', backgroundColor: 'var(--Colors-Use-Neutral-Bg-Hover)' }} />
            )}
          </Space>
        ))}
      </div>
    </div>
  )
}
