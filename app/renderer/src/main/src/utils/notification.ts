import {notification} from "antd"
import {ArgsProps} from "antd/lib/notification"
import React from "react"
import {CloseCircleIcon} from "@/assets/newIcon"

export const warn = (msg: React.ReactNode) => {
    notification["warning"]({message: msg, placement: "bottomRight"})
}

export const info = (msg: React.ReactNode) => {
    notification["info"]({message: msg, placement: "bottomRight"})
}

export const success = (msg: React.ReactNode) => {
    notification["success"]({message: msg, placement: "bottomRight"})
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

export const yakitNotify = (notifyType: "error" | "success" | "warning" | "info", props: ArgsProps | string | React.ReactNode) => {
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
        placement: "bottomRight",
        className: "yakit-notification-" + notifyType
    })
}