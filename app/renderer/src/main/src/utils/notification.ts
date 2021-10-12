import {notification} from "antd"
import React from "react";

export const warn = (msg: React.ReactNode) => {
    notification["warning"]({message: msg, placement: "bottomRight"})
}


export const info = (msg: React.ReactNode) => {
    notification["info"]({message: msg, placement: "bottomRight"})
}


export const success = (msg: React.ReactNode) => {
    notification["success"]({message: msg, placement: "bottomRight"})
}


export const failed = (msg: React.ReactNode) => {
    notification["error"]({message: msg, placement: "bottomRight"})
}