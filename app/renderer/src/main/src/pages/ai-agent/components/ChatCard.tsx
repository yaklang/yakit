import classNames from 'classnames'
import styles from './ChatCard.module.scss'
import { type FC, type ReactNode } from 'react'

export interface ChatCardProps {
  titleIcon?: ReactNode
  titleText?: ReactNode
  titleExtra?: ReactNode
  titleMore?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  style?: React.CSSProperties
  childClassName?: string
  childStyle?: React.CSSProperties
  onClickTitle?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}
const ChatCard: FC<ChatCardProps> = ({
  titleIcon,
  titleText,
  titleExtra,
  titleMore,
  children,
  footer,
  className,
  style,
  childClassName,
  childStyle,
  onClickTitle,
}) => {
  return (
    <div className={classNames(styles['chat-card'], className)} style={style}>
      <div className={styles['chat-card-title']} onClick={onClickTitle}>
        <div className={styles['chat-card-title-left']}>
          {titleIcon && <div className={styles['chat-card-title-icon']}>{titleIcon}</div>}
          <div className={styles['chat-card-title-text']}>{titleText}</div>
          <div className={styles['chat-card-title-extra']}>{titleExtra}</div>
        </div>
        <div className={styles['chat-card-title-more']}>{titleMore}</div>
      </div>
      {children && (
        <div className={classNames(styles['chat-card-content'], childClassName)} style={childStyle}>
          {children}
        </div>
      )}
      {footer && <div className={styles['chat-card-footer']}>{footer}</div>}
    </div>
  )
}
export default ChatCard
