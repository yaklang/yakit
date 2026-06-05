import React, { ReactNode, useEffect } from 'react'
import { notification, NotificationArgsProps } from 'antd'
import { CheckCircleOutlineIcon, CloseCircleIcon, ExclamationOutlineIcon } from '@/assets/newIcon'
import { CopyComponents } from '@/components/yakitUI/YakitTag/YakitTag'
import { NotificationInstance } from 'antd/es/notification/interface'

type NotifyArgument = NotificationArgsProps | string | React.ReactNode
type NotifyType = 'error' | 'success' | 'warning' | 'info'

// ========================== 全局单例 ==========================
let globalNotificationApi: NotificationInstance | null = null
export const setGlobalNotificationApi = (api: any) => {
  globalNotificationApi = api
}

/**
 * 通知提供者：内部使用 notification.useNotification()
 * 必须放在组件树顶层（如根组件内部）
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification({
    stack: {
      threshold: 5,
    },
    bottom: 8,
  })

  // 注册 api 到全局
  useEffect(() => {
    setGlobalNotificationApi(api)
    return () => {
      setGlobalNotificationApi(null)
    }
  }, [api])

  return (
    <>
      {contextHolder}
      {children}
    </>
  )
}

const NOTIFY_ICON_MAP: Record<NotifyType, ReactNode> = {
  error: <CloseCircleIcon className="yakit-notify-icon yakit-notify-error-icon" />,
  success: <CheckCircleOutlineIcon className="yakit-notify-icon yakit-notify-success-icon" />,
  warning: <ExclamationOutlineIcon className="yakit-notify-icon yakit-notify-warning-icon" />,
  info: <></>,
}
const getIcon = (type: NotifyType) => NOTIFY_ICON_MAP[type]

const CopyButton = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', justifyContent: 'end' }}>
    <CopyComponents copyText={text} />
  </div>
)

function normalizeProps(props: NotifyArgument, isShowCopy?: boolean): NotificationArgsProps {
  // 情况1：字符串 -> 构造 message 为带复制按钮的 div
  if (typeof props === 'string') {
    const shouldTruncate = isShowCopy && props.length > 500
    const displayStr = shouldTruncate ? `${props.slice(0, 500)}...` : props
    return {
      message: (
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {displayStr}
          {shouldTruncate && <CopyButton text={props} />}
        </div>
      ),
    }
  }
  // 情况2：已经是完整的 NotificationArgsProps 对象
  if (typeof props === 'object' && props !== null && !React.isValidElement(props)) {
    return props as NotificationArgsProps
  }
  // 情况3：React 元素、number、其他原始类型 -> 作为 message
  return { message: props as ReactNode }
}

// ========================== 核心通知方法 ==========================
export const yakitNotify = (notifyType: NotifyType, props: NotifyArgument, isShowCopy?: boolean) => {
  const baseProps = normalizeProps(props, isShowCopy)
  const config: NotificationArgsProps = {
    ...baseProps,
    icon: getIcon(notifyType),
    className: `yakit-notification-${notifyType}`,
    placement: 'bottomRight',
  }

  const api = globalNotificationApi
  if (api && typeof api[notifyType] === 'function') {
    api[notifyType](config)
  } else {
    notification[notifyType](config)
  }
}

type NotifyMethod = (props: NotifyArgument, isShowCopy?: boolean) => void
const createNotifyMethod = (type: NotifyType): NotifyMethod => {
  return (props, isShowCopy) => yakitNotify(type, props, isShowCopy)
}

// ========================== 导出方法 ==========================
export const warn = createNotifyMethod('warning')
export const success = createNotifyMethod('success')
export const failed = createNotifyMethod('error')
export const info = createNotifyMethod('info')

export const yakitWarn = warn
export const yakitSuccess = success
export const yakitFailed = failed
export const yakitInfo = info
