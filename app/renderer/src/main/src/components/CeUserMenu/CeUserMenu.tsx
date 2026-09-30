import type React from 'react'
import { useMemo } from 'react'
import classNames from 'classnames'
import { Avatar } from 'antd'
import styles from './CeUserMenu.module.scss'
import type { YakitMenuItemDividerProps, YakitMenuItemProps, YakitMenuItemType } from '../yakitUI/YakitMenu/YakitMenu'
import type { UserInfoProps } from '@/store'
import { UserPlatformType } from '@/pages/globalVariable'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import yakitImg from '@/assets/yakit.jpg'
import { useMemoizedFn } from 'ahooks'
import type { API } from '@/services/swagger/resposeType'
import { CeUserTokenQuota } from './CeUserTokenQuota'
import { DocumentDuplicateOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { setClipboardText } from '@/utils/clipboard'
import { YakitButton } from '../yakitUI/YakitButton/YakitButton'
import { maskApiKey } from './ceApiKey'

export interface CeUserItemProps extends YakitMenuItemProps {
  icon?: React.ReactNode
}

export type UserMenuItemType = YakitMenuItemType & { icon?: React.ReactNode }

const isDivider = (item: UserMenuItemType): item is YakitMenuItemDividerProps => {
  return 'type' in item && item.type === 'divider'
}

export interface CeUserMenuContentProps {
  menu: UserMenuItemType[]
  onItemClick?: (key: string) => void
}

export const CeUserMenuContent: React.FC<CeUserMenuContentProps> = (props) => {
  const { menu, onItemClick } = props
  const { t } = useI18nNamespaces(['layout'])

  const renderMenuItem = (item: CeUserItemProps) => {
    const itemTypeClass = item.type ? styles[`ce-user-menu-item-${item.type}`] : undefined
    const label = typeof item.label === 'string' ? t(item.label) : item.label

    if (item.key === 'user-info') {
      return <div key={item.key}>{label}</div>
    }

    return (
      <div
        key={item.key}
        className={classNames(styles['ce-user-menu-item'], itemTypeClass)}
        onClick={() => onItemClick?.(item.key)}
      >
        {item.icon && <span className={styles['ce-user-menu-item-icon']}>{item.icon}</span>}
        <span className={styles['ce-user-menu-item-label']}>{label}</span>
      </div>
    )
  }

  return (
    <div className={styles['ce-user-menu-content']}>
      {menu.map((item, index) => {
        if (isDivider(item)) {
          return <div key={`divider-${index}`} className={styles['ce-user-menu-divider']} />
        }
        return renderMenuItem(item)
      })}
    </div>
  )
}

interface CeUserInfoProps {
  userInfo: UserInfoProps
  onOpenStatistics?: () => void
  onOpenRecharge?: () => void
  apiKeysInfo?: API.ApiUserUsageResponse
  apiKeys?: API.ApiKeyDetail
}

export const CeUserInfo: React.FC<CeUserInfoProps> = (props) => {
  const { userInfo, onOpenStatistics, onOpenRecharge, apiKeysInfo, apiKeys } = props
  const { t } = useI18nNamespaces(['layout'])

  const platformType = UserPlatformType[userInfo.platform || '']

  const userName = useMemo(() => {
    if (platformType) {
      const nameKey = platformType.name as keyof UserInfoProps
      return (userInfo[nameKey] as string) || ''
    }
    return ''
  }, [userInfo, platformType])

  const avatarSrc = useMemo(() => {
    if (platformType) {
      const imgKey = platformType.img as keyof UserInfoProps
      return (userInfo[imgKey] as string) || yakitImg
    }
    return yakitImg
  }, [userInfo, platformType])

  const firstApiKey = apiKeys?.apiKey?.[0] || ''

  const handleOpenStatistics = useMemoizedFn((e: React.MouseEvent) => {
    if (!apiKeysInfo) return
    e.stopPropagation()
    onOpenStatistics?.()
  })

  const handleCopyApiKey = useMemoizedFn((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!firstApiKey) return
    setClipboardText(firstApiKey)
  })

  return (
    <div className={styles['ce-user-info']}>
      <div className={styles['ce-user-info-avatar-wrapper']}>
        <Avatar src={avatarSrc} size={32} />
        <div className={styles['ce-user-info-name-wrapper']}>
          <div className={classNames(styles['ce-user-info-name'], 'yakit-single-line-ellipsis')}>{userName}</div>
          {!!firstApiKey && (
            <div className={styles['ce-user-info-apikey-row']}>
              <span className={classNames(styles['ce-user-info-apikey'], 'yakit-single-line-ellipsis')}>
                {maskApiKey(firstApiKey)}
              </span>
              <YakitButton
                type="text2"
                size="small"
                className={styles['ce-user-info-apikey-copy']}
                icon={<DocumentDuplicateOutlined color="currentColor" />}
                onClick={handleCopyApiKey}
              />
            </div>
          )}
        </div>
      </div>

      {apiKeys && (
        <CeUserTokenQuota apiKeys={apiKeys} onClick={handleOpenStatistics} onRecharge={() => onOpenRecharge?.()} />
      )}
    </div>
  )
}
