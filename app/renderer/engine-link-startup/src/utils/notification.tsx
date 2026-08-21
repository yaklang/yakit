import { CheckCircleOutlineIcon, CloseCircleIcon, ExclamationOutlineIcon } from '@/assets/newIcon'
import { App, Modal as staticModal, notification as staticNotification } from 'antd'
import type { ArgsProps, NotificationInstance } from 'antd/es/notification/interface'
import type { HookAPI } from 'antd/es/modal/useModal'
import type React from 'react'

const defaultNotificationConfig = {
  placement: 'bottomRight' as const,
  bottom: 8,
}

let notificationApi: NotificationInstance | null = null
let modalApi: HookAPI | null = null

const getNotificationApi = (): NotificationInstance => notificationApi ?? staticNotification

export type YakitModalApi = HookAPI & { destroyAll: () => void }

export const getModalApi = (): YakitModalApi => {
  const destroyAll = () => {
    const api = modalApi as unknown as YakitModalApi | undefined
    api?.destroyAll?.()
    staticModal.destroyAll()
  }
  if (modalApi) {
    return { ...modalApi, destroyAll } as YakitModalApi
  }
  return { ...(staticModal as unknown as YakitModalApi), destroyAll }
}

const NotificationBinder: React.FC = () => {
  const { notification } = App.useApp()
  notificationApi = notification
  return null
}

const ModalBinder: React.FC = () => {
  const { modal } = App.useApp()
  modalApi = modal
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
      <ModalBinder />
      {children}
    </App>
  )
}
