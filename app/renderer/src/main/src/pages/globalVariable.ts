import {Route} from "antd/lib/breadcrumb/Breadcrumb"

export interface coordinateProps {
    screenX: number
    screenY: number
    clientX: number
    clientY: number
    pageX: number
    pageY: number
}
export const coordinate: coordinateProps = {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0
}

interface MenuBodyHeightProps{
    firstTabMenuBodyHeight:number
}

export const menuBodyHeight: MenuBodyHeightProps = {
    firstTabMenuBodyHeight:0
}

interface UserPlatformTypeProps {
    github: {name: string; img: string}
    wechat: {name: string; img: string}
    qq: {name: string; img: string}
    company: {name: string; img: string}
}
export const UserPlatformType: UserPlatformTypeProps = {
    github: {name: "githubName", img: "githubHeadImg"},
    wechat: {name: "wechatName", img: "wechatHeadImg"},
    qq: {name: "qqName", img: "qqHeadImg"},
    company: {name: "companyName", img: "companyHeadImg"}
}

interface info {
    [key: string]: {status: boolean; info: string}
}
export let SimpleCloseInfo: info = {}
export const setSimpleInfo = (key: string, status: boolean, info: string) => {
    SimpleCloseInfo[key] = {
        status,
        info
    }
}

export const delSimpleInfo = (key: string) => {
    if (SimpleCloseInfo[key]) {
        delete SimpleCloseInfo[key]
    }
}
