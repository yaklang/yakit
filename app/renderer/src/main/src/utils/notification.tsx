import { App, type NotificationArgsProps, message as staticMessage, notification as staticNotification } from 'antd'
import type { NotificationInstance } from 'antd/es/notification/interface'
import type { MessageInstance } from 'antd/es/message/interface'
import type React from 'react'
import { CheckCircleOutlineIcon, CloseCircleIcon, ExclamationOutlineIcon } from '@/assets/newIcon'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'

const defaultNotificationConfig = {
  placement: 'bottomLeft' as const,
  bottom: 8,
}

let notificationApi: NotificationInstance | null = null
let messageApi: MessageInstance | null = null

// 静态实例不会消费 <App notification={config}>，需手动 config 确保回退路径的 bottom 与 placement 一致
staticNotification.config({ placement: 'bottomLeft', bottom: 8 })

const getNotificationApi = (): NotificationInstance => notificationApi ?? staticNotification

/** antd 5 静态 message 无法消费 ConfigProvider 主题，优先用 App 注入的实例，回退到静态方法 */
export const getMessageApi = (): MessageInstance => messageApi ?? staticMessage

const NotificationBinder: React.FC = () => {
  const { notification } = App.useApp()
  notificationApi = notification
  return null
}

const MessageBinder: React.FC = () => {
  const { message } = App.useApp()
  messageApi = message
  return null
}

/** antd 5 静态 notification/message 无法消费 ConfigProvider 主题，需通过 App 注入实例 */
export const NotificationProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <App className="yakit-antd-app" notification={defaultNotificationConfig} message={{ maxCount: 3 }}>
      <NotificationBinder />
      <MessageBinder />
      {children}
    </App>
  )
}

export const warn = (msg: React.ReactNode) => {
  yakitNotify('warning', msg)
}

export const info = (msg: React.ReactNode) => {
  yakitNotify('info', msg)
}

export const yakitInfo = (msg: React.ReactNode) => {
  yakitNotify('info', msg)
}

export const success = (msg: React.ReactNode) => {
  yakitNotify('success', msg)
}
export const successControlled = (msg: React.ReactNode, time?: number) => {
  getNotificationApi().success({
    message: msg,
    placement: 'bottomLeft',
    duration: time === undefined ? 4.5 : time,
  })
}

export const failed = (msg: React.ReactNode) => {
  yakitFailed(msg)
}

// ==========================新版 yakit notification ==========================
export const yakitFailed = (props: NotificationArgsProps | string | React.ReactNode, isShowCopy?: boolean) => {
  yakitNotify('error', props, isShowCopy)
}

/**
 * @param type
 * @returns {React.ReactNode} 图标
 */
const getIcon = (type: 'error' | 'success' | 'warning' | 'info') => {
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

export const yakitNotify = (
  notifyType: 'error' | 'success' | 'warning' | 'info',
  props: NotificationArgsProps | string | React.ReactNode,
  isShowCopy?: boolean,
) => {
  let newProps: NotificationArgsProps = {
    message: '',
  }

  const copyBtn = (copyStr: string) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <CopyComponents copyText={copyStr} />
    </div>
  )

  if (typeof props === 'string') {
    const isCopy = isShowCopy && props.length > 500
    const str = isCopy ? `${props.slice(0, 500)}...` : props
    newProps.message = (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {str}
        {isCopy && copyBtn(props)}
      </div>
    )
  } else if (typeof props === 'object') {
    newProps = props as NotificationArgsProps
  } else {
    newProps.message = props
  }
  getNotificationApi()[notifyType]({
    ...newProps,
    icon: getIcon(notifyType),
    placement: 'bottomLeft',
    className: `yakit-notification-${notifyType}`,
  })
}
