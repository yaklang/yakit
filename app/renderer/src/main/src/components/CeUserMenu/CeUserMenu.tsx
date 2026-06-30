import React, { useMemo } from 'react'
import classNames from 'classnames'
import { Avatar, Progress } from 'antd'
import styles from './CeUserMenu.module.scss'
import { YakitMenuItemDividerProps } from '../yakitUI/YakitMenu/YakitMenu'
import { UserInfoProps } from '@/store'
import { UserPlatformType } from '@/pages/globalVariable'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import yakitImg from '@/assets/yakit.jpg'

/** 暂无接口数据时的占位 */
const MOCK_USER_EMAIL = 'youyouya@gmail.com'
const MOCK_USER_NAME = '又又呀'
const MOCK_TOKEN_USED = 20
const MOCK_TOKEN_TOTAL = 200

export interface CeUserItemProps {
  key: string
  label: string | React.ReactNode
  icon?: React.ReactNode
  /** 单项菜单类型(只在叶子节点时有效) */
  type?: 'success' | 'danger' | 'info' | 'text'
}

export type CeUserItemType = CeUserItemProps | YakitMenuItemDividerProps

const isDivider = (item: CeUserItemType): item is YakitMenuItemDividerProps => {
  return 'type' in item && item.type === 'divider'
}

export interface CeUserMenuContentProps {
  menu: CeUserItemType[]
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
}

export const CeUserInfo: React.FC<CeUserInfoProps> = (props) => {
  const { userInfo } = props
  const { t } = useI18nNamespaces(['layout'])

  const platformType = UserPlatformType[userInfo.platform || '']

  const userName = useMemo(() => {
    if (platformType) {
      const nameKey = platformType.name as keyof UserInfoProps
      return (userInfo[nameKey] as string) || MOCK_USER_NAME
    }
    return MOCK_USER_NAME
  }, [userInfo, platformType])

  const avatarSrc = useMemo(() => {
    if (platformType) {
      const imgKey = platformType.img as keyof UserInfoProps
      return (userInfo[imgKey] as string) || yakitImg
    }
    return yakitImg
  }, [userInfo, platformType])

  const tokenPercent = Math.round((MOCK_TOKEN_USED / MOCK_TOKEN_TOTAL) * 100)

  return (
    <div className={styles['ce-user-info']}>
      <div className={styles['ce-user-info-avatar-wrapper']}>
        <Avatar src={avatarSrc} size={40} />
        <div className={styles['ce-user-info-name-wrapper']}>
          <div className={styles['ce-user-info-name']}>{userName}</div>
          <div className={styles['ce-user-info-email']}>{MOCK_USER_EMAIL}</div>
        </div>
      </div>

      <div className={styles['ce-user-info-token']}>
        <Progress
          strokeColor="var(--Colors-Use-Main-Primary)"
          trailColor="var(--Colors-Use-Neutral-Bg-Hover)"
          percent={tokenPercent}
          showInfo={false}
          size="small"
        />
        <div className={styles['ce-user-info-token-row']}>
          <span className={styles['ce-user-info-token-label']}>
            {t('CeUserMenu.tokenConsumption')}
            <span className={styles['ce-user-info-token-percent']}>({tokenPercent}%)</span>
          </span>
          <span className={styles['ce-user-info-token-value']}>
            {MOCK_TOKEN_USED}/{MOCK_TOKEN_TOTAL}M
          </span>
        </div>
      </div>
    </div>
  )
}
