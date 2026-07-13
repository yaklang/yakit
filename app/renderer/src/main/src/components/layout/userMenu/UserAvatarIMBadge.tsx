import React from 'react'
import { Tooltip } from 'antd'
import { SolidMobileIcon } from '@/assets/icon/solid'
import classNames from 'classnames'
import styles from '../funcDomain.module.scss'
import type { IMControlBadgeView } from '@/pages/robotControl/status'

export type UserAvatarIMBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  badge: IMControlBadgeView
  onBadgeClick: () => void
  children: React.ReactNode
}

export const UserAvatarIMBadge = React.forwardRef<HTMLSpanElement, UserAvatarIMBadgeProps>((props, ref) => {
  const { badge, onBadgeClick, children, className, ...restProps } = props
  const tooltip = badge.detail ? `${badge.label}\n${badge.detail}` : badge.label
  return (
    <span {...restProps} ref={ref} className={classNames(styles['user-avatar-im-wrapper'], className)}>
      {children}
      {badge.visible && (
        <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
          <span
            className={classNames(styles['im-control-badge'], styles[`im-control-badge-${badge.color}`])}
            role="button"
            tabIndex={0}
            aria-label={badge.label}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              onBadgeClick()
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              onBadgeClick()
            }}
          >
            <SolidMobileIcon />
          </span>
        </Tooltip>
      )}
    </span>
  )
})
UserAvatarIMBadge.displayName = 'UserAvatarIMBadge'
