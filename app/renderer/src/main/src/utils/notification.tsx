import {notification} from "antd"
import {ArgsProps} from "antd/lib/notification"
import React, {ReactNode} from "react"
import {CheckCircleOutlineIcon, CloseCircleIcon, ExclamationOutlineIcon} from "@/assets/newIcon"

export const warn = (msg: React.ReactNode) => {
    yakitNotify("warning", msg)
    // notification["warning"]({message: msg, placement: "bottomRight"})
}

export const info = (msg: React.ReactNode) => {
    yakitNotify("info", msg)
    // notification["info"]({message: msg, placement: "bottomRight"})
}

export const success = (msg: React.ReactNode) => {
    // yakitNotify("info", msg)
    yakitNotify("success", msg)
    // notification["success"]({message: msg, placement: "bottomRight"})
}
export const successControlled = (msg: React.ReactNode, time?: number) => {
    notification["success"]({message: msg, placement: "bottomRight", duration: time === undefined ? 4.5 : time})
}

export const failed = (msg: React.ReactNode) => {
    yakitFailed(msg)
}

// ==========================新版 yakit notification ==========================
export const yakitFailed = (props: ArgsProps | string | React.ReactNode) => {
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
    notification["error"]({
        ...newProps,
        placement: "bottomRight",
        className: "yakit-notification-failed"
    })
}

/**
 * @param type
 * @returns {React.ReactNode} 图标
 */
const getIcon = (type) => {
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

export const yakitNotify = (
    notifyType: "error" | "success" | "warning" | "info",
    props: ArgsProps | string | React.ReactNode
) => {
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
