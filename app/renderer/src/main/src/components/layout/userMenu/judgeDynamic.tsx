import React from 'react'
import { Avatar } from 'antd'
import classNames from 'classnames'
import styles from '../funcDomain.module.scss'
import { TFunction } from '@/i18n/useI18nNamespaces'

export const judgeDynamic = (userInfo, avatarColor: string, active: boolean, dynamicConnect: boolean, t: TFunction) => {
  const { companyHeadImg, companyName } = userInfo
  // 点击且已被远程控制
  const activeConnect: boolean = active && dynamicConnect
  return (
    <div
      className={classNames(styles['judge-avatar'], {
        [styles['judge-avatar-active']]: activeConnect,
        [styles['judge-avatar-connect']]: dynamicConnect,
      })}
    >
      <div>
        {companyHeadImg && !!companyHeadImg.length ? (
          <Avatar size={20} style={{ cursor: 'pointer' }} src={companyHeadImg} />
        ) : (
          <Avatar
            size={20}
            style={activeConnect ? {} : { backgroundColor: avatarColor }}
            className={classNames(styles['judge-avatar-avatar'], {
              [styles['judge-avatar-active-avatar']]: activeConnect,
            })}
          >
            {companyName && companyName.slice(0, 1)}
          </Avatar>
        )}
      </div>
      {dynamicConnect && (
        <div className={classNames(styles['judge-avatar-text'], { [styles['judge-avatar-active-text']]: active })}>
          {t('FuncDomain.remoteInProgress')}
        </div>
      )}
    </div>
  )
}
