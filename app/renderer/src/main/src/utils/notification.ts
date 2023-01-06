import {notification} from "antd"
import React from "react"

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
    notification["error"]({message: msg, placement: "bottomRight"})
}
