import {CheckCircleOutlineIcon, CloseCircleIcon, ExclamationOutlineIcon} from "@/assets/newIcon"
import notification, {ArgsProps} from "antd/lib/notification"

type NotifyType = "error" | "success" | "warning" | "info"
/**
 * @param {string} type - 类型名称
 * @returns {React.ReactNode} 图标
 */
const getIcon = (type: NotifyType) => {
    switch (type) {
        case "error":
            return <CloseCircleIcon className='yakit-notify-icon yakit-notify-error-icon' />
        case "success":
            return <CheckCircleOutlineIcon className='yakit-notify-icon yakit-notify-success-icon' />
        case "warning":
            return <ExclamationOutlineIcon className='yakit-notify-icon yakit-notify-warning-icon' />
        default:
            return <></>
    }
}

export const yakitNotify = (notifyType: NotifyType, props: ArgsProps | string | React.ReactNode) => {
    let newProps: ArgsProps = {
        message: ""
    }
    if (typeof props === "string") {
        newProps.message = props
    } else if (typeof props === "object") {
        newProps = props as ArgsProps
    } else {
        newProps.message = props
    }

    notification[notifyType]({
        ...newProps,
        icon: getIcon(notifyType),
        placement: "bottomRight",
        className: "yakit-notification-" + notifyType
    })
}
