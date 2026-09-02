import { CheckCircleOutlineIcon } from '@yakit-libs/yakit-ui-icons/oldicon/CheckCircleOutlineIcon'
import { CloseCircleIcon } from '@yakit-libs/yakit-ui-icons/oldicon/CloseCircleIcon'
import { ExclamationOutlineIcon } from '@yakit-libs/yakit-ui-icons/oldicon/ExclamationOutlineIcon'
import { App, notification as staticNotification } from 'antd'
import type { ArgsProps, NotificationInstance } from 'antd/es/notification/interface'
import type React from 'react'

const defaultNotificationConfig = {
  placement: 'bottomRight' as const,
  bottom: 8,
  stack: false,
}

let notificationApi: NotificationInstance | null = null

// 静态实例不会消费 <App notification={config}>，需手动 config 确保回退路径的 bottom 与 placement 一致
staticNotification.config({ placement: 'bottomRight', bottom: 8 })

const getNotificationApi = (): NotificationInstance => notificationApi ?? staticNotification

const NotificationBinder: React.FC = () => {
  const { notification } = App.useApp()
  notificationApi = notification
  return null
}

type NotifyType = 'error' | 'success' | 'warning' | 'info'
/**
 * @param {string} type - 类型名称
 * @returns {React.ReactNode} 图标
 */
const getIcon = (type: NotifyType) => {
  switch (type) {
    case 'error':
      return <CloseCircleIcon className="yakit-notify-icon yakit-notify-error-icon" />
    case 'success':
      return <CheckCircleOutlineIcon className="yakit-notify-icon yakit-notify-success-icon" />
    case 'warning':
      return <ExclamationOutlineIcon className="yakit-notify-icon yakit-notify-warning-icon" />
    default:
      return <></>
  }
}

export const yakitNotify = (notifyType: NotifyType, props: ArgsProps | string | React.ReactNode) => {
  let newProps: ArgsProps = {
    message: '',
  }
  if (typeof props === 'string') {
    newProps.message = props
  } else if (typeof props === 'object') {
    newProps = props as ArgsProps
  } else {
    newProps.message = props
  }

  getNotificationApi()[notifyType]({
    ...newProps,
    icon: getIcon(notifyType),
    placement: 'bottomRight',
    className: 'yakit-notification-' + notifyType,
  })
}

/** antd 5 静态 notification 无法消费 ConfigProvider 主题，需通过 App 注入实例 */
export const NotificationProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <App className="yakit-antd-app" notification={defaultNotificationConfig} message={{ maxCount: 3 }}>
      <NotificationBinder />
      {children}
    </App>
  )
}
